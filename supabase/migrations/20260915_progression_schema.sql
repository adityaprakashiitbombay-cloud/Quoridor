-- ====================================================================
-- QUORIDOR PROGRESSION, STICKER LOOT & MATCH TRACKING SCHEMA
-- Migration: 20260915_progression_schema.sql
-- ====================================================================

-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. Player Profiles & Aggregated Stats
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  level int default 1,
  xp int default 0,
  elo_rating int default 1200,
  campaign_level int default 1,
  matches_played int default 0,
  matches_won int default 0,
  walls_placed int default 0,
  detours_created int default 0,
  total_turns int default 0,
  created_at timestamptz default now()
);

-- 2. Master Catalog of Stickers
create table if not exists stickers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,          -- e.g., 'graffiti-skull', 'neon-brick'
  name text not null,
  image_url text not null,
  rarity text check (rarity in ('common', 'rare', 'epic', 'legendary')),
  unlock_criteria jsonb default '{}'  -- e.g., {"type": "campaign", "level": 10}
);

-- 3. User Unlocked Sticker Inventory
create table if not exists user_stickers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  sticker_id uuid references stickers(id) on delete cascade,
  unlocked_at timestamptz default now(),
  is_pinned boolean default false,
  canvas_x float default 50.0,         -- Custom positioning on profile deck (%)
  canvas_y float default 50.0,
  canvas_rotation float default 0.0,   -- Degrees (-180 to 180)
  scale float default 1.0,             -- Scale factor (0.6 to 1.8)
  unique(user_id, sticker_id)
);

-- 4. Match History Ledger
create table if not exists match_history (
  id uuid primary key default gen_random_uuid(),
  game_mode text not null,            -- '1v1_ranked', 'casual_friend', 'campaign', 'ai'
  player1_id uuid references profiles(id),
  player2_id uuid references profiles(id), -- null if bot
  winner_id uuid references profiles(id),
  turns_count int not null,
  move_log jsonb not null,            -- algebraic move timeline
  created_at timestamptz default now()
);

-- 5. Multiplayer Authoritative Rooms & Move Sequencing
create table if not exists game_rooms (
  room_code text primary key,
  sequence_id bigint default 0,
  board_state jsonb not null,
  updated_at timestamptz default now()
);

-- Indices for rapid queries
create index if not exists idx_match_history_player1 on match_history(player1_id);
create index if not exists idx_match_history_player2 on match_history(player2_id);
create index if not exists idx_match_history_created_at on match_history(created_at desc);
create index if not exists idx_user_stickers_user on user_stickers(user_id);
create index if not exists idx_game_rooms_updated on game_rooms(updated_at desc);

