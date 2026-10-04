import { DotsGameState, DotsAiDifficulty } from '../types/game';
import {
  LineCoord,
  getAllLegalLines,
  categorizeMoves,
  countBoxWalls,
  getBoxesClosedByLine,
  playLine,
} from './dotsAndBoxes';

export interface DotsAiDecision {
  move: LineCoord;
  isDoubleCross?: boolean;
  reason: string;
}

/**
 * Detect chains of capturable boxes and connected components
 */
export interface ChainInfo {
  length: number;
  boxCoords: { r: number; c: number }[];
  isLoop: boolean;
}

/**
 * Find all chains of boxes that can currently be run/captured
 */
export function detectCapturableChains(state: DotsGameState): ChainInfo[] {
  const chains: ChainInfo[] = [];
  const visitedBoxes = new Set<string>();

  for (let r = 0; r < state.gridSize; r++) {
    for (let c = 0; c < state.gridSize; c++) {
      const key = `${r},${c}`;
      if (visitedBoxes.has(key) || state.boxes[r][c] !== null) continue;

      if (countBoxWalls(state, r, c) === 3) {
        // Start tracing this chain
        const chainBoxes: { r: number; c: number }[] = [];
        let currentR = r;
        let currentC = c;

        // Traverse connected 3-wall or 2-wall boxes
        const q: { r: number; c: number }[] = [{ r: currentR, c: currentC }];
        visitedBoxes.add(key);

        while (q.length > 0) {
          const curr = q.shift()!;
          chainBoxes.push(curr);

          // Check 4 neighbors
          const neighbors = [
            { r: curr.r - 1, c: curr.c }, // top
            { r: curr.r + 1, c: curr.c }, // bottom
            { r: curr.r, c: curr.c - 1 }, // left
            { r: curr.r, c: curr.c + 1 }, // right
          ];

          for (const n of neighbors) {
            const nKey = `${n.r},${n.c}`;
            if (
              n.r >= 0 &&
              n.r < state.gridSize &&
              n.c >= 0 &&
              n.c < state.gridSize &&
              !visitedBoxes.has(nKey) &&
              state.boxes[n.r][n.c] === null
            ) {
              const walls = countBoxWalls(state, n.r, n.c);
              if (walls >= 2) {
                visitedBoxes.add(nKey);
                q.push(n);
              }
            }
          }
        }

        chains.push({
          length: chainBoxes.length,
          boxCoords: chainBoxes,
          isLoop: false,
        });
      }
    }
  }

  return chains;
}

/**
 * Main Dots and Boxes AI Decision Function
 */
