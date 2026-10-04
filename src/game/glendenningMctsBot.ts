import { Player, Wall, Position, Orientation } from '../types/game';
import { getLegalPawnMoves, getAllLegalWalls, getShortestPath } from './quoridor';
import {
  createBitboardGraph,
  getWallCutMasks,
  getBiDirectionalShortestPath,
  doesWallIntersectPath,
} from './bitboard';

export interface MctsMoveResult {
  action: 'move' | 'wall';
  to?: Position;
  wall?: { x: number; y: number; orientation: Orientation };
  reason?: string;
  visits?: number;
  winRate?: number;
}

interface MctsAction {
  type: 'move' | 'wall';
  to?: Position;
  wall?: { x: number; y: number; orientation: Orientation };
  prior: number; // P(s, a) progressive bias
}

interface MctsNode {
  playerIndex: number;
  players: Player[];
  walls: Wall[];
  parent: MctsNode | null;
  actionFromParent: MctsAction | null;
  children: { action: MctsAction; node: MctsNode | null }[];
  visits: number;
  totalValue: number; // accumulated value from perspective of playerIndex
}

/**
 * Victor Glendenning MCTS Engine for Quoridor
 * Implements the selection formula and progressive bias from:
 * "Mastering the Game of Quoridor with Monte Carlo Tree Search" (Victor Glendenning)
 *
 * Features:
 * - PUCT selection with shortest-path progressive bias
 * - Aggressive wall move pruning (filtering to active path intersections)
 * - Heuristic rollout policy balancing advance vs tactical deterrence
 */
export class GlendenningMctsEngine {
  private readonly cPuct: number = 1.414;
  private readonly maxIterations: number = 120; // Fast real-time browser budget (<40ms)
  private readonly maxRolloutDepth: number = 12;

  public search(
    playerIndex: number,
    players: Player[],
    walls: Wall[],
    iterations: number = this.maxIterations
  ): MctsMoveResult {
    const me = players[playerIndex];
    const opponent = players[1 - playerIndex];

    // Compute baseline shortest paths
    const myPathData = getShortestPath({ x: me.x, y: me.y }, me.targetRow, walls) || {
      length: 99,
      path: [],
    };
    const oppPathData = getShortestPath({ x: opponent.x, y: opponent.y }, opponent.targetRow, walls) || {
      length: 99,
      path: [],
    };

    const legalMoves = getLegalPawnMoves(playerIndex, players, walls);
    let bestPawnMove: Position = legalMoves[0] || { x: me.x, y: me.y };
    let minPawnDist = myPathData.length;

    for (const move of legalMoves) {
      const nextPath = getShortestPath(move, me.targetRow, walls);
      if (nextPath && nextPath.length < minPawnDist) {
        minPawnDist = nextPath.length;
        bestPawnMove = move;
      }
    }

    // If no walls, sprint pawn
    if (me.wallsLeft <= 0) {
      return {
        action: 'move',
        to: bestPawnMove,
        reason: 'Glendenning MCTS: No walls remaining, sprinting along shortest path',
        visits: 1,
        winRate: 0.5,
      };
    }

    // Root node
    const root: MctsNode = {
      playerIndex,
      players: [
        { ...players[0] },
        { ...players[1] },
      ],
      walls: [...walls],
      parent: null,
      actionFromParent: null,
      children: [],
      visits: 0,
      totalValue: 0,
    };

    this.expandNode(root, myPathData.path, oppPathData.path);

    if (root.children.length === 0) {
      return { action: 'move', to: bestPawnMove, reason: 'Glendenning MCTS: Default forward step' };
    }

    // Perform MCTS iterations
    for (let iter = 0; iter < iterations; iter++) {
      let current = root;

      // 1. SELECT
      while (current.children.length > 0 && current.children.every((c) => c.node !== null)) {
        current = this.selectBestChild(current);
      }

      // 2. EXPAND
      const unexpanded = current.children.find((c) => c.node === null);
      let leaf = current;
      if (unexpanded) {
        const nextState = this.applyAction(current, unexpanded.action);
        const childNode: MctsNode = {
          playerIndex: 1 - current.playerIndex,
          players: nextState.players,
          walls: nextState.walls,
          parent: current,
          actionFromParent: unexpanded.action,
          children: [],
          visits: 0,
          totalValue: 0,
        };
        unexpanded.node = childNode;
        leaf = childNode;

        // Only expand child if not terminal
        if (!this.isTerminal(leaf)) {
          const leafMe = leaf.players[leaf.playerIndex];
          const leafOpp = leaf.players[1 - leaf.playerIndex];
          const leafMyP = getShortestPath({ x: leafMe.x, y: leafMe.y }, leafMe.targetRow, leaf.walls)?.path || [];
          const leafOppP = getShortestPath({ x: leafOpp.x, y: leafOpp.y }, leafOpp.targetRow, leaf.walls)?.path || [];
          this.expandNode(leaf, leafMyP, leafOppP);
        }
      }

      // 3. SIMULATE / ROLLOUT
      const rolloutValue = this.rollout(leaf, playerIndex);

      // 4. BACKPROPAGATE
      let back: MctsNode | null = leaf;
      while (back !== null) {
        back.visits++;
        back.totalValue += rolloutValue;
        back = back.parent;
      }
    }

    // Select child with most visits (Glendenning robust child selection)
    let bestChild = root.children[0];
    let maxVisits = -1;

    for (const child of root.children) {
      const visits = child.node ? child.node.visits : 0;
      if (visits > maxVisits) {
        maxVisits = visits;
        bestChild = child;
      }
    }

    const action = bestChild.action;
    const winRate = bestChild.node && bestChild.node.visits > 0
      ? (bestChild.node.totalValue / bestChild.node.visits)
      : 0.5;

    if (action.type === 'wall' && action.wall) {
      return {
        action: 'wall',
        wall: action.wall,
        reason: `Glendenning MCTS (${maxVisits} visits, ${(winRate * 100).toFixed(0)}% win rate): Optimal progressive bias wall intercept`,
        visits: maxVisits,
        winRate,
      };
    }

    return {
      action: 'move',
      to: action.to || bestPawnMove,
      reason: `Glendenning MCTS (${maxVisits} visits, ${(winRate * 100).toFixed(0)}% win rate): Progressive path sprint`,
      visits: maxVisits,
      winRate,
    };
  }

