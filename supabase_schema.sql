-- ====================================================================
-- QUORIDOR & DOTS AND BOXES: FULL SUPABASE DATABASE SCHEMA
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ====================================================================

-- 1. Enable required extensions
create extension if not exists "uuid-ossp";

-- ====================================================================
-- 2. USER PROFILES & AUTH SYNCHRONIZATION
-- Automatically creates a user profile whenever someone signs up
-- ====================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  elo_rating int default 1200,
  xp int default 0,
  level int default 1,
  campaign_level int default 1,
  matches_played int default 0,
  matches_won int default 0,
  walls_placed int default 0,
  detours_created int default 0,
  total_turns int default 0,
  created_at timestamptz default now()
);

-- Trigger Function: Auto-populate public.profiles when an auth user is created
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      'Player_' || substr(new.id::text, 1, 6)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Attach trigger to auth.users table
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ====================================================================
-- 3. MULTIPLAYER ROOMS & SERVER-AUTHORITATIVE SESSIONS
-- ====================================================================

create table if not exists public.game_rooms (
  room_code text primary key,
  sequence_id bigint default 0,
  board_state jsonb not null default '{}',
  updated_at timestamptz default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid references public.profiles(id) on delete cascade,
  guest_id uuid references public.profiles(id) on delete set null,
  status text check (status in ('waiting', 'playing', 'finished')) default 'waiting',
  created_at timestamptz default now()
);

create table if not exists public.match_messages (
  id uuid primary key default gen_random_uuid(),
  room_code text not null,
  sender_name text not null,
  content text not null,
  is_quick_chat boolean default false,
  created_at timestamptz default now()
);

-- ====================================================================
-- 4. STICKER CATALOG & USER INVENTORY
-- ====================================================================

create table if not exists public.stickers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  image_url text not null,
  rarity text check (rarity in ('common', 'rare', 'epic', 'legendary')),
  unlock_criteria jsonb default '{}'
);

create table if not exists public.user_stickers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  sticker_id uuid references public.stickers(id) on delete cascade,
  unlocked_at timestamptz default now(),
  is_pinned boolean default false,
  canvas_x float default 50.0,
  canvas_y float default 50.0,
  canvas_rotation float default 0.0,
  scale float default 1.0,
  unique(user_id, sticker_id)
);

-- ====================================================================
-- 5. MATCH HISTORY LEDGER
-- ====================================================================

create table if not exists public.match_history (
  id uuid primary key default gen_random_uuid(),
  game_mode text not null,
  player1_id uuid references public.profiles(id) on delete set null,
  player2_id uuid references public.profiles(id) on delete set null,
  winner_id uuid references public.profiles(id) on delete set null,
  turns_count int not null,
  move_log jsonb not null,
  created_at timestamptz default now()
);

-- Indices for high performance
create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_game_rooms_updated on public.game_rooms(updated_at desc);
create index if not exists idx_match_messages_room on public.match_messages(room_code, created_at desc);
create index if not exists idx_user_stickers_user on public.user_stickers(user_id);
create index if not exists idx_match_history_player1 on public.match_history(player1_id);

-- ====================================================================
-- 6. RPC: submit_turn (Server-Authoritative Turn Ordering)
-- ====================================================================

create or replace function public.submit_turn(
  p_room_code text,
  p_client_sequence bigint,
  p_player_index int,
  p_action text,
  p_payload jsonb
) returns jsonb as $$
declare
  v_state jsonb;
  v_current_seq bigint;
begin
  select sequence_id, board_state into v_current_seq, v_state
  from public.game_rooms where room_code = p_room_code for update;

  if not found then
    insert into public.game_rooms (room_code, sequence_id, board_state)
    values (p_room_code, 1, p_payload)
    returning sequence_id into v_current_seq;
    return jsonb_build_object('success', true, 'sequence_id', v_current_seq);
  end if;

  if p_client_sequence != v_current_seq then
    return jsonb_build_object(
      'success', false,
      'error', 'Out of order sequence',
      'server_sequence', v_current_seq
    );
  end if;

  v_current_seq := v_current_seq + 1;
  update public.game_rooms
  set sequence_id = v_current_seq,
      board_state = p_payload,
      updated_at = now()
  where room_code = p_room_code;

  return jsonb_build_object('success', true, 'sequence_id', v_current_seq);
end;
$$ language plpgsql security definer;

-- ====================================================================
-- 7. RPC: settle_match (Atomic XP, Level Up & Weighted Loot Roll)
-- ====================================================================

create or replace function public.settle_match(
  p_match_id uuid,
  p_winner_id uuid,
  p_turns int,
  p_move_log jsonb,
  p_unused_walls int default 0
) returns jsonb as $$
declare
  v_base_xp int;
  v_bonus_wall_xp int := 0;
  v_total_xp_gain int;
  v_curr_xp int;
  v_curr_level int;
  v_new_xp int;
  v_new_level int;
  v_xp_required bigint;
  v_leveled_up boolean := false;
  v_dropped_sticker_id uuid := null;
  v_dropped_sticker record;
  v_roll float;
  v_target_rarity text;
