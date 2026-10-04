import { MoveRecord, MoveQuality, ReviewedTurn, MatchAnalysis, Player, Wall } from '../types/game';
import { getShortestPath } from './quoridor';

/**
 * Calculates win probability based on path delta and wall economy:
 * Advantage = (D_opp - D_player) + 0.35 * (W_player - W_opp)
 * Win Probability = 1 / (1 + exp(-0.7 * Advantage))
 */
export function calculateWinProbability(
  dPlayer: number,
  dOpp: number,
  wPlayer: number,
  wOpp: number
): number {
  if (dPlayer <= 0) return 1.0;
  if (dOpp <= 0) return 0.0;

  const advantage = (dOpp - dPlayer) + 0.35 * (wPlayer - wOpp);
  const prob = 1 / (1 + Math.exp(-0.7 * advantage));
  return Math.max(0.02, Math.min(0.98, prob));
}

/**
 * Evaluates the entire match history and generates a Chess.com-style Game Review report.
 */
export function analyzeMatch(
  moveHistory: MoveRecord[],
  initialPlayers: Player[]
): MatchAnalysis {
  let simPlayers: Player[] = JSON.parse(JSON.stringify(initialPlayers));
  let simWalls: Wall[] = [];

  const reviewedTurns: ReviewedTurn[] = [];
  const p0Counts: Record<MoveQuality, number> = { brilliant: 0, great: 0, best: 0, inaccuracy: 0, blunder: 0 };
  const p1Counts: Record<MoveQuality, number> = { brilliant: 0, great: 0, best: 0, inaccuracy: 0, blunder: 0 };

  let maxSwing = 0;
  let clutchTurnIdx = 0;
  let clutchSummary = 'Balanced tactical engagement across all turns.';

  for (let i = 0; i < moveHistory.length; i++) {
    const move = moveHistory[i];
    const pIdx = move.playerIndex;
    const oppIdx = 1 - pIdx;

    const meBefore = simPlayers[pIdx];
    const oppBefore = simPlayers[oppIdx];

    // 1. Path metrics before move
    const pathMeBefore = getShortestPath({ x: meBefore.x, y: meBefore.y }, meBefore.targetRow, simWalls) || { length: 99, path: [] };
    const pathOppBefore = getShortestPath({ x: oppBefore.x, y: oppBefore.y }, oppBefore.targetRow, simWalls) || { length: 99, path: [] };

    const dMeBefore = pathMeBefore.length;
    const dOppBefore = pathOppBefore.length;
    const probBefore = calculateWinProbability(dMeBefore, dOppBefore, meBefore.wallsLeft, oppBefore.wallsLeft);

    // Snapshot board state before move
    const playersAtTurn = JSON.parse(JSON.stringify(simPlayers));
    const wallsAtTurn = JSON.parse(JSON.stringify(simWalls));

    // 2. Apply move
    if (move.type === 'move' && move.to) {
      simPlayers[pIdx] = { ...simPlayers[pIdx], x: move.to.x, y: move.to.y };
    } else if (move.type === 'wall' && move.wall) {
      simWalls.push(move.wall);
      simPlayers[pIdx] = { ...simPlayers[pIdx], wallsLeft: simPlayers[pIdx].wallsLeft - 1 };
    }

    const meAfter = simPlayers[pIdx];
    const oppAfter = simPlayers[oppIdx];

    // 3. Path metrics after move
    const pathMeAfter = getShortestPath({ x: meAfter.x, y: meAfter.y }, meAfter.targetRow, simWalls) || { length: 99, path: [] };
    const pathOppAfter = getShortestPath({ x: oppAfter.x, y: oppAfter.y }, oppAfter.targetRow, simWalls) || { length: 99, path: [] };

    const dMeAfter = pathMeAfter.length;
    const dOppAfter = pathOppAfter.length;
    const probAfter = calculateWinProbability(dMeAfter, dOppAfter, meAfter.wallsLeft, oppAfter.wallsLeft);
    const probDelta = probAfter - probBefore;

    // 4. Classify move quality
    let quality: MoveQuality = 'best';
    let qualitySymbol = 'Best';
    let explanation = '';

    const oppDetourAdded = dOppAfter - dOppBefore;
    const selfDetourAdded = dMeAfter - dMeBefore;

    if (move.type === 'wall') {
      // Brilliant (!!): Wall that adds >= 4 steps detour with zero self-harm
      if (oppDetourAdded >= 4 && selfDetourAdded <= 0) {
        quality = 'brilliant';
        qualitySymbol = '!!';
        explanation = `Brilliant! Devastating wall inflicts massive +${oppDetourAdded}-step detour on opponent while preserving own sprint.`;
      }
      // Great (!): Wall adds >= 2 steps detour with zero self-harm
      else if (oppDetourAdded >= 2 && selfDetourAdded <= 0) {
        quality = 'great';
        qualitySymbol = '!';
        explanation = `Great move! Strong wall adds +${oppDetourAdded} steps to opponent's shortest route.`;
      }
      // Blunder (??): Wall adds 0 detour to opponent or increases self-distance
      else if (selfDetourAdded > 0 || oppDetourAdded < 0) {
        quality = 'blunder';
        qualitySymbol = '??';
        explanation = `Blunder! Wall inadvertently boxes yourself in (+${selfDetourAdded} self-detour) or wastes wall economy.`;
      }
      // Inaccuracy (?): Placed a wall when pawn advance was already leading by >= 3 steps
      else if (dMeBefore < dOppBefore - 2 && oppDetourAdded <= 1) {
        quality = 'inaccuracy';
        qualitySymbol = '?';
        explanation = `Inaccuracy: You already held a safe +${dOppBefore - dMeBefore}-step lead. Direct pawn sprint was faster.`;
      } else {
        quality = 'best';
        qualitySymbol = 'Best';
        explanation = `Solid wall placement maintaining board control.`;
      }
    } else {
      // Pawn Move Classification
      if (dMeAfter < dMeBefore) {
        // Advanced along shortest path
        if (probDelta >= 0.15) {
          quality = 'great';
          qualitySymbol = '!';
          explanation = `Decisive advance! Seizes key tempo as goal line approaches.`;
        } else {
          quality = 'best';
          qualitySymbol = 'Best';
          explanation = `Optimal step advancing along the fastest corridor.`;
        }
      } else if (dMeAfter === dMeBefore) {
        // Lateral step without progress
        quality = 'inaccuracy';
        qualitySymbol = '?';
        explanation = `Inaccuracy: Lateral pawn move didn't shorten distance to goal row.`;
      } else {
        // Stepped backwards
        quality = 'blunder';
        qualitySymbol = '??';
        explanation = `Blunder: Pawn stepped backward, adding +${dMeAfter - dMeBefore} distance to victory.`;
      }
    }

    // Accumulate counts
    if (pIdx === 0) p0Counts[quality]++;
    else p1Counts[quality]++;

    // Check for clutch turning point
    const absSwing = Math.abs(probDelta);
    if (absSwing > maxSwing) {
      maxSwing = absSwing;
      clutchTurnIdx = i;
      clutchSummary = `Turn ${i + 1} was the critical turning point: ${simPlayers[pIdx].name}'s ${quality} move (${qualitySymbol}) swung win probability by ${(absSwing * 100).toFixed(0)}%!`;
    }

    reviewedTurns.push({
      turnNumber: i + 1,
      playerIndex: pIdx,
      move,
      quality,
      qualitySymbol,
      winProbabilityBefore: probBefore,
      winProbabilityAfter: probAfter,
      probDelta,
      explanation,
      dPlayerBefore: dMeBefore,
      dOppBefore: dOppBefore,
      dPlayerAfter: dMeAfter,
      dOppAfter: dOppAfter,
      playersAtTurn,
      wallsAtTurn,
    });
  }

  // 5. Calculate CAPS Accuracy Score (0% to 100%)
  const scoreMap: Record<MoveQuality, number> = {
    brilliant: 100,
    great: 95,
    best: 100,
    inaccuracy: 65,
    blunder: 25,
  };

  const calcAcc = (counts: Record<MoveQuality, number>): number => {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) return 90.0;
    const weightedSum =
      counts.brilliant * scoreMap.brilliant +
      counts.great * scoreMap.great +
      counts.best * scoreMap.best +
      counts.inaccuracy * scoreMap.inaccuracy +
      counts.blunder * scoreMap.blunder;
    return Math.round((weightedSum / total) * 10) / 10;
  };

  return {
    p0Accuracy: calcAcc(p0Counts),
    p1Accuracy: calcAcc(p1Counts),
    p0QualityCounts: p0Counts,
    p1QualityCounts: p1Counts,
    clutchTurnIndex: clutchTurnIdx,
    turningPointDescription: clutchSummary,
    turns: reviewedTurns,
  };
}
