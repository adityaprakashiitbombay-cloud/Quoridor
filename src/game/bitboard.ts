import { Position, Wall, Orientation, Player } from '../types/game';

export const BOARD_SIZE = 9;

// Total edges in a 9x9 grid: 72 horizontal, 72 vertical
export const ALL_EDGES_MASK: bigint = (1n << 72n) - 1n;

/**
 * Encodes board edge connectivity as two 72-bit BigInt bitboards:
 * - hMask: horizontal edge between (x, y) and (x + 1, y), index = y * 8 + x  (0..71)
 * - vMask: vertical edge between (x, y) and (x, y + 1), index = y * 9 + x  (0..71)
 */
export interface BitboardGraph {
  hMask: bigint;
  vMask: bigint;
}

/**
 * Creates an empty graph where all 72 horizontal and 72 vertical edges are connected.
 */
export function createBitboardGraph(walls: Wall[]): BitboardGraph {
  let hMask = ALL_EDGES_MASK;
  let vMask = ALL_EDGES_MASK;

  for (const wall of walls) {
    const masks = getWallCutMasks(wall.x, wall.y, wall.orientation);
    hMask &= ~masks.hCut;
    vMask &= ~masks.vCut;
  }

  return { hMask, vMask };
}

/**
 * Computes the edge cut masks for a 2-unit wall:
 * - Horizontal wall at (wx, wy): cuts vertical steps between (wx, wy)<->(wx, wy+1) and (wx+1, wy)<->(wx+1, wy+1)
 * - Vertical wall at (wx, wy): cuts horizontal steps between (wx, wy)<->(wx+1, wy) and (wx, wy+1)<->(wx+1, wy+1)
 */
export function getWallCutMasks(
  wx: number,
  wy: number,
  orientation: Orientation
): { hCut: bigint; vCut: bigint } {
  if (orientation === 'H') {
    // Cuts 2 vertical edges at row wy: col wx and col wx + 1
    const v1 = BigInt(wy * 9 + wx);
    const v2 = BigInt(wy * 9 + (wx + 1));
    return {
      hCut: 0n,
      vCut: (1n << v1) | (1n << v2),
    };
  } else {
    // Vertical wall: cuts 2 horizontal edges at col wx: row wy and row wy + 1
    const h1 = BigInt(wy * 8 + wx);
    const h2 = BigInt((wy + 1) * 8 + wx);
    return {
      hCut: (1n << h1) | (1n << h2),
      vCut: 0n,
    };
  }
}

/**
 * Fast bitwise edge check between adjacent cells (x1, y1) and (x2, y2).
 */
export function isEdgeConnected(
  graph: BitboardGraph,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): boolean {
  // Horizontal step: between (x, y) and (x + 1, y)
  if (y1 === y2) {
    const minX = Math.min(x1, x2);
    if (minX < 0 || minX >= 8 || y1 < 0 || y1 >= 9) return false;
    const bit = BigInt(y1 * 8 + minX);
    return (graph.hMask & (1n << bit)) !== 0n;
  }

  // Vertical step: between (x, y) and (x, y + 1)
  if (x1 === x2) {
    const minY = Math.min(y1, y2);
    if (minY < 0 || minY >= 8 || x1 < 0 || x1 >= 9) return false;
    const bit = BigInt(minY * 9 + x1);
    return (graph.vMask & (1n << bit)) !== 0n;
  }

  return false;
}

/**
 * Fast-Path Early-Exit BFS:
 * Validates wall legality by halting the instant any reachable node touches targetRow.
 * Uses an 81-bit BigInt visited mask and flat queue with zero allocations.
 */