  /**
   * Expand node using aggressive move pruning:
   * - Legal pawn moves
   * - Only candidate walls that intersect the opponent's active shortest path
   */
  private expandNode(node: MctsNode, myPath: Position[], oppPath: Position[]) {
    const actions: MctsAction[] = [];
    const player = node.players[node.playerIndex];
    const opponent = node.players[1 - node.playerIndex];

    const pawnMoves = getLegalPawnMoves(node.playerIndex, node.players, node.walls);
    const myCurrentDist = myPath.length || 8;

    for (const move of pawnMoves) {
      const nextP = getShortestPath(move, player.targetRow, node.walls);
      const nextDist = nextP ? nextP.length : myCurrentDist;
      // Progressive bias prior: higher prior if step reduces distance
      const progress = myCurrentDist - nextDist;
      const prior = Math.exp(1.5 * progress);
      actions.push({ type: 'move', to: move, prior });
    }

    // Wall candidates (pruned to opponent path cuts)
    if (player.wallsLeft > 0) {
      const legalWalls = getAllLegalWalls(node.walls, node.players, { p0Path: myPath, p1Path: oppPath });
      const baseGraph = createBitboardGraph(node.walls);
      const oppCurrentDist = oppPath.length || 8;

      for (const wall of legalWalls) {
        const cutsOpp = doesWallIntersectPath(wall, oppPath);
        if (!cutsOpp) continue; // Prune wall if it does not intercept opponent shortest path

        const cuts = getWallCutMasks(wall.x, wall.y, wall.orientation);
        const simGraph = {
          hMask: baseGraph.hMask & ~cuts.hCut,
          vMask: baseGraph.vMask & ~cuts.vCut,
        };

        const simOpp = getBiDirectionalShortestPath(simGraph, { x: opponent.x, y: opponent.y }, opponent.targetRow);
        if (!simOpp) continue;

        const detour = simOpp.length - oppCurrentDist;
        if (detour <= 0) continue;

        // Progressive bias: exponential weight for detour increase
        const prior = Math.exp(1.2 * detour);
        actions.push({ type: 'wall', wall, prior });
      }
    }

    // Normalize priors so sum(P) = 1
    const totalPrior = actions.reduce((sum, a) => sum + a.prior, 0) || 1;
    for (const act of actions) {
      act.prior = act.prior / totalPrior;
      node.children.push({ action: act, node: null });
    }
  }

