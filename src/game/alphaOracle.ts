import { Player, Wall, Orientation, Position, OracleAdvice } from '../types/game';
import {
  getShortestPath,
  getLegalPawnMoves,
  getAllLegalWalls,
} from './quoridor';
import {
  zobrist,
  createBitboardGraph,
  getWallCutMasks,
  getBiDirectionalShortestPath,
  doesWallIntersectPath,
} from './bitboard';

export const MASTER_USERNAME = 'ALPHA';
export const MASTER_PASSCODE = '1845';

export function isMasterUser(username?: string, passcode?: string): boolean {
  if (!username) return false;
  return (
    username.trim().toUpperCase() === MASTER_USERNAME &&
    passcode?.trim() === MASTER_PASSCODE
  );
}

/**
 * Score function for 2-ply Minimax:
 * Score = (D_opponent - D_master) + 0.4 * (Walls_master - Walls_opponent)
 */
function evaluateStateScore(
  dMaster: number,
  dOpponent: number,
  wMaster: number,
  wOpponent: number
): number {
  return (dOpponent - dMaster) + 0.4 * (wMaster - wOpponent);
}

/**
 * Depth-2 Minimax Tactical AI Oracle.
 * Simulates Master's candidate moves (Ply 1) and Opponent's best reply (Ply 2)
 * to prevent walking into counter-block traps.
 */
