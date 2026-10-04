import {
  UserProfile,
  StickerItem,
  UserStickerPlacement,
  MatchHistoryEntry,
  SettlementResult,
  MoveRecord,
} from '../types/game';
import { supabase, isSupabaseConfigured } from './supabase';

// ====================================================================
// MASTER STICKER CATALOG (Streetwear, Holographic, Animated, Foil)
// ====================================================================
export const MASTER_STICKERS: StickerItem[] = [
  // Common (65% Drop Rate): Geometric tags, clean smiley pins
  {
    id: 'stk-geo-rhombus',
    slug: 'geo-rhombus',
    name: 'Geo Diamond Pin',
    imageUrl: 'stickers/geo-rhombus.svg',
    rarity: 'common',
    unlockCriteria: { type: 'random_drop' },
    description: 'Precision laser-cut acrylic rhombus tag with matte edges.',
    badgeEmoji: '💎',
  },
  {
    id: 'stk-smiley-classic',
    slug: 'smiley-classic',
    name: 'Acid Smiley Tag',
    imageUrl: 'stickers/smiley-classic.svg',
    rarity: 'common',
    unlockCriteria: { type: 'random_drop' },
    description: 'Classic 90s streetwear rave smiley in neon yellow.',
    badgeEmoji: '😀',
  },
  {
    id: 'stk-pixel-heart',
    slug: 'pixel-heart',
    name: '8-Bit Heart Decal',
    imageUrl: 'stickers/pixel-heart.svg',
    rarity: 'common',
    unlockCriteria: { type: 'random_drop' },
    description: 'Retro arcade 8-bit heart with thick black border.',
    badgeEmoji: '❤️',
  },
  {
    id: 'stk-checker-tag',
    slug: 'checker-tag',
    name: 'Ska Checker Strip',
    imageUrl: 'stickers/checker-tag.svg',
    rarity: 'common',
    unlockCriteria: { type: 'random_drop' },
    description: 'Black and white monochrome racing checker decal.',
    badgeEmoji: '🏁',
  },
  {
    id: 'stk-barcode-99',
    slug: 'barcode-99',
    name: 'Cyber Barcode 99',
    imageUrl: 'stickers/barcode-99.svg',
    rarity: 'common',
    unlockCriteria: { type: 'random_drop' },
    description: 'Industrial techwear inventory serial code.',
    badgeEmoji: '🏷️',
  },
  {
    id: 'stk-cross-bones',
    slug: 'cross-bones',
    name: 'Street Crossbones',
    imageUrl: 'stickers/cross-bones.svg',
    rarity: 'common',
    unlockCriteria: { type: 'random_drop' },
    description: 'Skateboard stencil skull and crossbones vinyl.',
    badgeEmoji: '☠️',
  },

  // Rare (25% Drop Rate): Holographic textures, neon city stamps
  {
    id: 'stk-graffiti-skull',
    slug: 'graffiti-skull',
    name: 'Acid Neon Skull',
    imageUrl: '/stickers/graffiti-skull.jpg',
    rarity: 'rare',
    unlockCriteria: { type: 'random_drop' },
    description: 'Acid lime & cyan 3D plasticine skull with glowing bolt headphones.',
    badgeEmoji: '🎧',
  },
  {
    id: 'stk-holo-tokyo',
    slug: 'holo-tokyo',
    name: 'Neo-Tokyo Stamp',
    imageUrl: 'stickers/holo-tokyo.svg',
    rarity: 'rare',
    unlockCriteria: { type: 'random_drop' },
    description: 'Iridescent holographic kanji passport stamp from Neo-Tokyo.',
    badgeEmoji: '🗼',
  },
  {
    id: 'stk-holographic-prism',
    slug: 'holographic-prism',
    name: 'Prism Foil Octagon',
    imageUrl: 'stickers/holographic-prism.svg',
    rarity: 'rare',
    unlockCriteria: { type: 'random_drop' },
    description: 'Reflective prism vinyl that shifts hues in the light.',
    badgeEmoji: '🌈',
  },
  {
    id: 'stk-retro-cassette',
    slug: 'retro-cassette',
    name: 'Synthwave Tape',
    imageUrl: 'stickers/retro-cassette.svg',
    rarity: 'rare',
    unlockCriteria: { type: 'random_drop' },
    description: 'Magnetic cassette with chrome magenta holographic finish.',
    badgeEmoji: '📼',
  },
  {
    id: 'stk-cyber-lotus',
    slug: 'cyber-lotus',
    name: 'Cyberpunk Lotus',
    imageUrl: 'stickers/cyber-lotus.svg',
    rarity: 'rare',
    unlockCriteria: { type: 'random_drop' },
    description: 'Bio-luminescent lotus blossom decal with cyan glow.',
    badgeEmoji: '🪷',
  },
  {
    id: 'stk-glitch-cat',
    slug: 'glitch-cat',
    name: 'Neko Error 404',
    imageUrl: 'stickers/glitch-cat.svg',
    rarity: 'rare',
    unlockCriteria: { type: 'random_drop' },
    description: 'Chromatic aberration glitch kitten sticker.',
    badgeEmoji: '🐱',
  },

  // Epic (8% Drop Rate): Animated SVG glints, animated graffiti decals
  {
    id: 'stk-ninja-pawn',
    slug: 'ninja-pawn',
    name: 'Ninja Pawn Block',
    imageUrl: '/stickers/ninja-pawn.jpg',
    rarity: 'epic',
    unlockCriteria: { type: 'random_drop' },
    description: 'Handcrafted 3D claymorphic ninja pawn gripping a wooden wall barricade.',
    badgeEmoji: '🥷',
  },
  {
    id: 'stk-animated-skull',
    slug: 'animated-skull',
    name: 'Graffiti Glint Skull',
    imageUrl: 'stickers/animated-skull.svg',
    rarity: 'epic',
    unlockCriteria: { type: 'random_drop' },
    description: 'Animated iridescent glint effect over dripping graffiti.',
    badgeEmoji: '💀',
  },
  {
    id: 'stk-electric-dragon',
    slug: 'electric-dragon',
    name: 'Dragon Spark Emblem',
    imageUrl: 'stickers/electric-dragon.svg',
    rarity: 'epic',
    unlockCriteria: { type: 'random_drop' },
    description: 'Coiled storm dragon radiating pulsing electric arcs.',
    badgeEmoji: '⚡',
  },
  {
    id: 'stk-flame-thrower',
    slug: 'flame-thrower',
    name: 'Ignition Nitro Tag',
    imageUrl: 'stickers/flame-thrower.svg',
    rarity: 'epic',
    unlockCriteria: { type: 'random_drop' },
    description: 'Animated flame particle glow sticker with hot orange gradient.',
    badgeEmoji: '🔥',
  },
  {
    id: 'stk-vapor-statue',
    slug: 'vapor-statue',
    name: 'Aesthetic Bust Glow',
    imageUrl: 'stickers/vapor-statue.svg',
    rarity: 'epic',
    unlockCriteria: { type: 'random_drop' },
    description: 'Synthwave Greek marble bust bathed in ultraviolet light.',
    badgeEmoji: '🗿',
  },

  // Legendary (2% Drop Rate): Metallic foil championship badges
  {
    id: 'stk-crown-bot',
    slug: 'crown-bot',
    name: 'Street Champ Bot',
    imageUrl: '/stickers/crown-bot.jpg',
    rarity: 'legendary',
    unlockCriteria: { type: 'random_drop' },
    description: '3D claymorphic robot champion with gold crown and streetwear snapback.',
    badgeEmoji: '🤖',
  },
  {
    id: 'stk-gold-crown',
    slug: 'gold-quoridor-crown',
    name: 'Championship Gold Crown',
    imageUrl: 'stickers/gold-crown.svg',
    rarity: 'legendary',
    unlockCriteria: { type: 'random_drop' },
    description: '24K gold mirror-foil die-cut crown with embossed jewels.',
    badgeEmoji: '👑',
  },
  {
    id: 'stk-oracle-eye',
    slug: 'alpha-oracle-eye',
    name: 'Omniscient Oracle Eye',
    imageUrl: 'stickers/oracle-eye.svg',
    rarity: 'legendary',
    unlockCriteria: { type: 'random_drop' },
    description: 'Deep neural network AlphaZero third eye with gold leaf foil.',
    badgeEmoji: '👁️',
  },
  {
    id: 'stk-diamond-shield',
    slug: 'diamond-shield',
    name: 'Invictus Platinum Shield',
    imageUrl: 'stickers/diamond-shield.svg',
    rarity: 'legendary',
    unlockCriteria: { type: 'random_drop' },
    description: 'Brushed titanium championship aegis that repels all obstacles.',
    badgeEmoji: '🛡️',
  },

  // Achievement-Bound Signature Stickers
  {
    id: 'stk-wall-star',
    slug: 'wall-star',
    name: 'Wall Star',
    imageUrl: 'stickers/wall-star.svg',
    rarity: 'epic',
    unlockCriteria: { type: 'achievement', achievementId: 'zero_walls' },
    description: 'Exclusively unlocked by winning a full match with 0 walls placed!',
    badgeEmoji: '⭐',
  },
  {
    id: 'stk-speed-demon',
    slug: 'speed-demon',
    name: 'Speed Demon',
    imageUrl: 'stickers/speed-demon.svg',
    rarity: 'legendary',
    unlockCriteria: { type: 'achievement', achievementId: 'speed_demon' },
    description: 'Exclusively unlocked by blitzing to victory in under 18 moves!',
    badgeEmoji: '🏎️',
  },
  {
    id: 'stk-gauntlet-master',
    slug: 'gauntlet-master',
    name: 'Gauntlet Master',
    imageUrl: 'stickers/gauntlet-master.svg',
    rarity: 'legendary',
    unlockCriteria: { type: 'campaign', level: 15 },
    description: 'Earned by conquering Master Trial Level 15 in The Gauntlet.',
    badgeEmoji: '🏆',
  },
];