  /**
   * Victor Glendenning PUCT selection formula:
   * UCT(s, a) = Q(s, a) + cPuct * P(s, a) * sqrt(N(s)) / (1 + N(s, a))
   */
  private selectBestChild(node: MctsNode): MctsNode {
    let bestChildNode: MctsNode | null = null;
    let bestScore = -Infinity;
    const sqrtN = Math.sqrt(node.visits);

    for (const child of node.children) {
      const childNode = child.node;
      if (!childNode) continue;

      const qValue = childNode.visits > 0
        ? childNode.totalValue / childNode.visits
        : 0.5;

      const uValue = this.cPuct * child.action.prior * (sqrtN / (1 + childNode.visits));
      const score = qValue + uValue;

      if (score > bestScore) {
        bestScore = score;
        bestChildNode = childNode;
      }
    }

    return bestChildNode || node.children[0]?.node || node;
  }

  private applyAction(node: MctsNode, action: MctsAction): { players: Player[]; walls: Wall[] } {
    const players: Player[] = [
      { ...node.players[0] },
      { ...node.players[1] },
    ];
    let walls = [...node.walls];

    if (action.type === 'move' && action.to) {
      players[node.playerIndex].x = action.to.x;
      players[node.playerIndex].y = action.to.y;
    } else if (action.type === 'wall' && action.wall) {
      walls.push({
        id: `mcts-w-${walls.length}`,
        x: action.wall.x,
        y: action.wall.y,
        orientation: action.wall.orientation,
        placedBy: node.playerIndex,
      });
      players[node.playerIndex].wallsLeft = Math.max(0, players[node.playerIndex].wallsLeft - 1);
    }

    return { players, walls };
  }

  private isTerminal(node: MctsNode): boolean {
    return node.players.some((p) => p.y === p.targetRow);
  }

  /**
   * Rollout simulation with heuristic shortest-path progress evaluation
   */
  private rollout(leaf: MctsNode, rootPlayerIndex: number): number {
    let currentPlayers: Player[] = [
      { ...leaf.players[0] },
      { ...leaf.players[1] },
    ];
    let currentWalls = [...leaf.walls];
    let turn = leaf.playerIndex;

    for (let step = 0; step < this.maxRolloutDepth; step++) {
      // Check win
      if (currentPlayers[0].y === currentPlayers[0].targetRow) {
        return rootPlayerIndex === 0 ? 1.0 : 0.0;
      }
      if (currentPlayers[1].y === currentPlayers[1].targetRow) {
        return rootPlayerIndex === 1 ? 1.0 : 0.0;
      }

      // Fast forward step
      const player = currentPlayers[turn];
      const legal = getLegalPawnMoves(turn, currentPlayers, currentWalls);
      if (legal.length === 0) break;

      let bestMove = legal[0];
      let minDist = 99;
      for (const m of legal) {
        const p = getShortestPath(m, player.targetRow, currentWalls);
        if (p && p.length < minDist) {
          minDist = p.length;
          bestMove = m;
        }
      }

      currentPlayers[turn].x = bestMove.x;
      currentPlayers[turn].y = bestMove.y;
      turn = 1 - turn;
    }

    // Heuristic value from remaining distance differential
    const d0 = getShortestPath({ x: currentPlayers[0].x, y: currentPlayers[0].y }, currentPlayers[0].targetRow, currentWalls)?.length || 8;
    const d1 = getShortestPath({ x: currentPlayers[1].x, y: currentPlayers[1].y }, currentPlayers[1].targetRow, currentWalls)?.length || 8;

    // From perspective of rootPlayerIndex
    const dMe = rootPlayerIndex === 0 ? d0 : d1;
    const dOpp = rootPlayerIndex === 0 ? d1 : d0;

    // Map delta to [0, 1] sigmoid win probability
    const delta = dOpp - dMe;
    return 1 / (1 + Math.exp(-0.7 * delta));
  }
}

export const glendenningMcts = new GlendenningMctsEngine();
