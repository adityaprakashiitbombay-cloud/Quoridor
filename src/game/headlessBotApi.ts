import { Player, Wall, Orientation, Position, AiDifficulty } from '../types/game';
import { getAiMove } from './aiBot';
import { getLegalPawnMoves, isValidWallPlacement, isThreefoldRepetition, getPositionStateKey, MAX_GAME_MOVES } from './quoridor';

export interface HeadlessBotConfig {
  id: string;
  name: string;
  difficulty?: AiDifficulty;
  customScript?: (state: HeadlessGameState) => HeadlessBotAction;
}

export interface HeadlessGameState {
  players: Player[];
  walls: Wall[];
  currentTurn: number;
  moveCount: number;
}

export interface HeadlessBotAction {
  action: 'move' | 'wall';
  to?: Position;
  wall?: { x: number; y: number; orientation: Orientation };
}

export interface HeadlessDuelResult {
  winner: number | null; // 0, 1, or null for draw
  winnerName: string;
  turns: number;
  p0WallsRemaining: number;
  p1WallsRemaining: number;
  durationMs: number;
  p0Moves: number;
  p1Moves: number;
}

export interface HeadlessBatchSummary {
  totalGames: number;
  p0Wins: number;
  p1Wins: number;
  draws: number;
  p0WinRate: number; // percentage
  p1WinRate: number;
  averageTurns: number;
  games: HeadlessDuelResult[];
}

/**
 * Executes an automated headless Quoridor match between two bot algorithms.
 */
export function runHeadlessDuel(
  bot0: HeadlessBotConfig,
  bot1: HeadlessBotConfig,
  maxMoves: number = MAX_GAME_MOVES
): HeadlessDuelResult {
  const startTime = performance.now();

  const players: Player[] = [
    {
      id: 'bot-0',
      name: bot0.name,
      avatar: 'james',
      x: 4,
      y: 0,
      targetRow: 8,
      wallsLeft: 10,
      color: '#2563EB',
      accentColor: '#60A7FF',
      isAi: true,
      aiDifficulty: bot0.difficulty || 'normal',
    },
    {
      id: 'bot-1',
      name: bot1.name,
      avatar: 'blaze',
      x: 4,
      y: 8,
      targetRow: 0,
      wallsLeft: 10,
      color: '#DC2626',
      accentColor: '#F87171',
      isAi: true,
      aiDifficulty: bot1.difficulty || 'grandmaster',
    },
  ];

  const walls: Wall[] = [];
  let currentTurn = 0;
  let turns = 0;
  let winner: number | null = null;
  const history: string[] = [];

  while (turns < maxMoves && winner === null) {
    turns++;
    const activeBot = currentTurn === 0 ? bot0 : bot1;
    const activePlayer = players[currentTurn];

    let decision: HeadlessBotAction;

    if (activeBot.customScript) {
      try {
        decision = activeBot.customScript({
          players: JSON.parse(JSON.stringify(players)),
          walls: JSON.parse(JSON.stringify(walls)),
          currentTurn,
          moveCount: turns,
        });
      } catch {
        // Fallback to normal AI if script fails
        decision = getAiMove(currentTurn, players, walls, 'normal');
      }
    } else {
      decision = getAiMove(currentTurn, players, walls, activeBot.difficulty || 'normal');
    }

    // Apply decision
    if (decision.action === 'wall' && decision.wall && activePlayer.wallsLeft > 0) {
      const check = isValidWallPlacement(decision.wall, walls, players);
      if (check.valid) {
        walls.push({
          id: `w-${Date.now()}-${turns}`,
          x: decision.wall.x,
          y: decision.wall.y,
          orientation: decision.wall.orientation,
          placedBy: currentTurn,
        });
        activePlayer.wallsLeft -= 1;
      } else {
        // Fallback to pawn move
        const legalMoves = getLegalPawnMoves(currentTurn, players, walls);
        if (legalMoves.length > 0) {
          activePlayer.x = legalMoves[0].x;
          activePlayer.y = legalMoves[0].y;
        }
      }
    } else if (decision.to) {
      activePlayer.x = decision.to.x;
      activePlayer.y = decision.to.y;
    } else {
      // Fallback
      const legalMoves = getLegalPawnMoves(currentTurn, players, walls);
      if (legalMoves.length > 0) {
        activePlayer.x = legalMoves[0].x;
        activePlayer.y = legalMoves[0].y;
      }
    }

    // Check win condition
    if (activePlayer.y === activePlayer.targetRow) {
      winner = currentTurn;
      break;
    }

    // Threefold repetition check
    const nextTurn = 1 - currentTurn;
    const key = getPositionStateKey(players, nextTurn);
    history.push(key);
    if (isThreefoldRepetition(history)) {
      break; // Draw
    }

    currentTurn = nextTurn;
  }

  const durationMs = Math.round(performance.now() - startTime);

  return {
    winner,
    winnerName: winner !== null ? players[winner].name : 'Draw',
    turns,
    p0WallsRemaining: players[0].wallsLeft,
    p1WallsRemaining: players[1].wallsLeft,
    durationMs,
    p0Moves: Math.ceil(turns / 2),
    p1Moves: Math.floor(turns / 2),
  };
}

/**
 * Runs a high-speed batch of automated duels for algorithm benchmark.
 */
export function runHeadlessBatch(
  bot0: HeadlessBotConfig,
  bot1: HeadlessBotConfig,
  rounds: number = 20
): HeadlessBatchSummary {
  const games: HeadlessDuelResult[] = [];
  let p0Wins = 0;
  let p1Wins = 0;
  let draws = 0;
  let totalTurns = 0;

  for (let i = 0; i < rounds; i++) {
    const res = runHeadlessDuel(bot0, bot1);
    games.push(res);
    totalTurns += res.turns;

    if (res.winner === 0) p0Wins++;
    else if (res.winner === 1) p1Wins++;
    else draws++;
  }

  return {
    totalGames: rounds,
    p0Wins,
    p1Wins,
    draws,
    p0WinRate: Math.round((p0Wins / rounds) * 100),
    p1WinRate: Math.round((p1Wins / rounds) * 100),
    averageTurns: Math.round((totalTurns / rounds) * 10) / 10,
    games,
  };
}

/**
 * Mock WebSocket Bot API Server Harness
 * Exposes a simulated WebSocket interface for bot scripts in developer mode.
 */
export class HeadlessBotWebSocketServer {
  private listeners: ((message: string) => void)[] = [];

  public connect(callback: (message: string) => void) {
    this.listeners.push(callback);
    callback(JSON.stringify({ type: 'CONNECTED', protocol: 'quoridor-v1', version: '2.0.0' }));
  }

  public sendGameState(state: HeadlessGameState) {
    const payload = JSON.stringify({
      type: 'STATE_UPDATE',
      state,
      timestamp: Date.now(),
    });
    this.listeners.forEach((l) => l(payload));
  }
}