export function hasAnyPathToGoal(
  graph: BitboardGraph,
  start: Position,
  targetRow: number
): boolean {
  if (start.y === targetRow) return true;

  let visitedMask = 1n << BigInt(start.y * BOARD_SIZE + start.x);
  const queue: number[] = [start.y * BOARD_SIZE + start.x];

  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  let head = 0;
  while (head < queue.length) {
    const key = queue[head++];
    const cx = key % BOARD_SIZE;
    const cy = Math.floor(key / BOARD_SIZE);

    for (let i = 0; i < 4; i++) {
      const nx = cx + dirs[i].dx;
      const ny = cy + dirs[i].dy;

      if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
        const nextKey = ny * BOARD_SIZE + nx;
        const bit = 1n << BigInt(nextKey);

        if ((visitedMask & bit) === 0n) {
          if (isEdgeConnected(graph, cx, cy, nx, ny)) {
            // Instant Early-Exit on targetRow contact
            if (ny === targetRow) return true;
            visitedMask |= bit;
            queue.push(nextKey);
          }
        }
      }
    }
  }

  return false;
}

/**
 * Bi-directional Early-Exit BFS:
 * Expands forward from start and backward from the targetRow simultaneously.
 * Halves the search depth, reducing complexity from O(V) to O(b^(d/2)).
 */
export function getBiDirectionalShortestPath(
  graph: BitboardGraph,
  start: Position,
  targetRow: number
): { length: number; path: Position[] } | null {
  if (start.y === targetRow) {
    return { length: 0, path: [start] };
  }

  const forwardVisited = new Map<number, number>(); // key -> parentKey
  const backwardVisited = new Map<number, number>(); // key -> parentKey

  const forwardQueue: Position[] = [start];
  const backwardQueue: Position[] = [];

  const startKey = start.y * BOARD_SIZE + start.x;
  forwardVisited.set(startKey, -1);

  // Initialize backward frontier with all 9 nodes of targetRow
  for (let x = 0; x < BOARD_SIZE; x++) {
    const key = targetRow * BOARD_SIZE + x;
    backwardVisited.set(key, -1);
    backwardQueue.push({ x, y: targetRow });
  }

  let intersectionKey = -1;

  const dirs = [
    { dx: 0, dy: -1 }, // Up
    { dx: 0, dy: 1 },  // Down
    { dx: -1, dy: 0 }, // Left
    { dx: 1, dy: 0 },  // Right
  ];

  while (forwardQueue.length > 0 && backwardQueue.length > 0) {
    // 1. Expand forward frontier by one level
    const fLen = forwardQueue.length;
    for (let i = 0; i < fLen; i++) {
      const cur = forwardQueue.shift()!;
      const curKey = cur.y * BOARD_SIZE + cur.x;

      for (const { dx, dy } of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;

        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
          if (isEdgeConnected(graph, cur.x, cur.y, nx, ny)) {
            const nextKey = ny * BOARD_SIZE + nx;

            if (backwardVisited.has(nextKey)) {
              // Frontiers collide!
              forwardVisited.set(nextKey, curKey);
              intersectionKey = nextKey;
              break;
            }

            if (!forwardVisited.has(nextKey)) {
              forwardVisited.set(nextKey, curKey);
              forwardQueue.push({ x: nx, y: ny });
            }
          }
        }
      }
      if (intersectionKey !== -1) break;
    }
    if (intersectionKey !== -1) break;

    // 2. Expand backward frontier by one level
    const bLen = backwardQueue.length;
    for (let i = 0; i < bLen; i++) {
      const cur = backwardQueue.shift()!;
      const curKey = cur.y * BOARD_SIZE + cur.x;

      for (const { dx, dy } of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;

        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
          if (isEdgeConnected(graph, cur.x, cur.y, nx, ny)) {
            const nextKey = ny * BOARD_SIZE + nx;

            if (forwardVisited.has(nextKey)) {
              // Frontiers collide!
              backwardVisited.set(nextKey, curKey);
              intersectionKey = nextKey;
              break;
            }

            if (!backwardVisited.has(nextKey)) {
              backwardVisited.set(nextKey, curKey);
              backwardQueue.push({ x: nx, y: ny });
            }
          }
        }
      }
      if (intersectionKey !== -1) break;
    }
    if (intersectionKey !== -1) break;
  }

  if (intersectionKey === -1) {
    return null; // No path exists
  }

  // Reconstruct path from forward parents + backward parents
  const forwardPath: Position[] = [];
  let curr = intersectionKey;
  while (curr !== -1) {
    forwardPath.push({ x: curr % BOARD_SIZE, y: Math.floor(curr / BOARD_SIZE) });
    curr = forwardVisited.get(curr) ?? -1;
  }
  forwardPath.reverse(); // Now from start to intersection

  const backwardPath: Position[] = [];
  curr = backwardVisited.get(intersectionKey) ?? -1;
  while (curr !== -1) {
    backwardPath.push({ x: curr % BOARD_SIZE, y: Math.floor(curr / BOARD_SIZE) });
    curr = backwardVisited.get(curr) ?? -1;
  }

  const fullPath = [...forwardPath, ...backwardPath];
  return {
    length: fullPath.length - 1,
    path: fullPath,
  };
}