begin
  -- 1. Base XP: 120 win, 40 loss + 10 XP per unused wall
  v_base_xp := case when p_winner_id is not null then 120 else 40 end;
  v_bonus_wall_xp := coalesce(p_unused_walls, 0) * 10;
  v_total_xp_gain := v_base_xp + v_bonus_wall_xp;

  -- 2. Match History Log
  insert into public.match_history (id, game_mode, winner_id, turns_count, move_log)
  values (p_match_id, '1v1_ranked', p_winner_id, p_turns, p_move_log)
  on conflict (id) do update
  set winner_id = p_winner_id, turns_count = p_turns, move_log = p_move_log;

  -- 3. Update Winner Profile
  if p_winner_id is not null then
    select xp, level into v_curr_xp, v_curr_level from public.profiles where id = p_winner_id;
    if found then
      v_new_xp := v_curr_xp + v_total_xp_gain;
      v_new_level := v_curr_level;

      loop
        v_xp_required := floor(100 * power(v_new_level::numeric, 1.4));
        if v_new_xp >= v_xp_required then
          v_new_xp := v_new_xp - v_xp_required;
          v_new_level := v_new_level + 1;
          v_leveled_up := true;
        else
          exit;
        end if;
      end loop;

      update public.profiles
      set xp = v_new_xp,
          level = v_new_level,
          matches_played = matches_played + 1,
          matches_won = matches_won + 1,
          walls_placed = walls_placed + (10 - coalesce(p_unused_walls, 0)),
          total_turns = total_turns + p_turns
      where id = p_winner_id;

      -- 4. Weighted Loot Roll: 65% Common, 25% Rare, 8% Epic, 2% Legendary
      v_roll := random();
      if v_roll < 0.65 then
        v_target_rarity := 'common';
      elsif v_roll < 0.90 then
        v_target_rarity := 'rare';
      elsif v_roll < 0.98 then
        v_target_rarity := 'epic';
      else
        v_target_rarity := 'legendary';
      end if;

      select s.id, s.slug, s.name, s.image_url, s.rarity
      into v_dropped_sticker
      from public.stickers s
      where s.rarity = v_target_rarity
        and not exists (
          select 1 from public.user_stickers us
          where us.user_id = p_winner_id and us.sticker_id = s.id
        )
      order by random()
      limit 1;

      if v_dropped_sticker.id is not null then
        insert into public.user_stickers (user_id, sticker_id, canvas_x, canvas_y, canvas_rotation)
        values (p_winner_id, v_dropped_sticker.id, 30 + random() * 40, 30 + random() * 40, -20 + random() * 40);
        v_dropped_sticker_id := v_dropped_sticker.id;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'xpGained', v_total_xp_gain,
    'bonusWallXp', v_bonus_wall_xp,
    'newLevel', coalesce(v_new_level, 1),
    'newXp', coalesce(v_new_xp, 0),
    'leveledUp', v_leveled_up,
    'unlockedSticker', case when v_dropped_sticker.id is not null then
      jsonb_build_object(
        'id', v_dropped_sticker.id,
        'slug', v_dropped_sticker.slug,
        'name', v_dropped_sticker.name,
        'imageUrl', v_dropped_sticker.image_url,
        'rarity', v_dropped_sticker.rarity
      ) else null end
  );
end;
$$ language plpgsql security definer;

-- ====================================================================
-- 8. PRE-SEEDED STICKER CATALOG
-- ====================================================================

insert into public.stickers (slug, name, image_url, rarity, unlock_criteria) values
('geo-rhombus', 'Geo Diamond Pin', 'stickers/geo-rhombus.svg', 'common', '{"type": "random_drop"}'),
('smiley-classic', 'Acid Smiley Tag', 'stickers/smiley-classic.svg', 'common', '{"type": "random_drop"}'),
('pixel-heart', '8-Bit Heart Decal', 'stickers/pixel-heart.svg', 'common', '{"type": "random_drop"}'),
('checker-tag', 'Ska Checker Strip', 'stickers/checker-tag.svg', 'common', '{"type": "random_drop"}'),
('barcode-99', 'Cyber Barcode 99', 'stickers/barcode-99.svg', 'common', '{"type": "random_drop"}'),
('cross-bones', 'Street Crossbones', 'stickers/cross-bones.svg', 'common', '{"type": "random_drop"}'),

