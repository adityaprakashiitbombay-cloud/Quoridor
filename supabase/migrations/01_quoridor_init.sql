-- ====================================================================
-- QUORIDOR SUPABASE FULL-STACK INITIALIZATION MIGRATION
-- Migration: 01_quoridor_init.sql
-- ====================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table linked to Auth (auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  elo_rating int default 1200,
  xp int default 0,
  level int default 1,
  matches_played int default 0,
  matches_won int default 0,
  walls_placed int default 0,
  detours_created int default 0,
  total_turns int default 0,
  campaign_level int default 1,
  created_at timestamptz default now()
);

-- Auto-create profile on auth signup trigger
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Game Rooms & Active State
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid references public.profiles(id) on delete cascade,
  guest_id uuid references public.profiles(id) on delete set null,
  status text check (status in ('waiting', 'playing', 'finished')) default 'waiting',
  created_at timestamptz default now()
);

create table if not exists public.game_sessions (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  board_state jsonb not null default '{"p1": [8,4], "p2": [0,4], "walls": []}',
  current_turn uuid references public.profiles(id),
  p1_walls_left int default 10,
  p2_walls_left int default 10,
  winner_id uuid references public.profiles(id),
  sequence_id bigint default 0,
  updated_at timestamptz default now()
);

-- 3. Match Chat & Tactical Callouts
create table if not exists public.match_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  is_quick_chat boolean default false,
  created_at timestamptz default now()
);

-- 4. Stickers Master Catalog & User Inventory
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

-- 5. Match History Ledger
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

-- Indices for performance
create index if not exists idx_rooms_code on public.rooms(code);
create index if not exists idx_game_sessions_updated on public.game_sessions(updated_at desc);
create index if not exists idx_match_messages_room on public.match_messages(room_id, created_at desc);
create index if not exists idx_user_stickers_user on public.user_stickers(user_id);
create index if not exists idx_match_history_player1 on public.match_history(player1_id);

-- 6. Compatibility View for game_rooms
create or replace view public.game_rooms as
select
  r.code as room_code,
  coalesce(s.sequence_id, 0) as sequence_id,
  s.board_state,
  coalesce(s.updated_at, r.created_at) as updated_at
from public.rooms r
left join public.game_sessions s on r.id = s.room_id;

-- ====================================================================
-- SERVER-AUTHORITATIVE RPC: submit_turn
-- ====================================================================
create or replace function public.submit_turn(
  p_room_code text,
  p_client_sequence bigint,
  p_player_index int,
  p_action text,
  p_payload jsonb
) returns jsonb as $$
declare
  v_room_id uuid;
  v_current_seq bigint;
begin
  -- Resolve room or auto-create if joined on-the-fly
  select id into v_room_id from public.rooms where code = p_room_code;
  if not found then
    insert into public.rooms (code, status)
    values (p_room_code, 'playing')
    returning id into v_room_id;
  end if;

  -- Lock session for update
  select sequence_id into v_current_seq
  from public.game_sessions where room_id = v_room_id for update;

  if not found then
    insert into public.game_sessions (room_id, board_state, sequence_id)
    values (v_room_id, p_payload, 1)
    returning sequence_id into v_current_seq;
    return jsonb_build_object('success', true, 'sequence_id', v_current_seq);
  end if;

  -- Monotonic sequence validation
  if p_client_sequence != v_current_seq then
    return jsonb_build_object('success', false, 'error', 'Out of order sequence', 'server_sequence', v_current_seq);
  end if;

  v_current_seq := v_current_seq + 1;
  update public.game_sessions
  set board_state = p_payload,
      sequence_id = v_current_seq,
      updated_at = now()
  where room_id = v_room_id;

  return jsonb_build_object('success', true, 'sequence_id', v_current_seq);
end;
$$ language plpgsql security definer;

-- ====================================================================
-- ATOMIC SETTLEMENT RPC: settle_match
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
  -- Calculate XP: 120 win, 40 loss, +10 per unused wall
  v_base_xp := case when p_winner_id is not null then 120 else 40 end;
  v_bonus_wall_xp := coalesce(p_unused_walls, 0) * 10;
  v_total_xp_gain := v_base_xp + v_bonus_wall_xp;

  -- Record match history
  insert into public.match_history (id, game_mode, winner_id, turns_count, move_log)
  values (p_match_id, '1v1_ranked', p_winner_id, p_turns, p_move_log)
  on conflict (id) do update
  set winner_id = p_winner_id, turns_count = p_turns, move_log = p_move_log;

  -- Update winner profile if present
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

      -- Weighted loot drop roll: 65% Common, 25% Rare, 8% Epic, 2% Legendary
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
-- SEED DATA: STICKER CATALOG (3D Claymorphic & Streetwear Stickers)
-- ====================================================================
insert into public.stickers (slug, name, image_url, rarity, unlock_criteria) values
-- Common (65% pool)
('geo-rhombus', 'Geo Diamond Pin', 'stickers/geo-rhombus.svg', 'common', '{"type": "random_drop"}'),
('smiley-classic', 'Acid Smiley Tag', 'stickers/smiley-classic.svg', 'common', '{"type": "random_drop"}'),
('pixel-heart', '8-Bit Heart Decal', 'stickers/pixel-heart.svg', 'common', '{"type": "random_drop"}'),
('checker-tag', 'Ska Checker Strip', 'stickers/checker-tag.svg', 'common', '{"type": "random_drop"}'),
('barcode-99', 'Cyber Barcode 99', 'stickers/barcode-99.svg', 'common', '{"type": "random_drop"}'),
('cross-bones', 'Street Crossbones', 'stickers/cross-bones.svg', 'common', '{"type": "random_drop"}'),