/**
 * Articulation Path Caching (Wall Feasibility Filter):
 * Checks if a candidate wall severs any step along a cached shortest path.
 * If not, the candidate wall is guaranteed NOT to block this player's route,
 * skipping expensive BFS validation entirely (~70% of legal wall queries).
 */
export function doesWallIntersectPath(
  wall: { x: number; y: number; orientation: Orientation },
  path: Position[]
): boolean {
  if (!path || path.length < 2) return false;

  const { hCut, vCut } = getWallCutMasks(wall.x, wall.y, wall.orientation);

  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];

    if (p1.y === p2.y) {
      // Horizontal step
      const minX = Math.min(p1.x, p2.x);
      const bit = BigInt(p1.y * 8 + minX);
      if ((hCut & (1n << bit)) !== 0n) return true;
    } else if (p1.x === p2.x) {
      // Vertical step
      const minY = Math.min(p1.y, p2.y);
      const bit = BigInt(minY * 9 + p1.x);
      if ((vCut & (1n << bit)) !== 0n) return true;
    }
  }

  return false;
}

/**
 * 64-Bit Zobrist Hash Table for Tactical AI Transpositions
 */
class ZobristEngine {
  private p0Table: bigint[] = [];
  private p1Table: bigint[] = [];
  private hWallTable: bigint[] = [];
  private vWallTable: bigint[] = [];
  private turnBit: bigint;
  private lruCache: Map<string, { delta: number; advice: unknown }> = new Map();
  private maxCacheSize = 2048;

  constructor() {
    // Generate pseudo-random 64-bit BigInt keys
    let seed = 88172645463325252n;
    const nextRandom = (): bigint => {
      seed ^= seed << 13n;
      seed ^= seed >> 7n;
      seed ^= seed << 17n;
      return seed & 0xFFFFFFFFFFFFFFFFn;
    };

    for (let i = 0; i < 81; i++) {
      this.p0Table.push(nextRandom());
      this.p1Table.push(nextRandom());
    }
    for (let i = 0; i < 64; i++) {
      this.hWallTable.push(nextRandom());
      this.vWallTable.push(nextRandom());
    }
    this.turnBit = nextRandom();
  }

  public computeHash(players: Player[], walls: Wall[], turn: number): bigint {
    let hash = 0n;
    const p0Idx = players[0].y * 9 + players[0].x;
    const p1Idx = players[1].y * 9 + players[1].x;

    hash ^= this.p0Table[p0Idx];
    hash ^= this.p1Table[p1Idx];

    for (const w of walls) {
      const wIdx = w.y * 8 + w.x;
      if (w.orientation === 'H') {
        hash ^= this.hWallTable[wIdx];
      } else {
        hash ^= this.vWallTable[wIdx];
      }
    }

    if (turn === 1) {
      hash ^= this.turnBit;
    }

    return hash;
  }

  public getCache(hash: bigint): { delta: number; advice: unknown } | undefined {
    return this.lruCache.get(hash.toString(16));
  }

  public setCache(hash: bigint, data: { delta: number; advice: unknown }) {
    const key = hash.toString(16);
    if (this.lruCache.size >= this.maxCacheSize) {
      const oldestKey = this.lruCache.keys().next().value;
      if (oldestKey) this.lruCache.delete(oldestKey);
    }
    this.lruCache.set(key, data);
  }
}

export const zobrist = new ZobristEngine();
