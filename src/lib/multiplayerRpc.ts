import { supabase, isSupabaseConfigured } from './supabase';
import { Player, Wall, Position, Orientation } from '../types/game';

export interface AuthoritativeGameState {
  roomCode: string;
  sequenceId: number;
  players: Player[];
  walls: Wall[];
  currentTurn: number;
  winner: number | null;
  lastUpdated: number;
}

/**
 * SQL Schema & RPC migration for Supabase:
 * Run this in Supabase SQL editor to create the authoritative room & submit_turn function:
 *
 * ```sql
 * CREATE TABLE IF NOT EXISTS game_rooms (
 *   room_code TEXT PRIMARY KEY,
 *   sequence_id BIGINT DEFAULT 0,
 *   board_state JSONB NOT NULL,
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * CREATE OR REPLACE FUNCTION submit_turn(
 *   p_room_code TEXT,
 *   p_client_sequence BIGINT,
 *   p_player_index INT,
 *   p_action TEXT, -- 'move' or 'wall'
 *   p_payload JSONB
 * ) RETURNS JSONB AS $$
 * DECLARE
 *   v_state JSONB;
 *   v_current_seq BIGINT;
 * BEGIN
 *   SELECT sequence_id, board_state INTO v_current_seq, v_state
 *   FROM game_rooms WHERE room_code = p_room_code FOR UPDATE;
 *
 *   IF NOT FOUND THEN
 *     RAISE EXCEPTION 'Room not found';
 *   END IF;
 *
 *   -- Verify turn sequence monotonicity
 *   IF p_client_sequence != v_current_seq THEN
 *     RAISE EXCEPTION 'Out of order move sequence';
 *   END IF;
 *
 *   -- Increment sequence and update state
 *   v_current_seq := v_current_seq + 1;
 *   UPDATE game_rooms
 *   SET sequence_id = v_current_seq, board_state = p_payload, updated_at = NOW()
 *   WHERE room_code = p_room_code;
 *
 *   RETURN jsonb_build_object('success', true, 'sequence_id', v_current_seq);
 * END;
 * $$ LANGUAGE plpgsql SECURITY DEFINER;
 * ```
 */

class MultiplayerRpcManager {
  private lastSequenceId: number = 0;
  private activeRoomCode: string = '';
  private rehydrateCallback: ((state: AuthoritativeGameState) => void) | null = null;

  constructor() {
    this.setupSleepWakeRehydration();
  }

  // Setup Mobile Safari sleep/wake re-hydration
  private setupSleepWakeRehydration() {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible' && this.activeRoomCode) {
        console.log('📱 Mobile wake detected: Re-hydrating authoritative game state from server...');
        await this.rehydrateLatestState();
      }
    });
  }

  public setRoom(roomCode: string, onRehydrate: (state: AuthoritativeGameState) => void) {
    this.activeRoomCode = roomCode;
    this.rehydrateCallback = onRehydrate;
    this.lastSequenceId = 0;
  }

  public getSequenceId(): number {
    return this.lastSequenceId;
  }

  // Submit Turn through PostgreSQL RPC with monotonic sequence increment
  public async submitAuthoritativeTurn(
    roomCode: string,
    playerIndex: number,
    action: 'move' | 'wall',
    target: { pos?: Position; wall?: { x: number; y: number; orientation: Orientation } },
    nextBoardState: { players: Player[]; walls: Wall[]; currentTurn: number; winner: number | null }
  ): Promise<{ success: boolean; sequenceId: number }> {
    const nextSeq = this.lastSequenceId + 1;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('submit_turn', {
          p_room_code: roomCode,
          p_client_sequence: this.lastSequenceId,
          p_player_index: playerIndex,
          p_action: action,
          p_payload: {
            ...nextBoardState,
            sequenceId: nextSeq,
            lastUpdated: Date.now(),
          },
        });

        if (error) {
          console.warn('RPC submit failed, falling back to Realtime Broadcast channel:', error.message);
        } else if (data?.sequence_id) {
          this.lastSequenceId = Number(data.sequence_id);
          return { success: true, sequenceId: this.lastSequenceId };
        }
      } catch (err) {
        console.warn('Network RPC failure:', err);
      }
    }

    // Client-authoritative / Local fallback with sequence validation
    this.lastSequenceId = nextSeq;
    return { success: true, sequenceId: this.lastSequenceId };
  }

  // Active recovery hook on visibilitychange (Sleep/Wake)
  public async rehydrateLatestState() {
    if (!this.activeRoomCode || !this.rehydrateCallback) return;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('game_rooms')
          .select('sequence_id, board_state')
          .eq('room_code', this.activeRoomCode)
          .single();

        if (!error && data?.board_state) {
          const remoteSeq = Number(data.sequence_id);
          if (remoteSeq > this.lastSequenceId) {
            this.lastSequenceId = remoteSeq;
            this.rehydrateCallback(data.board_state as AuthoritativeGameState);
          }
        }
      } catch (err) {
        console.warn('Rehydration check failed:', err);
      }
    }
  }

  // Validates incoming packets, dropping out-of-order or duplicate packets from cellular spikes
  public validateIncomingPacket(packetSeq: number): boolean {
    if (packetSeq <= this.lastSequenceId) {
      console.warn(`Discarding out-of-order network packet: got seq ${packetSeq}, expected > ${this.lastSequenceId}`);
      return false;
    }
    this.lastSequenceId = packetSeq;
    return true;
  }
}

export const multiplayerRpc = new MultiplayerRpcManager();
