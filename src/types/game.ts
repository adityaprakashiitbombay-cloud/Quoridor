export type Orientation = 'H' | 'V';

export interface Position {
  x: number; // 0 to 8
  y: number; // 0 to 8
}

export interface Wall {
  id: string;
  x: number; // 0 to 7 (intersection coordinate)
  y: number; // 0 to 7 (intersection coordinate)
  orientation: Orientation;
  placedBy: number; // player index (0 or 1)
}

export interface Player {
  id: string;
  name: string;
  avatar: string; // avatar key e.g. 'james', 'dino', 'mint', 'flame'
  x: number;
  y: number;
  targetRow: number; // 8 for player 0 (starting at 0), 0 for player 1 (starting at 8)
  wallsLeft: number;
  color: string;
  accentColor: string;
  isAi?: boolean;
  aiDifficulty?: AiDifficulty;
}

export type GameMode = '1v1' | 'friends' | 'ai';
export type AiDifficulty = 'easy' | 'normal' | 'grandmaster' | 'mcts';
export type WallMaterial = 'wood' | 'caution' | 'neon' | 'carbon' | 'concrete';

export interface MoveRecord {
  type: 'move' | 'wall';
  playerIndex: number;
  from?: Position;
  to?: Position;
  wall?: Wall;
  timestamp: number;
  notation: string;
  boardStateBefore?: {
    players: Player[];
    walls: Wall[];
  };
}

export type MoveQuality = 'brilliant' | 'great' | 'best' | 'inaccuracy' | 'blunder';

export interface ReviewedTurn {
  turnNumber: number;
  playerIndex: number;
  move: MoveRecord;
  quality: MoveQuality;
  qualitySymbol: string; // '!!', '!', 'Best', '?', '??'
  winProbabilityBefore: number; // 0 to 1 (for playerIndex)
  winProbabilityAfter: number;
  probDelta: number;
  explanation: string;
  dPlayerBefore: number;
  dOppBefore: number;
  dPlayerAfter: number;
  dOppAfter: number;
  playersAtTurn: Player[];
  wallsAtTurn: Wall[];
}

export interface MatchAnalysis {
  p0Accuracy: number; // 0% to 100%
  p1Accuracy: number;
  p0QualityCounts: Record<MoveQuality, number>;
  p1QualityCounts: Record<MoveQuality, number>;
  clutchTurnIndex: number; // The turn with the biggest turning point swing
  turningPointDescription: string;
  turns: ReviewedTurn[];
}

export interface BoardStickerStamp {
  id: number;
  text: string;
  emoji: string;
  x: number; // percentage
  y: number;
  rotation: number;
  timestamp: number;
}

export interface QuickChatCallout {
  id: string;
  phrase: string;
  emoji: string;
  senderIndex: number; // 0 for P1, 1 for P2
  timestamp: number;
}


export interface OracleAdvice {
  recommendedAction: 'move' | 'wall';
  targetPosition?: Position;
  targetWall?: { x: number; y: number; orientation: Orientation };
  playerPathLength: number;
  opponentPathLength: number;
  delta: number; // opponentPath - playerPath (positive means we are leading)
  reason: string;
  playerShortestPath: Position[];
  opponentShortestPath: Position[];
}

export type ScreenType = 'hub' | 'profile' | 'squad' | 'game' | 'sandbox' | 'bot-arena' | 'campaign' | 'dots-and-boxes';

export type StickerRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface StickerItem {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  rarity: StickerRarity;
  unlockCriteria?: {
    type: 'random_drop' | 'campaign' | 'achievement';
    level?: number;
    achievementId?: string;
  };
  description?: string;
  badgeEmoji?: string;
}

export interface UserStickerPlacement {
  id: string;
  userId: string;
  stickerId: string;
  sticker: StickerItem;
  canvasX: number; // percentage (0-100) or pixels
  canvasY: number;
  canvasRotation: number; // -180 to 180 degrees
  scale: number; // 0.6 to 1.8
  isPinned: boolean;
  unlockedAt?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  level: number;
  xp: number;
  eloRating: number;
  campaignLevel: number;
  matchesPlayed: number;
  matchesWon: number;
  wallsPlaced: number;
  detoursCreated: number;
  totalTurns: number;
  createdAt: string;
}

export interface MatchHistoryEntry {
  id: string;
  gameMode: string;
  player1Id: string;
  player2Id: string | null;
  winnerId: string | null;
  turnsCount: number;
  moveLog: MoveRecord[];
  createdAt: string;
  player1Name?: string;
  player2Name?: string;
  isWin?: boolean;
}

export interface CampaignLevelConfig {
  levelNumber: number;
  title: string;
  subtitle: string;
  tier: 'basics' | 'tactical' | 'master';
  aiDifficulty: AiDifficulty;
  botName: string;
  botAvatar: string;
  playerWalls: number;
  opponentWalls: number;
  preplacedWalls: Wall[];
  turnTimerSeconds: number;
  parMoves: number;
  objective: string;
  rewardStickerSlug?: string;
}

export interface SettlementResult {
  xpGained: number;
  previousXp: number;
  newXp: number;
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
  xpRequiredForCurrentLevel: number;
  xpRequiredForNextLevel: number;
  unlockedSticker?: StickerItem | null;
  unlockedAchievement?: string | null;
  isWin: boolean;
  bonusWallXp: number;
}

// ============================================================================
// DOTS AND BOXES TYPES (Unified Board Framework)
// ============================================================================
export type DotsBoardSize = 2 | 3 | 4 | 5; // 2x2, 3x3, 4x4, 5x5 boxes
export type DotsPlayerType = 'human' | 'ai';
export type DotsAiDifficulty = 'easy' | 'medium' | 'hard' | 'master';
export type DotsTheme = 'streetwear' | 'blueprint' | 'chalkboard' | 'aurora' | 'woodcraft';

export interface DotsPlayer {
  id: string;
  name: string;
  avatar: string;
  color: string;
  accentColor: string;
  type: DotsPlayerType;
  difficulty?: DotsAiDifficulty;
  score: number;
}

export interface DotsMoveRecord {
  lineType: 'h' | 'v';
  r: number;
  c: number;
  playerIndex: number;
  boxesCompleted: number;
  isDoubleCross?: boolean;
  timestamp: number;
}

export interface DotsGameState {
  gridSize: DotsBoardSize;
  players: DotsPlayer[];
  currentTurn: number;
  hLines: boolean[][]; // (gridSize + 1) rows, gridSize cols
  vLines: boolean[][]; // gridSize rows, (gridSize + 1) cols
  boxes: (number | null)[][]; // gridSize x gridSize -> player index who claimed
  winner: number | 'draw' | null;
  moveHistory: DotsMoveRecord[];
  isDoubleCrossActive?: boolean;
  theme: DotsTheme;
  timerSeconds: number;
  isTimerEnabled: boolean;
  gamePhase: 'setup' | 'playing' | 'gameover';
}

