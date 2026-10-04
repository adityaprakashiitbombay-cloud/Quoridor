import {
  DotsBoardSize,
  DotsPlayer,
  DotsGameState,
  DotsMoveRecord,
  DotsTheme,
} from '../types/game';

export interface LineCoord {
  lineType: 'h' | 'v';
  r: number;
  c: number;
}

export interface BoxCoord {
  r: number;
  c: number;
}

/**
 * Initialize an empty Dots and Boxes game state
 */
export function createInitialDotsState(
  gridSize: DotsBoardSize = 3,
  players: DotsPlayer[],
  theme: DotsTheme = 'streetwear',
  isTimerEnabled: boolean = true,
  timerSeconds: number = 30
): DotsGameState {
  const hLines: boolean[][] = Array.from({ length: gridSize + 1 }, () =>
    Array(gridSize).fill(false)
  );
  const vLines: boolean[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize + 1).fill(false)
  );
  const boxes: (number | null)[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(null)
  );

  return {
    gridSize,
    players: players.map((p) => ({ ...p, score: 0 })),
    currentTurn: 0,
    hLines,
    vLines,
    boxes,
    winner: null,
    moveHistory: [],
    isDoubleCrossActive: false,
    theme,
    timerSeconds,
    isTimerEnabled,
    gamePhase: 'playing',
  };
}

/**
 * Validate if a line coordinate is within bounds and not yet drawn
 */
export function isLineLegal(
  state: DotsGameState,
  lineType: 'h' | 'v',
  r: number,
  c: number
): boolean {
  if (state.winner !== null) return false;

  if (lineType === 'h') {
    if (r < 0 || r > state.gridSize || c < 0 || c >= state.gridSize) return false;
    return !state.hLines[r][c];
  } else {
    if (r < 0 || r >= state.gridSize || c < 0 || c > state.gridSize) return false;
    return !state.vLines[r][c];
  }
}

/**
 * Check how many of the 4 walls of box (r, c) are currently drawn
 */
export function countBoxWalls(
  state: DotsGameState,
  r: number,
  c: number
): number {
  if (r < 0 || r >= state.gridSize || c < 0 || c >= state.gridSize) return 0;
  let count = 0;
  if (state.hLines[r][c]) count++; // Top
  if (state.hLines[r + 1][c]) count++; // Bottom
  if (state.vLines[r][c]) count++; // Left
  if (state.vLines[r][c + 1]) count++; // Right
  return count;
}

/**
 * Find which adjacent boxes would be closed by placing line (lineType, r, c)
 */
export function getBoxesClosedByLine(
  state: DotsGameState,
  lineType: 'h' | 'v',
  r: number,
  c: number
): BoxCoord[] {
  const completed: BoxCoord[] = [];

  if (lineType === 'h') {
    // Box above: (r - 1, c)
    if (r > 0) {
      const top = state.hLines[r - 1][c];
      const left = state.vLines[r - 1][c];
      const right = state.vLines[r - 1][c + 1];
      // bottom is this line
      if (top && left && right) {
        completed.push({ r: r - 1, c });
      }
    }
    // Box below: (r, c)
    if (r < state.gridSize) {
      const bottom = state.hLines[r + 1][c];
      const left = state.vLines[r][c];
      const right = state.vLines[r][c + 1];
      // top is this line
      if (bottom && left && right) {
        completed.push({ r, c });
      }
    }
  } else {
    // Box left: (r, c - 1)
    if (c > 0) {
      const top = state.hLines[r][c - 1];
      const bottom = state.hLines[r + 1][c - 1];
      const left = state.vLines[r][c - 1];
      // right is this line
      if (top && bottom && left) {
        completed.push({ r, c: c - 1 });
      }
    }
    // Box right: (r, c)
    if (c < state.gridSize) {
      const top = state.hLines[r][c];
      const bottom = state.hLines[r + 1][c];
      const right = state.vLines[r][c + 1];
      // left is this line
      if (top && bottom && right) {
        completed.push({ r, c });
      }
    }
  }

  return completed;
}

/**
 * Execute a move on the Dots and Boxes state.
 * Returns the updated state.
 * Rules:
 * - If a line closes 1 or 2 boxes, current player earns 1 or 2 points and gets ANOTHER turn.
 * - If no box closed, turn advances to next player.
 * - When all boxes are claimed, winner is calculated.
 */
