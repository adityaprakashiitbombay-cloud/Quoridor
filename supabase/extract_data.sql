-- ====================================================================
-- QUORIDOR SUPABASE DATA EXTRACTION & TELEMETRY SCRIPT
-- Run this in your Supabase Dashboard -> SQL Editor
-- ====================================================================

-- 1. Unified Master JSON Export (Profiles, Game Rooms, Match History, Chat Messages)
select json_build_object(
  'exported_at', now(),
  'tables', json_build_object(
    'profiles', (
      select coalesce(json_agg(p), '[]'::json)
      from (select * from public.profiles order by created_at desc) p
    ),
    'game_rooms', (
      select coalesce(json_agg(r), '[]'::json)
      from (select * from public.game_rooms order by updated_at desc) r
    ),
    'match_history', (
      select coalesce(json_agg(m), '[]'::json)
      from (select * from public.match_history order by created_at desc) m
    ),
    'match_messages', (
      select coalesce(json_agg(c), '[]'::json)
      from (select * from public.match_messages order by created_at desc) c
    )
  ),
  'summary_counts', json_build_object(
    'total_profiles', (select count(*) from public.profiles),
    'active_game_rooms', (select count(*) from public.game_rooms),
    'total_matches_logged', (select count(*) from public.match_history),
    'total_chat_messages', (select count(*) from public.match_messages)
  )
) as master_export_bundle;

-- ====================================================================
-- 2. Individual CSV-Friendly Queries (Use "Download CSV" in Supabase)
-- ====================================================================

-- Extract Match History Ledger with Player Usernames
select 
  m.id as match_id,
  m.game_mode,
  p1.username as player1_username,
  pw.username as winner_username,
  m.turns_count,
  jsonb_array_length(coalesce(m.move_log, '[]'::jsonb)) as total_logged_moves,
  m.created_at
from public.match_history m
left join public.profiles p1 on m.player1_id = p1.id
left join public.profiles pw on m.winner_id = pw.id
order by m.created_at desc;

-- Extract Leaderboard & Player Statistics
select 
  id as user_id,
  username,
  elo_rating,
  level,
  xp,
  matches_played,
  matches_won,
  case 
    when matches_played > 0 then round((matches_won::numeric / matches_played::numeric) * 100, 1)
    else 0
  end as win_rate_percentage,
  walls_placed,
  detours_created,
  total_turns,
  created_at
from public.profiles
order by elo_rating desc, level desc;

-- Extract Authoritative Live Game Rooms
select 
  room_code,
  sequence_id,
  board_state->>'currentTurn' as current_turn,
  board_state->>'winner' as winner,
  updated_at
from public.game_rooms
order by updated_at desc;