// Local Storage Keys for offline persistence
const STORAGE_PROFILE_KEY = 'quoridor_user_profile';
const STORAGE_STICKERS_KEY = 'quoridor_user_stickers';
const STORAGE_MATCHES_KEY = 'quoridor_match_history';

// Safe in-memory fallback when localStorage is unavailable (e.g. Node/SSR/tests)
const memoryStore: Record<string, string> = {};

function storageGet(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return memoryStore[key] || null;
}

function storageSet(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
  } catch {
    // ignore
  }
  memoryStore[key] = value;
}

// ====================================================================
// XP CALCULUS: XP_required = 100 * (Level)^1.4
// ====================================================================
export function calculateXpRequired(level: number): number {
  if (level <= 0) return 100;
  return Math.floor(100 * Math.pow(level, 1.4));
}

// XP reward calculation: 120 win, 40 loss, +10 per unused wall
export function calculateMatchXp(isWin: boolean, unusedWalls: number): { baseXp: number; bonusWallXp: number; totalXp: number } {
  const baseXp = isWin ? 120 : 40;
  const bonusWallXp = Math.max(0, unusedWalls) * 10;
  return {
    baseXp,
    bonusWallXp,
    totalXp: baseXp + bonusWallXp,
  };
}

// ====================================================================
// STICKER DROP ROLLER: 65% Common, 25% Rare, 8% Epic, 2% Legendary
// ====================================================================
export function rollStickerRarity(roll: number = Math.random()): 'common' | 'rare' | 'epic' | 'legendary' {
  if (roll < 0.02) return 'legendary';
  if (roll < 0.10) return 'epic';
  if (roll < 0.35) return 'rare';
  return 'common';
}