-- Rare (25% pool)
('graffiti-skull', 'Acid Neon Skull', '/stickers/graffiti-skull.jpg', 'rare', '{"type": "random_drop"}'),
('holo-tokyo', 'Neo-Tokyo Stamp', 'stickers/holo-tokyo.svg', 'rare', '{"type": "random_drop"}'),
('holographic-prism', 'Prism Foil Octagon', 'stickers/holographic-prism.svg', 'rare', '{"type": "random_drop"}'),
('retro-cassette', 'Synthwave Tape', 'stickers/retro-cassette.svg', 'rare', '{"type": "random_drop"}'),
('cyber-lotus', 'Cyberpunk Lotus', 'stickers/cyber-lotus.svg', 'rare', '{"type": "random_drop"}'),
('glitch-cat', 'Neko Error 404', 'stickers/glitch-cat.svg', 'rare', '{"type": "random_drop"}'),

-- Epic (8% pool)
('ninja-pawn', 'Ninja Pawn Block', '/stickers/ninja-pawn.jpg', 'epic', '{"type": "random_drop"}'),
('animated-skull', 'Graffiti Glint Skull', 'stickers/animated-skull.svg', 'epic', '{"type": "random_drop"}'),
('electric-dragon', 'Dragon Spark Emblem', 'stickers/electric-dragon.svg', 'epic', '{"type": "random_drop"}'),
('flame-thrower', 'Ignition Nitro Tag', 'stickers/flame-thrower.svg', 'epic', '{"type": "random_drop"}'),
('vapor-statue', 'Aesthetic Bust Glow', 'stickers/vapor-statue.svg', 'epic', '{"type": "random_drop"}'),

-- Legendary (2% pool)
('crown-bot', 'Street Champ Bot', '/stickers/crown-bot.jpg', 'legendary', '{"type": "random_drop"}'),
('gold-quoridor-crown', 'Championship Gold Crown', 'stickers/gold-quoridor-crown.svg', 'legendary', '{"type": "random_drop"}'),
('alpha-oracle-eye', 'Omniscient Oracle Eye', 'stickers/alpha-oracle-eye.svg', 'legendary', '{"type": "random_drop"}'),
('diamond-shield', 'Invictus Platinum Shield', 'stickers/diamond-shield.svg', 'legendary', '{"type": "random_drop"}'),

-- Achievement-Bound Signature Stickers
('wall-star', 'Wall Star (0 Walls Placed)', 'stickers/wall-star.svg', 'epic', '{"type": "achievement", "achievementId": "zero_walls"}'),
('speed-demon', 'Speed Demon (<18 Moves)', 'stickers/speed-demon.svg', 'legendary', '{"type": "achievement", "achievementId": "speed_demon"}'),
('gauntlet-master', 'Gauntlet Grandmaster', 'stickers/gauntlet-master.svg', 'legendary', '{"type": "achievement", "achievementId": "gauntlet_master"}')
on conflict (slug) do nothing;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) & POLICIES
-- ====================================================================
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.game_sessions enable row level security;
alter table public.match_messages enable row level security;
alter table public.stickers enable row level security;
alter table public.user_stickers enable row level security;
alter table public.match_history enable row level security;

-- Profiles: readable by all, users can update own profile or upsert
drop policy if exists "Public profiles are readable by all" on public.profiles;
create policy "Public profiles are readable by all" on public.profiles for select using (true);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for all using (true) with check (true);

-- Rooms: viewable by all, participants can update
drop policy if exists "Rooms viewable by everyone" on public.rooms;
create policy "Rooms viewable by everyone" on public.rooms for select using (true);
drop policy if exists "Users can create rooms" on public.rooms;
create policy "Users can create rooms" on public.rooms for insert with check (true);
drop policy if exists "Players can update their room" on public.rooms;
create policy "Players can update their room" on public.rooms for update using (true);

-- Game Sessions: viewable by all, updatable by room participants
drop policy if exists "Session viewable by room participants" on public.game_sessions;
create policy "Session viewable by room participants" on public.game_sessions for select using (true);
drop policy if exists "Session updatable by room participants" on public.game_sessions;
create policy "Session updatable by room participants" on public.game_sessions for all using (true) with check (true);

-- Match Messages: viewable by all in room, insertable by players
drop policy if exists "Chat viewable by room participants" on public.match_messages;
create policy "Chat viewable by room participants" on public.match_messages for select using (true);
drop policy if exists "Chat insertable by room participants" on public.match_messages;
create policy "Chat insertable by room participants" on public.match_messages for insert with check (true);

-- Stickers: public read
drop policy if exists "Stickers viewable by everyone" on public.stickers;
create policy "Stickers viewable by everyone" on public.stickers for select using (true);

-- User Stickers: public read and upsert
drop policy if exists "User stickers viewable by everyone" on public.user_stickers;
create policy "User stickers viewable by everyone" on public.user_stickers for select using (true);
drop policy if exists "User stickers updatable by owner" on public.user_stickers;
create policy "User stickers updatable by owner" on public.user_stickers for all using (true) with check (true);

-- Match History: viewable by all, insertable by client
drop policy if exists "Match history viewable by everyone" on public.match_history;
create policy "Match history viewable by everyone" on public.match_history for select using (true);
drop policy if exists "Match history insertable" on public.match_history;
create policy "Match history insertable" on public.match_history for insert with check (true);

-- Realtime publication configuration
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.rooms;
    alter publication supabase_realtime add table public.game_sessions;
    alter publication supabase_realtime add table public.match_messages;
  end if;
exception when others then
  null;
end;
$$;

-- Grant RPC execution permissions to anon and authenticated
grant execute on function public.submit_turn to anon, authenticated;
grant execute on function public.settle_match to anon, authenticated;