-- ====================================================================
-- MULTIPLAYER AUTHORITATIVE TURN RPC
-- ====================================================================
create or replace function submit_turn(
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
  from game_rooms where room_code = p_room_code for update;

  if not found then
    insert into game_rooms (room_code, sequence_id, board_state)
    values (p_room_code, 1, p_payload)
    returning sequence_id into v_current_seq;
    return jsonb_build_object('success', true, 'sequence_id', v_current_seq);
  end if;

  if p_client_sequence != v_current_seq then
    return jsonb_build_object('success', false, 'error', 'Out of order sequence', 'server_sequence', v_current_seq);
  end if;

  v_current_seq := v_current_seq + 1;
  update game_rooms
  set sequence_id = v_current_seq, board_state = p_payload, updated_at = now()
  where room_code = p_room_code;

  return jsonb_build_object('success', true, 'sequence_id', v_current_seq);
end;
$$ language plpgsql security definer;

-- ====================================================================
-- ATOMIC MATCH SETTLEMENT (PostgreSQL RPC)
-- Guaranteed atomic match settlement, XP calculus, level up & loot rolling
-- ====================================================================
create or replace function settle_match(
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
  -- 1. Determine XP Rewards (120 for win, 40 for loss, +10 per unused wall)
  v_base_xp := case when p_winner_id is not null then 120 else 40 end;
  v_bonus_wall_xp := coalesce(p_unused_walls, 0) * 10;
  v_total_xp_gain := v_base_xp + v_bonus_wall_xp;

  -- 2. Record Match Record
  update match_history
  set winner_id = p_winner_id,
      turns_count = p_turns,
      move_log = p_move_log
  where id = p_match_id;

  if not found then
    insert into match_history (id, game_mode, winner_id, turns_count, move_log)
    values (p_match_id, '1v1_ranked', p_winner_id, p_turns, p_move_log);
  end if;

  -- 3. Update Winner Profile Stats & XP (if winner exists)
  if p_winner_id is not null then
    select xp, level into v_curr_xp, v_curr_level
    from profiles
    where id = p_winner_id
    for update;

    if not found then
      -- Profile not yet created, seed initial record
      insert into profiles (id, username, level, xp, matches_played, matches_won)
      values (p_winner_id, 'Player', 1, v_total_xp_gain, 1, 1)
      returning xp, level into v_new_xp, v_new_level;
    else
      v_new_xp := v_curr_xp + v_total_xp_gain;
      v_new_level := v_curr_level;

      -- Check Level Up: XP_required = 100 * (Level)^1.4
      v_xp_required := floor(100.0 * power(v_new_level::numeric, 1.4))::bigint;
      while v_new_xp >= v_xp_required loop
        v_new_level := v_new_level + 1;
        v_leveled_up := true;
        v_xp_required := floor(100.0 * power(v_new_level::numeric, 1.4))::bigint;
      end loop;

      update profiles
      set matches_played = matches_played + 1,
          matches_won = matches_won + 1,
          xp = v_new_xp,
          level = v_new_level
      where id = p_winner_id;
    end if;

    -- 4. Roll for Random Sticker with Weighted Rarity Odds
    -- Common (65%), Rare (25%), Epic (8%), Legendary (2%)
    v_roll := random();
    if v_roll < 0.02 then
      v_target_rarity := 'legendary';
    elsif v_roll < 0.10 then
      v_target_rarity := 'epic';
    elsif v_roll < 0.35 then
      v_target_rarity := 'rare';
    else
      v_target_rarity := 'common';
    end if;

    -- Select an unowned sticker matching target rarity, or any unowned sticker fallback
    select id, slug, name, rarity, image_url into v_dropped_sticker
    from stickers
    where id not in (select sticker_id from user_stickers where user_id = p_winner_id)
      and rarity = v_target_rarity
    order by random()
    limit 1;

    if v_dropped_sticker.id is null then
      -- Fallback to any unowned sticker
      select id, slug, name, rarity, image_url into v_dropped_sticker
      from stickers
      where id not in (select sticker_id from user_stickers where user_id = p_winner_id)
      order by random()
      limit 1;
    end if;

    if v_dropped_sticker.id is not null then
      v_dropped_sticker_id := v_dropped_sticker.id;
      insert into user_stickers (user_id, sticker_id, canvas_x, canvas_y, canvas_rotation)
      values (
        p_winner_id,
        v_dropped_sticker_id,
        round((30.0 + random() * 40.0)::numeric, 1),
        round((30.0 + random() * 40.0)::numeric, 1),
        round((-20.0 + random() * 40.0)::numeric, 1)
      );
    end if;
  end if;

  return jsonb_build_object(
    'xp_gained', v_total_xp_gain,
    'base_xp', v_base_xp,
    'bonus_wall_xp', v_bonus_wall_xp,
    'new_xp', v_new_xp,
    'new_level', v_new_level,
    'leveled_up', v_leveled_up,
    'unlocked_sticker', case when v_dropped_sticker.id is not null then jsonb_build_object(
      'id', v_dropped_sticker.id,
      'slug', v_dropped_sticker.slug,
      'name', v_dropped_sticker.name,
      'rarity', v_dropped_sticker.rarity,
      'image_url', v_dropped_sticker.image_url
    ) else null end
  );
end;
$$ language plpgsql security definer;

-- ====================================================================
-- SEED DATA: STICKER CATALOG (Streetwear, holographic, and vinyl)
-- ====================================================================
insert into stickers (slug, name, image_url, rarity, unlock_criteria) values
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
-- ROW LEVEL SECURITY & PERMISSIONS
-- ====================================================================
alter table profiles enable row level security;
alter table stickers enable row level security;
alter table user_stickers enable row level security;
alter table match_history enable row level security;
alter table game_rooms enable row level security;

-- Profiles: Public read & upsert
drop policy if exists "Public read profiles" on profiles;
create policy "Public read profiles" on profiles for select using (true);
drop policy if exists "Public modify profiles" on profiles;
create policy "Public modify profiles" on profiles for all using (true) with check (true);

-- Stickers: Public read
drop policy if exists "Public read stickers" on stickers;
create policy "Public read stickers" on stickers for select using (true);

-- User Stickers: Public read & upsert
drop policy if exists "Public read user_stickers" on user_stickers;
create policy "Public read user_stickers" on user_stickers for select using (true);
drop policy if exists "Public modify user_stickers" on user_stickers;
create policy "Public modify user_stickers" on user_stickers for all using (true) with check (true);

-- Match History: Public read & insert
drop policy if exists "Public read match_history" on match_history;
create policy "Public read match_history" on match_history for select using (true);
drop policy if exists "Public insert match_history" on match_history;
create policy "Public insert match_history" on match_history for insert with check (true);

-- Game Rooms: Public read & modify
drop policy if exists "Public read game_rooms" on game_rooms;
create policy "Public read game_rooms" on game_rooms for select using (true);
drop policy if exists "Public modify game_rooms" on game_rooms;
create policy "Public modify game_rooms" on game_rooms for all using (true) with check (true);

-- Enable Realtime replication for game_rooms if publication exists
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table game_rooms;
  end if;
exception when others then
  -- publication table might already be added
end;
$$;

-- Grant execution privileges on RPCs to anon & authenticated roles
grant execute on function settle_match to anon, authenticated;
grant execute on function submit_turn to anon, authenticated;