export function playLine(
  state: DotsGameState,
  lineType: 'h' | 'v',
  r: number,
  c: number,
  isDoubleCross: boolean = false
): DotsGameState {
  if (!isLineLegal(state, lineType, r, c)) {
    return state;
  }

  // Clone lines and boxes
  const newHLines = state.hLines.map((row) => [...row]);
  const newVLines = state.vLines.map((row) => [...row]);
  const newBoxes = state.boxes.map((row) => [...row]);
  const newPlayers = state.players.map((p) => ({ ...p }));

  // Mark line as drawn
  if (lineType === 'h') {
    newHLines[r][c] = true;
  } else {
    newVLines[r][c] = true;
  }

  // Check which boxes were completed
  const simState: DotsGameState = {
    ...state,
    hLines: newHLines,
    vLines: newVLines,
    boxes: newBoxes,
  };

  const closedBoxes: BoxCoord[] = [];
  if (lineType === 'h') {
    if (r > 0 && countBoxWalls(simState, r - 1, c) === 4 && newBoxes[r - 1][c] === null) {
      closedBoxes.push({ r: r - 1, c });
    }
    if (r < state.gridSize && countBoxWalls(simState, r, c) === 4 && newBoxes[r][c] === null) {
      closedBoxes.push({ r, c });
    }
  } else {
    if (c > 0 && countBoxWalls(simState, r, c - 1) === 4 && newBoxes[r][c - 1] === null) {
      closedBoxes.push({ r, c: c - 1 });
    }
    if (c < state.gridSize && countBoxWalls(simState, r, c) === 4 && newBoxes[r][c] === null) {
      closedBoxes.push({ r, c });
    }
  }

  const boxesCompletedCount = closedBoxes.length;
  let nextTurn = state.currentTurn;

  if (boxesCompletedCount > 0) {
    // Current player claims the closed boxes
    for (const b of closedBoxes) {
      newBoxes[b.r][b.c] = state.currentTurn;
    }
    newPlayers[state.currentTurn].score += boxesCompletedCount;
    // When you close a box, you must move again!
    nextTurn = state.currentTurn;
  } else {
    // Advance turn to next player
    nextTurn = (state.currentTurn + 1) % state.players.length;
  }

  // Record move
  const moveRecord: DotsMoveRecord = {
    lineType,
    r,
    c,
    playerIndex: state.currentTurn,
    boxesCompleted: boxesCompletedCount,
    isDoubleCross,
    timestamp: Date.now(),
  };

  const newMoveHistory = [...state.moveHistory, moveRecord];

  // Check Game Over: all boxes claimed
  const totalBoxes = state.gridSize * state.gridSize;
  let claimedBoxesCount = 0;
  for (let row = 0; row < state.gridSize; row++) {
    for (let col = 0; col < state.gridSize; col++) {
      if (newBoxes[row][col] !== null) claimedBoxesCount++;
    }
  }

  let winner: number | 'draw' | null = null;
  let gamePhase: 'playing' | 'gameover' = 'playing';

  if (claimedBoxesCount === totalBoxes) {
    gamePhase = 'gameover';
    // Find player(s) with highest score
    let highestScore = -1;
    let winners: number[] = [];
    newPlayers.forEach((p, idx) => {
      if (p.score > highestScore) {
        highestScore = p.score;
        winners = [idx];
      } else if (p.score === highestScore) {
        winners.push(idx);
      }
    });

    if (winners.length === 1) {
      winner = winners[0];
    } else {
      winner = 'draw';
    }
  }

  return {
    ...state,
    hLines: newHLines,
    vLines: newVLines,
    boxes: newBoxes,
    players: newPlayers,
    currentTurn: nextTurn,
    moveHistory: newMoveHistory,
    winner,
    gamePhase,
    isDoubleCrossActive: isDoubleCross,
  };
}

/**
 * Get all available legal lines
 */
export function getAllLegalLines(state: DotsGameState): LineCoord[] {
  const lines: LineCoord[] = [];

  // Horizontal lines: (gridSize + 1) rows, gridSize cols
  for (let r = 0; r <= state.gridSize; r++) {
    for (let c = 0; c < state.gridSize; c++) {
      if (!state.hLines[r][c]) {
        lines.push({ lineType: 'h', r, c });
      }
    }
  }

  // Vertical lines: gridSize rows, (gridSize + 1) cols
  for (let r = 0; r < state.gridSize; r++) {
    for (let c = 0; c <= state.gridSize; c++) {
      if (!state.vLines[r][c]) {
        lines.push({ lineType: 'v', r, c });
      }
    }
  }

  return lines;
}

/**
 * Categorize all legal moves for tactical analysis:
 * - completingMoves: lines that finish 1 or 2 boxes
 * - safeMoves: lines that do NOT leave any box with 3 walls (safe to play)
 * - sacrificeMoves: lines that create a 3rd wall on a box (hands boxes to opponent)
 */
export function categorizeMoves(state: DotsGameState): {
  completingMoves: LineCoord[];
  safeMoves: LineCoord[];
  sacrificeMoves: LineCoord[];
} {
  const legal = getAllLegalLines(state);
  const completingMoves: LineCoord[] = [];
  const safeMoves: LineCoord[] = [];
  const sacrificeMoves: LineCoord[] = [];

  for (const move of legal) {
    const closed = getBoxesClosedByLine(state, move.lineType, move.r, move.c);
    if (closed.length > 0) {
      completingMoves.push(move);
      continue;
    }

    // Simulate placing line
    const simHLines = state.hLines.map((row) => [...row]);
    const simVLines = state.vLines.map((row) => [...row]);
    if (move.lineType === 'h') {
      simHLines[move.r][move.c] = true;
    } else {
      simVLines[move.r][move.c] = true;
    }

    const simState = { ...state, hLines: simHLines, vLines: simVLines };

    // Check adjacent boxes for 3 walls
    let creates3rdWall = false;
    if (move.lineType === 'h') {
      if (move.r > 0 && countBoxWalls(simState, move.r - 1, move.c) === 3) creates3rdWall = true;
      if (move.r < state.gridSize && countBoxWalls(simState, move.r, move.c) === 3) creates3rdWall = true;
    } else {
      if (move.c > 0 && countBoxWalls(simState, move.r, move.c - 1) === 3) creates3rdWall = true;
      if (move.c < state.gridSize && countBoxWalls(simState, move.r, move.c) === 3) creates3rdWall = true;
    }

    if (creates3rdWall) {
      sacrificeMoves.push(move);
    } else {
      safeMoves.push(move);
    }
  }

  return { completingMoves, safeMoves, sacrificeMoves };
}