export function rollStickerDrop(ownedSlugs: Set<string>): StickerItem | null {
  const targetRarity = rollStickerRarity();

  // Eligible pool: unowned stickers of target rarity that are random drops
  const matching = MASTER_STICKERS.filter(
    (s) => s.rarity === targetRarity && !ownedSlugs.has(s.slug) && s.unlockCriteria?.type === 'random_drop'
  );

  if (matching.length > 0) {
    const idx = Math.floor(Math.random() * matching.length);
    return matching[idx];
  }

  // Fallback: any unowned random drop sticker
  const anyUnowned = MASTER_STICKERS.filter(
    (s) => !ownedSlugs.has(s.slug) && s.unlockCriteria?.type === 'random_drop'
  );

  if (anyUnowned.length > 0) {
    const idx = Math.floor(Math.random() * anyUnowned.length);
    return anyUnowned[idx];
  }

  return null; // All random drop stickers collected
}

// ====================================================================
// PROFILE INITIALIZATION & STORAGE
// ====================================================================
export function getInitialProfile(username: string = 'James'): UserProfile {
  return {
    id: 'usr-local-player-1',
    username,
    level: 1,
    xp: 0,
    eloRating: 1200,
    campaignLevel: 1,
    matchesPlayed: 0,
    matchesWon: 0,
    wallsPlaced: 0,
    detoursCreated: 0,
    totalTurns: 0,
    createdAt: new Date().toISOString(),
  };
}

