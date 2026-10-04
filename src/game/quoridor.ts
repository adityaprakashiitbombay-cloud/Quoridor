import { Position, Wall, Orientation, Player } from '../types/game';
import {
  BOARD_SIZE,
  createBitboardGraph,
  getBiDirectionalShortestPath,
  doesWallIntersectPath,
  getWallCutMasks,
  isEdgeConnected,
  hasAnyPathToGoal,
} from './bitboard';

export { BOARD_SIZE } from './bitboard';
export const MAX_WALLS = 10;

/**
 * Checks if a wall blocks movement between two adjacent cells (x1, y1) and (x2, y2).
 */
export function isPathBlockedByWall(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  walls: Wall[]
): boolean {
  if (Math.abs(x1 - x2) + Math.abs(y1 - y2) !== 1) return true;
  const graph = createBitboardGraph(walls);
  return !isEdgeConnected(graph, x1, y1, x2, y2);
}

/**
 * Checks if two walls conflict (overlap or cross).
 */
export function doWallsConflict(w1: { x: number; y: number; orientation: Orientation }, w2: Wall): boolean {
  // Crossing check: at same intersection, H and V cross
  if (w1.x === w2.x && w1.y === w2.y) {
    return true;
  }

  // Overlapping parallel walls (since each wall is 2 units long)
  if (w1.orientation === w2.orientation) {
    if (w1.orientation === 'H') {
      if (w1.y === w2.y && Math.abs(w1.x - w2.x) < 2) {
        return true;
      }
    } else {
      if (w1.x === w2.x && Math.abs(w1.y - w2.y) < 2) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Bi-directional Shortest Path Search on Bitboard Graph.
 */
export function getShortestPath(
  start: Position,
  targetRow: number,
  walls: Wall[]
): { length: number; path: Position[] } | null {
  const graph = createBitboardGraph(walls);
  return getBiDirectionalShortestPath(graph, start, targetRow);
}

/**
 * High-performance Wall Placement Validation using Articulation Path Caching:
 * If the candidate wall does not touch any step of a player's cached path,
 * that player is guaranteed unblocked, bypassing BFS validation.
 */
export function isValidWallPlacement(
  candidate: { x: number; y: number; orientation: Orientation },
  walls: Wall[],
  players: Player[],
  cachedPaths?: { p0Path?: Position[]; p1Path?: Position[] }
): { valid: boolean; reason?: string } {
  const { x, y, orientation } = candidate;

  // Boundary check: wall intersections range from 0 to 7
  if (x < 0 || x >= BOARD_SIZE - 1 || y < 0 || y >= BOARD_SIZE - 1) {
    return { valid: false, reason: 'Out of board bounds' };
  }

  // Conflict with existing walls
  for (const existing of walls) {
    if (doWallsConflict(candidate, existing)) {
      return { valid: false, reason: 'Conflicts with an existing wall' };
    }
  }

  // Articulation Path Filter: Check if candidate cuts across cached paths
  const cutsP0 = cachedPaths?.p0Path ? doesWallIntersectPath(candidate, cachedPaths.p0Path) : true;
  const cutsP1 = cachedPaths?.p1Path ? doesWallIntersectPath(candidate, cachedPaths.p1Path) : true;

  // If candidate wall touches neither player's active path, it's guaranteed valid!
  if (!cutsP0 && !cutsP1) {
    return { valid: true };
  }

  // Otherwise, apply bitwise cut and verify connectivity via Bi-directional BFS
  const baseGraph = createBitboardGraph(walls);
  const cuts = getWallCutMasks(x, y, orientation);
  const simGraph = {
    hMask: baseGraph.hMask & ~cuts.hCut,
    vMask: baseGraph.vMask & ~cuts.vCut,
  };

  for (const p of players) {
    const hasPath = hasAnyPathToGoal(simGraph, { x: p.x, y: p.y }, p.targetRow);
    if (!hasPath) {
      return { valid: false, reason: 'Cannot completely block a player from their goal' };
    }
  }

  return { valid: true };
}

export const MAX_GAME_MOVES = 100; // 50 turns per player cap

/**
 * Encodes pawn positions and turn into a deterministic state key for repetition checks.
 */
export function getPositionStateKey(players: Player[], currentTurn: number): string {
  return `${players[0].x},${players[0].y}|${players[1].x},${players[1].y}|${currentTurn}`;
}

/**
 * Threefold Repetition & Turn Cycle Limiter:
 * Returns true if the exact same pawn arrangement has appeared 3 times,
 * preventing griefing or endless pawn oscillation loops.
 */
export function isThreefoldRepetition(history: string[]): boolean {
  if (history.length < 5) return false;
  const current = history[history.length - 1];
  let count = 0;
  for (const item of history) {
    if (item === current) {
      count++;
      if (count >= 3) return true;
    }
  }
  return false;
}

/**
 * Calculates all legal pawn moves for the active player, including jumps and diagonal hops.
 */
export function getLegalPawnMoves(
  playerIndex: number,
  players: Player[],
  walls: Wall[]
): Position[] {
  const current = players[playerIndex];
  const opponent = players[1 - playerIndex];
  const moves: Position[] = [];
  const graph = createBitboardGraph(walls);

  const directions = [
    { dx: 0, dy: -1 }, // Up
    { dx: 0, dy: 1 },  // Down
    { dx: -1, dy: 0 }, // Left
    { dx: 1, dy: 0 },  // Right
  ];

  for (const { dx, dy } of directions) {
    const nx = current.x + dx;
    const ny = current.y + dy;

    // Check board bounds
    if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) continue;

    // Check if wall blocks movement to neighbor
    if (!isEdgeConnected(graph, current.x, current.y, nx, ny)) continue;

    // If neighbor is NOT occupied by opponent, it's a simple legal step
    if (nx !== opponent.x || ny !== opponent.y) {
      moves.push({ x: nx, y: ny });
      continue;
    }

    // --- Neighbor is OCCUPIED by opponent -> JUMP RULES ---
    const jumpX = opponent.x + dx;
    const jumpY = opponent.y + dy;

    // Can we jump straight over the opponent?
    const canJumpStraight =
      jumpX >= 0 &&
      jumpX < BOARD_SIZE &&
      jumpY >= 0 &&
      jumpY < BOARD_SIZE &&
      isEdgeConnected(graph, opponent.x, opponent.y, jumpX, jumpY);

    if (canJumpStraight) {
      moves.push({ x: jumpX, y: jumpY });
    } else {
      // Straight jump is blocked by a wall or board boundary -> Diagonal Jumps!
      const diagonalDirs =
        dx !== 0
          ? [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }] // Moving horizontal, diagonals are vertical from opponent
          : [{ dx: -1, dy: 0 }, { dx: 1, dy: 0 }]; // Moving vertical, diagonals are horizontal from opponent

      for (const diag of diagonalDirs) {
        const diagX = opponent.x + diag.dx;
        const diagY = opponent.y + diag.dy;

        if (
          diagX >= 0 &&
          diagX < BOARD_SIZE &&
          diagY >= 0 &&
          diagY < BOARD_SIZE &&
          isEdgeConnected(graph, opponent.x, opponent.y, diagX, diagY)
        ) {
          moves.push({ x: diagX, y: diagY });
        }
      }
    }
  }

  return moves;
}

/**
 * Helper to get all valid wall placements remaining on the board with caching.
 */
export function getAllLegalWalls(
  walls: Wall[],
  players: Player[],
  cachedPaths?: { p0Path?: Position[]; p1Path?: Position[] }
): { x: number; y: number; orientation: Orientation }[] {
  const result: { x: number; y: number; orientation: Orientation }[] = [];
  const orientations: Orientation[] = ['H', 'V'];

  for (let x = 0; x < BOARD_SIZE - 1; x++) {
    for (let y = 0; y < BOARD_SIZE - 1; y++) {
      for (const orientation of orientations) {
        const check = isValidWallPlacement({ x, y, orientation }, walls, players, cachedPaths);
        if (check.valid) {
          result.push({ x, y, orientation });
        }
      }
    }
  }

  return result;
}