('graffiti-skull', 'Acid Neon Skull', '/stickers/graffiti-skull.jpg', 'rare', '{"type": "random_drop"}'),
('holo-tokyo', 'Neo-Tokyo Stamp', 'stickers/holo-tokyo.svg', 'rare', '{"type": "random_drop"}'),
('holographic-prism', 'Prism Foil Octagon', 'stickers/holographic-prism.svg', 'rare', '{"type": "random_drop"}'),
('retro-cassette', 'Synthwave Tape', 'stickers/retro-cassette.svg', 'rare', '{"type": "random_drop"}'),
('cyber-lotus', 'Cyberpunk Lotus', 'stickers/cyber-lotus.svg', 'rare', '{"type": "random_drop"}'),
('glitch-cat', 'Neko Error 404', 'stickers/glitch-cat.svg', 'rare', '{"type": "random_drop"}'),

('ninja-pawn', 'Ninja Pawn Block', '/stickers/ninja-pawn.jpg', 'epic', '{"type": "random_drop"}'),
('animated-skull', 'Graffiti Glint Skull', 'stickers/animated-skull.svg', 'epic', '{"type": "random_drop"}'),
('electric-dragon', 'Dragon Spark Emblem', 'stickers/electric-dragon.svg', 'epic', '{"type": "random_drop"}'),
('flame-thrower', 'Ignition Nitro Tag', 'stickers/flame-thrower.svg', 'epic', '{"type": "random_drop"}'),
('vapor-statue', 'Aesthetic Bust Glow', 'stickers/vapor-statue.svg', 'epic', '{"type": "random_drop"}'),

('crown-bot', 'Street Champ Bot', '/stickers/crown-bot.jpg', 'legendary', '{"type": "random_drop"}'),
('gold-quoridor-crown', 'Championship Gold Crown', 'stickers/gold-quoridor-crown.svg', 'legendary', '{"type": "random_drop"}'),
('alpha-oracle-eye', 'Omniscient Oracle Eye', 'stickers/alpha-oracle-eye.svg', 'legendary', '{"type": "random_drop"}'),
('diamond-shield', 'Invictus Platinum Shield', 'stickers/diamond-shield.svg', 'legendary', '{"type": "random_drop"}')
on conflict (slug) do nothing;

-- ====================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

alter table public.profiles enable row level security;
alter table public.game_rooms enable row level security;
alter table public.rooms enable row level security;
alter table public.match_messages enable row level security;
alter table public.stickers enable row level security;
alter table public.user_stickers enable row level security;
alter table public.match_history enable row level security;

-- Profiles: Anyone can view profiles, users can update their own
drop policy if exists "Public profiles are readable by all" on public.profiles;
create policy "Public profiles are readable by all" on public.profiles for select using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for all using (true) with check (true);

-- Game Rooms & Multiplayer
drop policy if exists "Game rooms readable by everyone" on public.game_rooms;
create policy "Game rooms readable by everyone" on public.game_rooms for select using (true);

drop policy if exists "Game rooms insertable by everyone" on public.game_rooms;
create policy "Game rooms insertable by everyone" on public.game_rooms for insert with check (true);

drop policy if exists "Game rooms updatable by everyone" on public.game_rooms;
create policy "Game rooms updatable by everyone" on public.game_rooms for update using (true);

-- Rooms
drop policy if exists "Rooms viewable by everyone" on public.rooms;
create policy "Rooms viewable by everyone" on public.rooms for select using (true);

drop policy if exists "Rooms insertable by everyone" on public.rooms;
create policy "Rooms insertable by everyone" on public.rooms for insert with check (true);

drop policy if exists "Rooms updatable by everyone" on public.rooms;
create policy "Rooms updatable by everyone" on public.rooms for update using (true);

-- Match Messages
drop policy if exists "Chat messages readable by everyone" on public.match_messages;
create policy "Chat messages readable by everyone" on public.match_messages for select using (true);

drop policy if exists "Chat messages insertable by everyone" on public.match_messages;
create policy "Chat messages insertable by everyone" on public.match_messages for insert with check (true);

-- Stickers & Cosmetics
drop policy if exists "Stickers viewable by everyone" on public.stickers;
create policy "Stickers viewable by everyone" on public.stickers for select using (true);

drop policy if exists "User stickers viewable by everyone" on public.user_stickers;
create policy "User stickers viewable by everyone" on public.user_stickers for select using (true);

drop policy if exists "User stickers updatable by owner" on public.user_stickers;
create policy "User stickers updatable by owner" on public.user_stickers for all using (true) with check (true);

-- Match History
drop policy if exists "Match history viewable by everyone" on public.match_history;
create policy "Match history viewable by everyone" on public.match_history for select using (true);

drop policy if exists "Match history insertable by everyone" on public.match_history;
create policy "Match history insertable by everyone" on public.match_history for insert with check (true);

-- ====================================================================
-- 10. REALTIME REPLICATION & PERMISSIONS
-- ====================================================================

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.game_rooms;
    alter publication supabase_realtime add table public.profiles;
    alter publication supabase_realtime add table public.match_messages;
  end if;
exception when others then
  null;
end;
$$;

grant execute on function public.submit_turn to anon, authenticated;
grant execute on function public.settle_match to anon, authenticated;