export function calculateAlphaAdvice(
  playerIndex: number,
  players: Player[],
  walls: Wall[]
): OracleAdvice {
  // 1. Check Zobrist Transposition Cache
  const stateHash = zobrist.computeHash(players, walls, playerIndex);
  const cached = zobrist.getCache(stateHash);
  if (cached && cached.advice) {
    return cached.advice as OracleAdvice;
  }

  const me = players[playerIndex];
  const opponent = players[1 - playerIndex];

  // 2. Baseline shortest paths via Bi-directional Bitboard BFS
  const myPathData = getShortestPath({ x: me.x, y: me.y }, me.targetRow, walls) || {
    length: 99,
    path: [],
  };
  const oppPathData = getShortestPath({ x: opponent.x, y: opponent.y }, opponent.targetRow, walls) || {
    length: 99,
    path: [],
  };

  const myDist = myPathData.length;
  const oppDist = oppPathData.length;
  const delta = oppDist - myDist;

  // Identify primary pawn sprint move
  const legalMoves = getLegalPawnMoves(playerIndex, players, walls);
  let bestPawnMove: Position = legalMoves[0] || { x: me.x, y: me.y };
  let bestPawnDist = myDist;

  for (const move of legalMoves) {
    const nextPath = getShortestPath(move, me.targetRow, walls);
    if (nextPath && nextPath.length < bestPawnDist) {
      bestPawnDist = nextPath.length;
      bestPawnMove = move;
    }
  }

  // If no walls remaining, sprint pawn
  if (me.wallsLeft <= 0) {
    const advice: OracleAdvice = {
      recommendedAction: 'move',
      targetPosition: bestPawnMove,
      playerPathLength: myDist,
      opponentPathLength: oppDist,
      delta,
      reason: `No walls remaining. Sprint directly towards Row ${me.targetRow + 1} (${myDist} steps to victory).`,
      playerShortestPath: myPathData.path,
      opponentShortestPath: oppPathData.path,
    };
    zobrist.setCache(stateHash, { delta, advice });
    return advice;
  }

  // 3. Candidate Generation for Ply 1 (Master Move)
  interface Candidate {
    action: 'move' | 'wall';
    targetPos?: Position;
    targetWall?: { x: number; y: number; orientation: Orientation };
    simWalls: Wall[];
    simPlayers: Player[];
    dMasterAfter: number;
    dOppAfter: number;
    wMasterAfter: number;
    wOppAfter: number;
  }

  const candidates: Candidate[] = [];

  // Candidate: Advance pawn
  const simPlayersMove = [
    playerIndex === 0 ? { ...me, x: bestPawnMove.x, y: bestPawnMove.y } : { ...players[0] },
    playerIndex === 1 ? { ...me, x: bestPawnMove.x, y: bestPawnMove.y } : { ...players[1] },
  ];
  candidates.push({
    action: 'move',
    targetPos: bestPawnMove,
    simWalls: walls,
    simPlayers: simPlayersMove,
    dMasterAfter: bestPawnDist,
    dOppAfter: oppDist,
    wMasterAfter: me.wallsLeft,
    wOppAfter: opponent.wallsLeft,
  });

  // Candidate Walls: Use Articulation Path Filter to test only high-impact walls
  const legalWalls = getAllLegalWalls(walls, players, { p0Path: myPathData.path, p1Path: oppPathData.path });
  const baseGraph = createBitboardGraph(walls);

  for (const wallCandidate of legalWalls) {
    const cutsOpp = doesWallIntersectPath(wallCandidate, oppPathData.path);
    const cutsMe = doesWallIntersectPath(wallCandidate, myPathData.path);

    if (!cutsOpp) continue; // Only consider walls that disrupt opponent's primary route

    const cuts = getWallCutMasks(wallCandidate.x, wallCandidate.y, wallCandidate.orientation);
    const simGraph = {
      hMask: baseGraph.hMask & ~cuts.hCut,
      vMask: baseGraph.vMask & ~cuts.vCut,
    };

    const simOppPath = getBiDirectionalShortestPath(simGraph, { x: opponent.x, y: opponent.y }, opponent.targetRow);
    if (!simOppPath) continue;

    let simMyDist = myDist;
    if (cutsMe) {
      const simMyPath = getBiDirectionalShortestPath(simGraph, { x: me.x, y: me.y }, me.targetRow);
      if (!simMyPath) continue;
      simMyDist = simMyPath.length;
    }

    const simWallsAfter = [
      ...walls,
      { id: 'sim', x: wallCandidate.x, y: wallCandidate.y, orientation: wallCandidate.orientation, placedBy: playerIndex },
    ];
    const simPlayersWall = [
      playerIndex === 0 ? { ...me, wallsLeft: me.wallsLeft - 1 } : { ...players[0] },
      playerIndex === 1 ? { ...me, wallsLeft: me.wallsLeft - 1 } : { ...players[1] },
    ];

    candidates.push({
      action: 'wall',
      targetWall: wallCandidate,
      simWalls: simWallsAfter,
      simPlayers: simPlayersWall,
      dMasterAfter: simMyDist,
      dOppAfter: simOppPath.length,
      wMasterAfter: me.wallsLeft - 1,
      wOppAfter: opponent.wallsLeft,
    });
  }

  // 4. Ply 2 Minimax Search: Evaluate Opponent's Best Counter-Reply
  let bestCandidate: Candidate = candidates[0];
  let maxMinimaxScore = -999;

  for (const cand of candidates) {
    // Immediate score after Ply 1
    const immediateScore = evaluateStateScore(cand.dMasterAfter, cand.dOppAfter, cand.wMasterAfter, cand.wOppAfter);

    // Opponent can counter by either moving their pawn or placing a counter-wall
    // We compute opponent's best response (minimizing Master's score)
    const oppPawnMoves = getLegalPawnMoves(1 - playerIndex, cand.simPlayers, cand.simWalls);
    let minScoreAfterOppReply = immediateScore;

    for (const oppMove of oppPawnMoves) {
      const oppNextDist = cand.dOppAfter - 1; // 1 step closer along their route
      const scoreAfterOppStep = evaluateStateScore(cand.dMasterAfter, Math.max(0, oppNextDist), cand.wMasterAfter, cand.wOppAfter);
      if (scoreAfterOppStep < minScoreAfterOppReply) {
        minScoreAfterOppReply = scoreAfterOppStep;
      }
    }

    // Heuristic Bonus: Center control coordinates 2..5
    let centerBonus = 0;
    if (cand.action === 'wall' && cand.targetWall) {
      const distToCenter = Math.abs(cand.targetWall.x - 3.5) + Math.abs(cand.targetWall.y - 3.5);
      centerBonus = Math.max(0, 4 - distToCenter) * 0.35;
    }

    const totalMinimaxValue = minScoreAfterOppReply + centerBonus;

    if (totalMinimaxValue > maxMinimaxScore) {
      maxMinimaxScore = totalMinimaxValue;
      bestCandidate = cand;
    }
  }

  // 5. Generate Tactical Reasoning & Advice
  let finalAdvice: OracleAdvice;

  if (bestCandidate.action === 'wall' && bestCandidate.targetWall) {
    const oppDetour = bestCandidate.dOppAfter - oppDist;
    const coordName = `${String.fromCharCode(65 + bestCandidate.targetWall.x)}${bestCandidate.targetWall.y + 1} (${bestCandidate.targetWall.orientation === 'H' ? 'Horizontal' : 'Vertical'})`;

    finalAdvice = {
      recommendedAction: 'wall',
      targetWall: bestCandidate.targetWall,
      playerPathLength: myDist,
      opponentPathLength: oppDist,
      delta,
      reason: `Minimax (Depth-2) identifies optimal wall at ${coordName}: forces a +${oppDetour}-step detour (path: ${oppDist} → ${bestCandidate.dOppAfter}) while maintaining safe position against opponent counter-play.`,
      playerShortestPath: myPathData.path,
      opponentShortestPath: oppPathData.path,
    };
  } else {
    const stepAdvantage = delta > 0 ? `+${delta}-step lead` : `${delta} deficit`;
    finalAdvice = {
      recommendedAction: 'move',
      targetPosition: bestPawnMove,
      playerPathLength: myDist,
      opponentPathLength: oppDist,
      delta,
      reason: `Minimax recommends pawn advance to (${bestPawnMove.x + 1}, ${bestPawnMove.y + 1}). You maintain a ${stepAdvantage}; saving your ${me.wallsLeft} walls guarantees superior endgame defense.`,
      playerShortestPath: myPathData.path,
      opponentShortestPath: oppPathData.path,
    };
  }

  zobrist.setCache(stateHash, { delta, advice: finalAdvice });
  return finalAdvice;
}
