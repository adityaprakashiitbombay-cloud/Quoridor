import { supabase, isSupabaseConfigured } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { QuickChatCallout, BoardStickerStamp } from '../types/game';

export interface MultiplayerMember {
  userId: string;
  username: string;
  playerIndex: number;
  onlineAt: string;
}

export interface MultiplayerMovePayload {
  roomCode: string;
  sequenceId: number;
  playerIndex: number;
  action: 'move' | 'wall';
  payload: any;
  timestamp: number;
}

export interface MatchChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  isQuickChat?: boolean;
  createdAt: string;
}

type ReactionListener = (reaction: BoardStickerStamp) => void;
type QuickChatListener = (callout: QuickChatCallout) => void;
type MoveListener = (move: MultiplayerMovePayload) => void;
type PresenceListener = (members: MultiplayerMember[]) => void;
type ChatListener = (msg: MatchChatMessage) => void;

class MultiplayerService {
  private activeChannel: RealtimeChannel | null = null;
  private currentRoomCode: string = '';
  private reactionListeners: Set<ReactionListener> = new Set();
  private quickChatListeners: Set<QuickChatListener> = new Set();
  private moveListeners: Set<MoveListener> = new Set();
  private presenceListeners: Set<PresenceListener> = new Set();
  private chatListeners: Set<ChatListener> = new Set();
  private localSequenceId: number = 0;

  public joinRoom(roomCode: string, user: { id: string; username: string; playerIndex: number }) {
    if (this.currentRoomCode === roomCode && this.activeChannel) {
      return;
    }

    this.leaveRoom();
    this.currentRoomCode = roomCode;
    this.localSequenceId = 0;

    if (!isSupabaseConfigured) {
      return;
    }

    const channelName = `game_room:${roomCode}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: false, self: false },
        presence: { key: user.id },
      },
    });

    // 1. Listen for Ephemeral Broadcasts (Quick-Chat, Reactions, Moves)
    channel
      .on('broadcast', { event: 'quick_chat' }, ({ payload }) => {
        if (payload) {
          this.quickChatListeners.forEach((fn) => fn(payload));
        }
      })
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        if (payload) {
          this.reactionListeners.forEach((fn) => fn(payload));
        }
      })
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        if (payload) {
          this.moveListeners.forEach((fn) => fn(payload));
        }
      });

    // 2. Listen for Presence State (Lobby heartbeats & member tracking)
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const members: MultiplayerMember[] = [];
        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          if (presences && presences.length > 0) {
            members.push(presences[0]);
          }
        });
        this.presenceListeners.forEach((fn) => fn(members));
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        // Trigger presence update
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // Trigger presence update
      });

    // 3. Listen for Postgres Changes on match_messages (if subscribed)
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'match_messages',
      },
      (payload) => {
        if (payload.new) {
          const msg: MatchChatMessage = {
            id: payload.new.id,
            roomId: payload.new.room_id,
            senderId: payload.new.sender_id,
            content: payload.new.content,
            isQuickChat: payload.new.is_quick_chat,
            createdAt: payload.new.created_at,
          };
          this.chatListeners.forEach((fn) => fn(msg));
        }
      }
    );

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId: user.id,
          username: user.username,
          playerIndex: user.playerIndex,
          onlineAt: new Date().toISOString(),
        });
      }
    });

    this.activeChannel = channel;
  }

  public leaveRoom() {
    if (this.activeChannel) {
      this.activeChannel.unsubscribe();
      this.activeChannel = null;
    }
    this.currentRoomCode = '';
  }

  // --- Realtime Broadcast Methods ---

  public sendQuickChat(callout: QuickChatCallout, userId?: string) {
    // Notify local listeners
    this.quickChatListeners.forEach((fn) => fn(callout));

    if (this.activeChannel && isSupabaseConfigured) {
      // 1. Broadcast with zero database latency
      this.activeChannel.send({
        type: 'broadcast',
        event: 'quick_chat',
        payload: callout,
      });

      // 2. Asynchronously record into match_messages
      if (userId && this.currentRoomCode) {
        supabase
          .from('match_messages')
          .insert({
            room_id: this.currentRoomCode,
            sender_id: userId,
            content: `${callout.emoji} ${callout.phrase}`,
            is_quick_chat: true,
          })
          .then(({ error }) => {
            if (error) console.warn('Could not record quick chat to match_messages:', error);
          });
      }
    }
  }

  public sendReaction(reaction: BoardStickerStamp) {
    this.reactionListeners.forEach((fn) => fn(reaction));

    if (this.activeChannel && isSupabaseConfigured) {
      this.activeChannel.send({
        type: 'broadcast',
        event: 'reaction',
        payload: reaction,
      });
    }
  }

  public sendMove(action: 'move' | 'wall', payload: any, playerIndex: number) {
    this.localSequenceId += 1;
    const moveData: MultiplayerMovePayload = {
      roomCode: this.currentRoomCode,
      sequenceId: this.localSequenceId,
      playerIndex,
      action,
      payload,
      timestamp: Date.now(),
    };

    this.moveListeners.forEach((fn) => fn(moveData));

    if (this.activeChannel && isSupabaseConfigured) {
      this.activeChannel.send({
        type: 'broadcast',
        event: 'move',
        payload: moveData,
      });
    }

    return moveData;
  }

  // --- Listener Subscriptions ---

  public onQuickChat(listener: QuickChatListener): () => void {
    this.quickChatListeners.add(listener);
    return () => {
      this.quickChatListeners.delete(listener);
    };
  }

  public onReaction(listener: ReactionListener): () => void {
    this.reactionListeners.add(listener);
    return () => {
      this.reactionListeners.delete(listener);
    };
  }

  public onMove(listener: MoveListener): () => void {
    this.moveListeners.add(listener);
    return () => {
      this.moveListeners.delete(listener);
    };
  }

  public onPresenceChange(listener: PresenceListener): () => void {
    this.presenceListeners.add(listener);
    return () => {
      this.presenceListeners.delete(listener);
    };
  }

  public onChatMessage(listener: ChatListener): () => void {
    this.chatListeners.add(listener);
    return () => {
      this.chatListeners.delete(listener);
    };
  }
}

export const multiplayerService = new MultiplayerService();