export function getUserProfile(): UserProfile {
  try {
    const data = storageGet(STORAGE_PROFILE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // ignore
  }
  const init = getInitialProfile();
  saveUserProfile(init);
  return init;
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    storageSet(STORAGE_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }

  // Real-time synchronization to Supabase public.profiles table
  if (isSupabaseConfigured) {
    try {
      supabase.auth.getSession().then(({ data }) => {
        const uid = data?.session?.user?.id;
        if (uid) {
          supabase
            .from('profiles')
            .upsert({
              id: uid,
              username: profile.username,
              level: profile.level,
              xp: profile.xp,
              elo_rating: profile.eloRating,
              matches_played: profile.matchesPlayed,
              matches_won: profile.matchesWon,
              walls_placed: profile.wallsPlaced,
              detours_created: profile.detoursCreated,
              total_turns: profile.totalTurns,
            })
            .then(({ error }) => {
              if (error) console.warn('Could not sync profile to Supabase table:', error.message);
            });
        }
      });
    } catch {}
  }
}

// ====================================================================
// STICKER INVENTORY & BOARD PLACEMENTS
// ====================================================================
export function getUserStickerPlacements(): UserStickerPlacement[] {
  try {
    const data = storageGet(STORAGE_STICKERS_KEY);
    if (data) {
      const parsed: UserStickerPlacement[] = JSON.parse(data);
      // Re-hydrate sticker item definitions
      return parsed.map((p) => {
        const item = MASTER_STICKERS.find((s) => s.id === p.stickerId || s.slug === p.sticker?.slug) || p.sticker;
        return { ...p, sticker: item };
      });
    }
  } catch {
    // ignore
  }

  // Default starter stickers on deck (Showcases 3D claymorphic toy stickers)
  const starterSlugs = ['ninja-pawn', 'crown-bot', 'graffiti-skull', 'holo-tokyo'];
  const starterPlacements: UserStickerPlacement[] = starterSlugs.map((slug, i) => {
    const stk = MASTER_STICKERS.find((s) => s.slug === slug)!;
    const offsets = [
      { x: 26, y: 42, rot: -7, scale: 1.15 },
      { x: 52, y: 58, rot: 6, scale: 1.25 },
      { x: 76, y: 38, rot: 12, scale: 1.1 },
      { x: 46, y: 24, rot: -4, scale: 0.95 },
    ];
    const off = offsets[i] || { x: 50, y: 50, rot: 0, scale: 1.0 };
    return {
      id: `plm-${slug}`,
      userId: 'usr-local-player-1',
      stickerId: stk.id,
      sticker: stk,
      canvasX: off.x,
      canvasY: off.y,
      canvasRotation: off.rot,
      scale: off.scale,
      isPinned: true,
      unlockedAt: new Date().toISOString(),
    };
  });

  saveUserStickerPlacements(starterPlacements);
  return starterPlacements;
}

export function saveUserStickerPlacements(placements: UserStickerPlacement[]): void {
  try {
    storageSet(STORAGE_STICKERS_KEY, JSON.stringify(placements));
  } catch {
    // ignore
  }
}

// Add a newly unlocked sticker to the user's inventory
export function addUnlockedSticker(sticker: StickerItem): UserStickerPlacement {
  const current = getUserStickerPlacements();
  const existing = current.find((p) => p.stickerId === sticker.id || p.sticker?.slug === sticker.slug);
  if (existing) return existing;

  // Scatter randomly near center of board
  const newPlacement: UserStickerPlacement = {
    id: `plm-${sticker.slug}-${Date.now()}`,
    userId: 'usr-local-player-1',
    stickerId: sticker.id,
    sticker,
    canvasX: Math.round(25 + Math.random() * 50),
    canvasY: Math.round(25 + Math.random() * 50),
    canvasRotation: Math.round(-25 + Math.random() * 50),
    scale: 1.0,
    isPinned: true,
    unlockedAt: new Date().toISOString(),
  };

  const updated = [...current, newPlacement];
  saveUserStickerPlacements(updated);
  return newPlacement;
}

// ====================================================================
// MATCH HISTORY STORAGE
// ====================================================================
export function getMatchHistory(limit: number = 20): MatchHistoryEntry[] {
  try {
    const data = storageGet(STORAGE_MATCHES_KEY);
    if (data) {
      const list: MatchHistoryEntry[] = JSON.parse(data);
      return list.slice(0, limit);
    }
  } catch {
    // ignore
  }

  // Default seed matches for realistic initial timeline scrubber
  const seedMatches: MatchHistoryEntry[] = [
    {
      id: 'm-seed-1',
      gameMode: '1v1_ranked',
      player1Id: 'usr-local-player-1',
      player2Id: 'bot-tactician',
      winnerId: 'usr-local-player-1',
      turnsCount: 24,
      moveLog: [],
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      player1Name: 'James',
      player2Name: 'Tactician [Normal]',
      isWin: true,
    },
    {
      id: 'm-seed-2',
      gameMode: '1v1_ranked',
      player1Id: 'usr-local-player-1',
      player2Id: 'bot-grandmaster',
      winnerId: 'bot-grandmaster',
      turnsCount: 38,
      moveLog: [],
      createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      player1Name: 'James',
      player2Name: 'Alpha Master [Hard]',
      isWin: false,
    },
    {
      id: 'm-seed-3',
      gameMode: 'campaign',
      player1Id: 'usr-local-player-1',
      player2Id: 'bot-scout',
      winnerId: 'usr-local-player-1',
      turnsCount: 16,
      moveLog: [],
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      player1Name: 'James',
      player2Name: 'Gauntlet Bot #1',
      isWin: true,
    },
  ];

  try {
    storageSet(STORAGE_MATCHES_KEY, JSON.stringify(seedMatches));
  } catch {
    // ignore
  }
  return seedMatches;
}

export function recordMatchToHistory(entry: MatchHistoryEntry): void {
  try {
    const history = getMatchHistory(50);
    const updated = [entry, ...history].slice(0, 50);
    storageSet(STORAGE_MATCHES_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

// ====================================================================
// ATOMIC MATCH SETTLEMENT (Dual Mode: PostgreSQL RPC or Mirrored Local)
// ====================================================================
export interface SettleMatchParams {
  matchId?: string;
  gameMode: string;
  winnerPlayerIndex: number | null; // 0 for player1, 1 for player2, null for draw
  turnsCount: number;
  moveLog: MoveRecord[];
  playerWallsLeft: number;
  playerWallsPlaced: number;
  opponentWallsPlaced: number;
  detoursCreated?: number;
  p1Name?: string;
  p2Name?: string;
  campaignLevelNumber?: number;
}

export async function settleMatch(params: SettleMatchParams): Promise<SettlementResult> {
  const isUuid = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
  const matchId = params.matchId || `m-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const validUuid = isUuid(params.matchId)
    ? (params.matchId as string)
    : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined);

  const isWin = params.winnerPlayerIndex === 0;
  const isDraw = params.winnerPlayerIndex === null;

  // Resolve Supabase user ID if authenticated
  let authUserId: string | null = null;
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) {
        authUserId = data.session.user.id;
      }
    } catch {}
  }

  const dbWinnerId = isWin && authUserId ? authUserId : null;
  const dbPlayer1Id = authUserId || null;

  // 1. Live Supabase settlement (Direct table insert + RPC)
  if (isSupabaseConfigured) {
    // Direct table sync to match_history table so rows appear in Supabase dashboard immediately
    try {
      const insertPayload: any = {
        game_mode: params.gameMode || '1v1_ranked',
        player1_id: dbPlayer1Id,
        player2_id: null,
        winner_id: dbWinnerId,
        turns_count: params.turnsCount,
        move_log: params.moveLog || [],
        created_at: new Date().toISOString(),
      };
      if (validUuid) {
        insertPayload.id = validUuid;
      }
      const { error: insertErr } = await supabase.from('match_history').insert(insertPayload);
      if (insertErr) {
        console.warn('Direct match_history table insert warning:', insertErr.message);
      }
    } catch (e) {
      console.warn('Direct match_history sync failed:', e);
    }

    // Try RPC if UUID is available
    if (validUuid) {
      try {
        const { data, error } = await supabase.rpc('settle_match', {
          p_match_id: validUuid,
          p_winner_id: dbWinnerId,
          p_turns: params.turnsCount,
          p_move_log: params.moveLog || [],
          p_unused_walls: params.playerWallsLeft || 0,
        });

        if (!error && data) {
          // Also persist locally for fast offline access
          recordMatchToHistory({
            id: matchId,
            gameMode: params.gameMode,
            player1Id: authUserId || 'usr-local-player-1',
            player2Id: 'p2',
            winnerId: isWin ? (authUserId || 'usr-local-player-1') : isDraw ? null : 'p2',
            turnsCount: params.turnsCount,
            moveLog: params.moveLog,
            createdAt: new Date().toISOString(),
            player1Name: params.p1Name || 'James',
            player2Name: params.p2Name || 'Opponent',
            isWin,
          });

          return {
            xpGained: data.xp_gained,
            previousXp: data.new_xp - data.xp_gained,
            newXp: data.new_xp,
            previousLevel: data.new_level - (data.leveled_up ? 1 : 0),
            newLevel: data.new_level,
            leveledUp: data.leveled_up,
            xpRequiredForCurrentLevel: calculateXpRequired(data.new_level),
            xpRequiredForNextLevel: calculateXpRequired(data.new_level + 1),
            unlockedSticker: data.unlocked_sticker,
            isWin,
            bonusWallXp: data.bonus_wall_xp || 0,
          };
        }
      } catch {
        // Fall back to local calculation
      }
    }
  }

  // 2. Mirrored Local Atomic Settlement Engine
  const profile = getUserProfile();
  const xpReward = calculateMatchXp(isWin, params.playerWallsLeft);

  const prevXp = profile.xp;
  const prevLevel = profile.level;
  let newXp = prevXp + xpReward.totalXp;
  let newLevel = prevLevel;
  let leveledUp = false;

  // Level Up Calculus: XP_required = 100 * (Level)^1.4
  let req = calculateXpRequired(newLevel);
  while (newXp >= req) {
    newLevel += 1;
    leveledUp = true;
    req = calculateXpRequired(newLevel);
  }

  // Update profile metrics
  profile.xp = newXp;
  profile.level = newLevel;
  profile.matchesPlayed += 1;
  if (isWin) {
    profile.matchesWon += 1;
    profile.eloRating = Math.min(2800, profile.eloRating + 24);
  } else if (!isDraw) {
    profile.eloRating = Math.max(600, profile.eloRating - 16);
  }
  profile.wallsPlaced += params.playerWallsPlaced;
  profile.detoursCreated += params.detoursCreated || 0;
  profile.totalTurns += params.turnsCount;

  if (params.campaignLevelNumber && isWin && profile.campaignLevel <= params.campaignLevelNumber) {
    profile.campaignLevel = params.campaignLevelNumber + 1;
  }

  saveUserProfile(profile);

  // 3. Loot Rolling & Achievements (only on victory)
  let unlockedSticker: StickerItem | null = null;
  let unlockedAchievement: string | null = null;

  if (isWin) {
    // Check signature achievements first
    const ownedStickers = getUserStickerPlacements();
    const ownedSlugs = new Set(ownedStickers.map((p) => p.sticker?.slug || ''));

    // Achievement: "Wall Star" - 0 walls placed during victory
    if (params.playerWallsPlaced === 0 && !ownedSlugs.has('wall-star')) {
      const starSticker = MASTER_STICKERS.find((s) => s.slug === 'wall-star');
      if (starSticker) {
        unlockedSticker = starSticker;
        unlockedAchievement = 'Wall Star (Won with 0 Walls Placed!)';
        addUnlockedSticker(starSticker);
      }
    }
    // Achievement: "Speed Demon" - Won in under 18 moves
    else if (params.turnsCount < 18 && !ownedSlugs.has('speed-demon')) {
      const speedSticker = MASTER_STICKERS.find((s) => s.slug === 'speed-demon');
      if (speedSticker) {
        unlockedSticker = speedSticker;
        unlockedAchievement = 'Speed Demon (Blitzed in <18 Moves!)';
        addUnlockedSticker(speedSticker);
      }
    }
    // Achievement: "Gauntlet Master" - Completed campaign level 15+
    else if (params.campaignLevelNumber && params.campaignLevelNumber >= 15 && !ownedSlugs.has('gauntlet-master')) {
      const gauntletSticker = MASTER_STICKERS.find((s) => s.slug === 'gauntlet-master');
      if (gauntletSticker) {
        unlockedSticker = gauntletSticker;
        unlockedAchievement = 'Gauntlet Master (Conquered Trial 15+)';
        addUnlockedSticker(gauntletSticker);
      }
    }
    // Normal Loot Roll: 65% Common, 25% Rare, 8% Epic, 2% Legendary
    else {
      const rolled = rollStickerDrop(ownedSlugs);
      if (rolled) {
        unlockedSticker = rolled;
        addUnlockedSticker(rolled);
      }
    }
  }

  // 4. Save Match to Ledger
  recordMatchToHistory({
    id: matchId,
    gameMode: params.gameMode,
    player1Id: profile.id,
    player2Id: 'p2',
    winnerId: isWin ? profile.id : isDraw ? null : 'p2',
    turnsCount: params.turnsCount,
    moveLog: params.moveLog,
    createdAt: new Date().toISOString(),
    player1Name: params.p1Name || profile.username,
    player2Name: params.p2Name || 'Opponent',
    isWin,
  });

  return {
    xpGained: xpReward.totalXp,
    previousXp: prevXp,
    newXp,
    previousLevel: prevLevel,
    newLevel,
    leveledUp,
    xpRequiredForCurrentLevel: calculateXpRequired(newLevel),
    xpRequiredForNextLevel: calculateXpRequired(newLevel + 1),
    unlockedSticker,
    unlockedAchievement,
    isWin,
    bonusWallXp: xpReward.bonusWallXp,
  };
}
