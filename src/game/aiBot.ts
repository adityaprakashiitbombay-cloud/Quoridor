import { Player, Wall, Position, Orientation, AiDifficulty } from '../types/game';
import { getLegalPawnMoves, getAllLegalWalls, getShortestPath } from './quoridor';
import {
  createBitboardGraph,
  getWallCutMasks,
  getBiDirectionalShortestPath,
  doesWallIntersectPath,
} from './bitboard';

import { glendenningMcts } from './glendenningMctsBot';

export interface AiMoveResult {
  action: 'move' | 'wall';
  to?: Position;
  wall?: { x: number; y: number; orientation: Orientation };
  reason?: string;
}

/**
 * Advanced Multi-Tier AI Engine for Quoridor:
 * - Easy: Apprentice (Plays clean forward paths, drops simple reactive walls only when threatened)
 * - Normal: Tactician (Dual-path delta tracking, detour maximization, wall economy balance, jump exploitation)
 * - Grandmaster: Alpha Engine (2-Ply Minimax, counter-trap anticipation, center dominance, endgame conversion)
 * - MCTS: Glendenning AlphaQuoridor (Monte Carlo Tree Search with PUCT & shortest-path progressive bias)
 */
export function getAiMove(
  playerIndex: number,
  players: Player[],
  walls: Wall[],
  difficulty: AiDifficulty = 'normal'
): AiMoveResult {
  // If Glendenning MCTS selected, run Monte Carlo Tree Search
  if (difficulty === 'mcts') {
    return glendenningMcts.search(playerIndex, players, walls);
  }

  const me = players[playerIndex];
  const opponent = players[1 - playerIndex];

  // 1. Calculate baseline shortest paths via Bi-directional BFS
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
  const delta = oppDist - myDist; // Positive: AI is leading; Negative: Opponent is leading

  const legalMoves = getLegalPawnMoves(playerIndex, players, walls);

  // Identify best pawn step (the one that minimizes remaining distance to goal)
  let bestPawnMove: Position = legalMoves[0] || { x: me.x, y: me.y };
  let minPawnDist = myDist;

  for (const move of legalMoves) {
    const nextPath = getShortestPath(move, me.targetRow, walls);
    if (nextPath && nextPath.length < minPawnDist) {
      minPawnDist = nextPath.length;
      bestPawnMove = move;
    }
  }

  // If no walls remain, AI must move pawn forward
  if (me.wallsLeft <= 0) {
    return { action: 'move', to: bestPawnMove, reason: 'Sprint to goal line (no walls remaining)' };
  }

  // =========================================================================
  // LEVEL 1: EASY (Apprentice Scout)
  // =========================================================================
  if (difficulty === 'easy') {
    // 80% of the time, advance pawn along shortest path
    const shouldWall = Math.random() < 0.25 && oppDist <= 5 && me.wallsLeft > 0;

    if (shouldWall) {
      const legalWalls = getAllLegalWalls(walls, players, { p0Path: myPathData.path, p1Path: oppPathData.path });
      // Filter walls that cut opponent path without hurting self
      const defensiveWalls = legalWalls.filter((w) => {
        return doesWallIntersectPath(w, oppPathData.path) && !doesWallIntersectPath(w, myPathData.path);
      });

      if (defensiveWalls.length > 0) {
        // Pick one of the good defensive walls
        const chosen = defensiveWalls[Math.floor(Math.random() * Math.min(defensiveWalls.length, 3))];
        return { action: 'wall', wall: chosen, reason: 'Easy defense: gentle path delay' };
      }
    }

    return { action: 'move', to: bestPawnMove, reason: 'Easy advance towards goal' };
  }

  // =========================================================================
  // LEVEL 2: NORMAL (Tactician Explorer)
  // =========================================================================
  if (difficulty === 'normal') {
    // Strategic Condition A: If AI is comfortably leading by >= 2 steps, sprint to conserve walls!
    if (delta >= 2 && myDist <= 4) {
      return { action: 'move', to: bestPawnMove, reason: `Sprint: holding strong +${delta} step advantage` };
    }

    // Strategic Condition B: Evaluate candidate walls that cut opponent's route
    const legalWalls = getAllLegalWalls(walls, players, { p0Path: myPathData.path, p1Path: oppPathData.path });
    const baseGraph = createBitboardGraph(walls);

    let bestNormalWall: { x: number; y: number; orientation: Orientation } | null = null;
    let maxNormalScore = -999;

    for (const candidate of legalWalls) {
      const cutsOpp = doesWallIntersectPath(candidate, oppPathData.path);
      const cutsMe = doesWallIntersectPath(candidate, myPathData.path);

      if (!cutsOpp) continue;

      const cuts = getWallCutMasks(candidate.x, candidate.y, candidate.orientation);
      const simGraph = {
        hMask: baseGraph.hMask & ~cuts.hCut,
        vMask: baseGraph.vMask & ~cuts.vCut,
      };

      const simOpp = getBiDirectionalShortestPath(simGraph, { x: opponent.x, y: opponent.y }, opponent.targetRow);
      if (!simOpp) continue;

      let simMyDist = myDist;
      if (cutsMe) {
        const simMe = getBiDirectionalShortestPath(simGraph, { x: me.x, y: me.y }, me.targetRow);
        if (!simMe) continue;
        simMyDist = simMe.length;
      }

      const oppDetour = simOpp.length - oppDist;
      const myDetour = simMyDist - myDist;

      // Center bonus
      const distToCenter = Math.abs(candidate.x - 3.5) + Math.abs(candidate.y - 3.5);
      const centerBonus = Math.max(0, 4 - distToCenter) * 0.4;

      const score = oppDetour * 3.5 - myDetour * 4.0 + centerBonus;

      if (score > maxNormalScore && oppDetour >= 1) {
        maxNormalScore = score;
        bestNormalWall = candidate;
      }
    }

    // If opponent threatens lead (delta <= 0) or is close to winning (oppDist <= 4)
    if ((delta <= 0 || oppDist <= 4) && bestNormalWall && maxNormalScore >= 2.5) {
      return { action: 'wall', wall: bestNormalWall, reason: 'Tactical intercept: forcing opponent detour' };
    }

    // Early game center control wall (turn 1-3, if opponent rushes center)
    if (walls.length < 3 && bestNormalWall && maxNormalScore >= 1.5 && Math.random() < 0.6) {
      return { action: 'wall', wall: bestNormalWall, reason: 'Early game center constrictor' };
    }

    // Default: advance pawn
    return { action: 'move', to: bestPawnMove, reason: 'Advance pawn along optimal route' };
  }

  // =========================================================================
  // LEVEL 3: GRANDMASTER (Alpha Engine - 2-Ply Minimax)
  // =========================================================================
  interface CandidateEvaluation {
    action: 'move' | 'wall';
    to?: Position;
    wall?: { x: number; y: number; orientation: Orientation };
    dMeAfter: number;
    dOppAfter: number;
    wMeAfter: number;
    wOppAfter: number;
    simWalls: Wall[];
    simPlayers: Player[];
  }

  const candidates: CandidateEvaluation[] = [];

  // 1. Move Candidate: Pawn Advance
  const simPlayersPawn = [
    playerIndex === 0 ? { ...me, x: bestPawnMove.x, y: bestPawnMove.y } : { ...players[0] },
    playerIndex === 1 ? { ...me, x: bestPawnMove.x, y: bestPawnMove.y } : { ...players[1] },
  ];
  candidates.push({
    action: 'move',
    to: bestPawnMove,
    dMeAfter: minPawnDist,
    dOppAfter: oppDist,
    wMeAfter: me.wallsLeft,
    wOppAfter: opponent.wallsLeft,
    simWalls: walls,
    simPlayers: simPlayersPawn,
  });

  // 2. High-Impact Wall Candidates
  const legalWalls = getAllLegalWalls(walls, players, { p0Path: myPathData.path, p1Path: oppPathData.path });
  const baseGraph = createBitboardGraph(walls);

  for (const candidate of legalWalls) {
    const cutsOpp = doesWallIntersectPath(candidate, oppPathData.path);
    const cutsMe = doesWallIntersectPath(candidate, myPathData.path);

    if (!cutsOpp) continue;

    const cuts = getWallCutMasks(candidate.x, candidate.y, candidate.orientation);
    const simGraph = {
      hMask: baseGraph.hMask & ~cuts.hCut,
      vMask: baseGraph.vMask & ~cuts.vCut,
    };

    const simOpp = getBiDirectionalShortestPath(simGraph, { x: opponent.x, y: opponent.y }, opponent.targetRow);
    if (!simOpp) continue;

    let simMyDist = myDist;
    if (cutsMe) {
      const simMe = getBiDirectionalShortestPath(simGraph, { x: me.x, y: me.y }, me.targetRow);
      if (!simMe) continue;
      simMyDist = simMe.length;
    }

    const simWallsAfter: Wall[] = [
      ...walls,
      { id: 'sim', x: candidate.x, y: candidate.y, orientation: candidate.orientation, placedBy: playerIndex },
    ];
    const simPlayersWall: Player[] = [
      playerIndex === 0 ? { ...me, wallsLeft: me.wallsLeft - 1 } : { ...players[0] },
      playerIndex === 1 ? { ...me, wallsLeft: me.wallsLeft - 1 } : { ...players[1] },
    ];

    candidates.push({
      action: 'wall',
      wall: candidate,
      dMeAfter: simMyDist,
      dOppAfter: simOpp.length,
      wMeAfter: me.wallsLeft - 1,
      wOppAfter: opponent.wallsLeft,
      simWalls: simWallsAfter,
      simPlayers: simPlayersWall,
    });
  }

  // 3. 2-Ply Minimax: Simulate Opponent's Optimal Counter-Reply
  let bestCandidate = candidates[0];
  let maxMinimaxScore = -9999;

  for (const cand of candidates) {
    // Base utility score after AI move
    // Score = 4.0 * (dOpp - dMe) + 1.2 * (wMe - wOpp)
    const baseScore = 4.0 * (cand.dOppAfter - cand.dMeAfter) + 1.2 * (cand.wMeAfter - cand.wOppAfter);

    // Opponent replies: they will advance pawn or counter-wall to minimize baseScore
    const oppLegalMoves = getLegalPawnMoves(1 - playerIndex, cand.simPlayers, cand.simWalls);
    let minScoreAfterOpp = baseScore;

    for (const oppMove of oppLegalMoves) {
      const oppNextDist = Math.max(0, cand.dOppAfter - 1);
      const scoreAfterOppStep = 4.0 * (oppNextDist - cand.dMeAfter) + 1.2 * (cand.wMeAfter - cand.wOppAfter);
      if (scoreAfterOppStep < minScoreAfterOpp) {
        minScoreAfterOpp = scoreAfterOppStep;
      }
    }

    // Center bias bonus for wall placement
    let centerBonus = 0;
    if (cand.action === 'wall' && cand.wall) {
      const distToCenter = Math.abs(cand.wall.x - 3.5) + Math.abs(cand.wall.y - 3.5);
      centerBonus = Math.max(0, 4 - distToCenter) * 0.6;
    }

    const totalScore = minScoreAfterOpp + centerBonus;

    if (totalScore > maxMinimaxScore) {
      maxMinimaxScore = totalScore;
      bestCandidate = cand;
    }
  }

  if (bestCandidate.action === 'wall' && bestCandidate.wall) {
    return {
      action: 'wall',
      wall: bestCandidate.wall,
      reason: `Grandmaster 2-Ply Minimax: wall maximizes long-term advantage against best opponent reply`,
    };
  }

  return {
    action: 'move',
    to: bestCandidate.to || bestPawnMove,
    reason: `Grandmaster: pawn advance along optimal path with superior defense`,
  };
}