export function getDotsAiMove(
  state: DotsGameState,
  difficulty: DotsAiDifficulty = 'medium'
): DotsAiDecision {
  const legal = getAllLegalLines(state);
  if (legal.length === 0) {
    return {
      move: { lineType: 'h', r: 0, c: 0 },
      reason: 'No legal moves remaining',
    };
  }

  const { completingMoves, safeMoves, sacrificeMoves } = categorizeMoves(state);

  // =========================================================================
  // LEVEL 1: EASY (Casual Apprentice)
  // =========================================================================
  if (difficulty === 'easy') {
    // 75% chance to claim box if available
    if (completingMoves.length > 0 && Math.random() < 0.75) {
      const chosen = completingMoves[Math.floor(Math.random() * completingMoves.length)];
      return { move: chosen, reason: 'Easy AI claims open box' };
    }
    // Otherwise pick from safe moves if possible, else random
    if (safeMoves.length > 0 && Math.random() < 0.6) {
      const chosen = safeMoves[Math.floor(Math.random() * safeMoves.length)];
      return { move: chosen, reason: 'Easy AI plays casual safe line' };
    }
    const chosen = legal[Math.floor(Math.random() * legal.length)];
    return { move: chosen, reason: 'Easy AI plays random line' };
  }

  // =========================================================================
  // LEVEL 2: MEDIUM (Tactician)
  // =========================================================================
  if (difficulty === 'medium') {
    // 1. Take any available completing move
    if (completingMoves.length > 0) {
      // Pick move that closes 2 boxes if available
      const doubleBox = completingMoves.find(
        (m) => getBoxesClosedByLine(state, m.lineType, m.r, m.c).length === 2
      );
      const chosen = doubleBox || completingMoves[0];
      return { move: chosen, reason: 'Tactician AI captures available box' };
    }

    // 2. Play from safe moves
    if (safeMoves.length > 0) {
      // Center preference
      const center = state.gridSize / 2;
      safeMoves.sort((a, b) => {
        const distA = Math.abs(a.r - center) + Math.abs(a.c - center);
        const distB = Math.abs(b.r - center) + Math.abs(b.c - center);
        return distA - distB;
      });
      return { move: safeMoves[0], reason: 'Tactician AI plays strategic safe line' };
    }

    // 3. Forced sacrifice: pick line that gives away the smallest territory
    if (sacrificeMoves.length > 0) {
      const chosen = sacrificeMoves[Math.floor(Math.random() * sacrificeMoves.length)];
      return { move: chosen, reason: 'Tactician AI forced sacrifice' };
    }

    return { move: legal[0], reason: 'Tactician default move' };
  }

  // =========================================================================
  // LEVEL 3: HARD (Minimax Chain Master)
  // =========================================================================
  if (difficulty === 'hard') {
    // 1. Always claim boxes
    if (completingMoves.length > 0) {
      const doubleBox = completingMoves.find(
        (m) => getBoxesClosedByLine(state, m.lineType, m.r, m.c).length === 2
      );
      const chosen = doubleBox || completingMoves[0];
      return { move: chosen, reason: 'Hard AI captures box along chain' };
    }

    // 2. Safe moves with alpha-beta lookahead
    if (safeMoves.length > 0) {
      let bestSafe = safeMoves[0];
      let maxScore = -999;

      for (const m of safeMoves) {
        const nextState = playLine(state, m.lineType, m.r, m.c);
        const nextCat = categorizeMoves(nextState);
        // Score = number of safe moves left for us - safe moves for opponent
        const score = nextCat.safeMoves.length - nextCat.sacrificeMoves.length * 2;
        if (score > maxScore) {
          maxScore = score;
          bestSafe = m;
        }
      }
      return { move: bestSafe, reason: 'Hard AI minimizes opponent chain opportunities' };
    }

    // 3. Forced sacrifice: evaluate which sacrifice gives fewest boxes
    if (sacrificeMoves.length > 0) {
      let minDamage = 999;
      let bestSacrifice = sacrificeMoves[0];

      for (const m of sacrificeMoves) {
        const nextState = playLine(state, m.lineType, m.r, m.c);
        const nextCat = categorizeMoves(nextState);
        const damage = nextCat.completingMoves.length;
        if (damage < minDamage) {
          minDamage = damage;
          bestSacrifice = m;
        }
      }
      return { move: bestSacrifice, reason: `Hard AI minimizes giveaway to ${minDamage} boxes` };
    }

    return { move: legal[0], reason: 'Hard AI default move' };
  }

  // =========================================================================
  // LEVEL 4: MASTER (Arjun-G Double-Cross Grandmaster)
  // =========================================================================
  // Mathematical Double-Cross Strategy:
  // When running a chain of 3 or more boxes, on the last 2 boxes, do NOT take them.
  // Instead, execute a "Double-Cross": draw the internal dividing wall between them,
  // giving the 2 boxes to the opponent. The opponent is forced to take them, and then
  // the opponent is forced to make the next move, opening the next long chain for YOU!

  const chains = detectCapturableChains(state);
  const activeChain = chains.find((c) => c.length >= 3);

  // If we have a long chain with only 2 boxes remaining to claim
  if (activeChain && completingMoves.length === 2 && safeMoves.length === 0) {
    // Check if there are remaining unopened chains on the board
    const remainingUnclaimed = state.boxes.flat().filter((b) => b === null).length;

    // If remaining unclaimed boxes > 4, executing a Double-Cross sacrifice is game-winning!
    if (remainingUnclaimed > 4) {
      // Find the dividing line between the two remaining boxes in the chain
      const box1 = activeChain.boxCoords[activeChain.boxCoords.length - 2];
      const box2 = activeChain.boxCoords[activeChain.boxCoords.length - 1];

      if (box1 && box2) {
        // If adjacent horizontally
        if (box1.r === box2.r && Math.abs(box1.c - box2.c) === 1) {
          const divC = Math.max(box1.c, box2.c);
          if (!state.vLines[box1.r][divC]) {
            return {
              move: { lineType: 'v', r: box1.r, c: divC },
              isDoubleCross: true,
              reason: 'Double-Cross: Sacrificing 2 boxes to force opponent to open remaining long chains!',
            };
          }
        }
        // If adjacent vertically
        if (box1.c === box2.c && Math.abs(box1.r - box2.r) === 1) {
          const divR = Math.max(box1.r, box2.r);
          if (!state.hLines[divR][box1.c]) {
            return {
              move: { lineType: 'h', r: divR, c: box1.c },
              isDoubleCross: true,
              reason: 'Double-Cross: Sacrificing 2 boxes to retain endgame tempo!',
            };
          }
        }
      }
    }
  }

  // If completing moves available, take the best box
  if (completingMoves.length > 0) {
    const doubleBox = completingMoves.find(
      (m) => getBoxesClosedByLine(state, m.lineType, m.r, m.c).length === 2
    );
    const chosen = doubleBox || completingMoves[0];
    return { move: chosen, reason: 'Master AI claims box in sequence' };
  }

  // If safe moves available, play the move that controls parity and board control
  if (safeMoves.length > 0) {
    let bestSafe = safeMoves[0];
    let bestScore = -9999;

    for (const m of safeMoves) {
      const nextState = playLine(state, m.lineType, m.r, m.c);
      const nextCat = categorizeMoves(nextState);
      // Favour lines that do not decrease our safe moves
      const score = nextCat.safeMoves.length * 3 - nextCat.sacrificeMoves.length * 4;
      if (score > bestScore) {
        bestScore = score;
        bestSafe = m;
      }
    }
    return { move: bestSafe, reason: 'Master AI controls chain parity and tempo' };
  }

  // Forced sacrifice: give away the shortest chain to opponent
  if (sacrificeMoves.length > 0) {
    let minOppGain = 999;
    let bestSac = sacrificeMoves[0];

    for (const m of sacrificeMoves) {
      const nextState = playLine(state, m.lineType, m.r, m.c);
      const nextCat = categorizeMoves(nextState);
      const oppImmediateBoxes = nextCat.completingMoves.length;
      if (oppImmediateBoxes < minOppGain) {
        minOppGain = oppImmediateBoxes;
        bestSac = m;
      }
    }
    return {
      move: bestSac,
      reason: `Master AI forced sacrifice: giving away minimum ${minOppGain} boxes`,
    };
  }

  return { move: legal[0], reason: 'Master AI default move' };
}
