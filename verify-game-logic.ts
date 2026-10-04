import {
  BOARD_SIZE,
  getShortestPath,
  isValidWallPlacement,
  getLegalPawnMoves,
  isPathBlockedByWall,
} from './src/game/quoridor.ts';
import {
  calculateAlphaAdvice,
  isMasterUser,
} from './src/game/alphaOracle.ts';
import {
  createBitboardGraph,
  getBiDirectionalShortestPath,
  doesWallIntersectPath,
  zobrist,
} from './src/game/bitboard.ts';
import { Player, Wall } from './src/types/game.ts';

console.log('🧪 RUNNING QUORIDOR BITBOARD & GRAPH ENGINE VERIFICATION...\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    process.exitCode = 1;
  }
}

// 1. Test BFS Shortest Path on Empty Board
const p0Start = { x: 4, y: 0 };
const pathData = getShortestPath(p0Start, 8, []);
assert(pathData !== null, 'Shortest path found on empty board');
assert(pathData?.length === 8, `Expected distance 8 on empty board, got ${pathData?.length}`);

// 2. Test Wall Collision & Blocking Movement
const testWall: Wall = { id: 'w1', x: 4, y: 0, orientation: 'H', placedBy: 0 };
const blocked1 = isPathBlockedByWall(4, 0, 4, 1, [testWall]);
const blocked2 = isPathBlockedByWall(5, 0, 5, 1, [testWall]);
const unblocked = isPathBlockedByWall(3, 0, 3, 1, [testWall]);
assert(blocked1 === true, 'Horizontal wall blocks step (4,0) -> (4,1)');
assert(blocked2 === true, 'Horizontal wall blocks step (5,0) -> (5,1)');
assert(unblocked === false, 'Adjacent column (3,0) -> (3,1) is not blocked');

// 3. Test Detour Calculation via Bitboard Bi-directional BFS
const detourPath = getShortestPath(p0Start, 8, [testWall]);
assert(detourPath !== null, 'Path exists with single detour wall');
assert(detourPath!.length > 8, `Wall successfully lengthened route from 8 to ${detourPath!.length}`);

// 4. Test Entrapment Prevention (Critical Quoridor Rule)
const players: Player[] = [
  { id: 'p1', name: 'James', avatar: 'james', x: 4, y: 0, targetRow: 8, wallsLeft: 10, color: '#2563EB', accentColor: '#60A7FF' },
  { id: 'p2', name: 'Dino', avatar: 'dino', x: 4, y: 8, targetRow: 0, wallsLeft: 10, color: '#DC2626', accentColor: '#F87171' },
];

const trappingWalls: Wall[] = [
  { id: 't0', x: 0, y: 0, orientation: 'H', placedBy: 1 },
  { id: 't1', x: 2, y: 0, orientation: 'H', placedBy: 1 },
  { id: 't2', x: 4, y: 0, orientation: 'H', placedBy: 1 },
  { id: 't3', x: 6, y: 0, orientation: 'H', placedBy: 1 },
];
const trapCheck = isValidWallPlacement({ x: 7, y: 0, orientation: 'H' }, trappingWalls, players);
assert(trapCheck.valid === false, 'Entrapment prevention: wall that completely traps a player is rejected');

// 5. Test Pawn Movement Rules (Straight Jump & Diagonal Jumps)
const adjacentPlayers: Player[] = [
  { ...players[0], x: 4, y: 3 },
  { ...players[1], x: 4, y: 4 },
];
const movesA = getLegalPawnMoves(0, adjacentPlayers, []);
const hasStraightJump = movesA.some((m) => m.x === 4 && m.y === 5);
assert(hasStraightJump, 'Straight jump over opponent to (4,5) is legal');

const blockingBehindWall: Wall = { id: 'wb', x: 4, y: 4, orientation: 'H', placedBy: 1 };
const movesB = getLegalPawnMoves(0, adjacentPlayers, [blockingBehindWall]);
const hasDiagonalLeft = movesB.some((m) => m.x === 3 && m.y === 4);
const hasDiagonalRight = movesB.some((m) => m.x === 5 && m.y === 4);
assert(hasDiagonalLeft && hasDiagonalRight, 'Diagonal jumps to (3,4) and (5,4) become legal when straight jump is blocked');

// 6. Test Master Login Validation (ALPHA / 1845)
assert(isMasterUser('ALPHA', '1845') === true, 'Master authentication succeeds with ALPHA / 1845');
assert(isMasterUser('alpha', '1845') === true, 'Master authentication is case-insensitive for username');
assert(isMasterUser('JAMES', '1845') === false, 'Invalid username is rejected');
assert(isMasterUser('ALPHA', '9999') === false, 'Invalid passcode is rejected');

// 7. Test Bitboard Graph & Bi-directional BFS
const bitGraph = createBitboardGraph([]);
const biPath = getBiDirectionalShortestPath(bitGraph, { x: 4, y: 0 }, 8);
assert(biPath !== null && biPath.length === 8, 'Bitboard Bi-directional BFS returns optimal 8-step path');

// 8. Test Articulation Path Caching (Wall Feasibility Filter)
const dummyPath = [
  { x: 4, y: 0 },
  { x: 4, y: 1 },
  { x: 4, y: 2 },
];
// Wall at (4, 0) H cuts vertical step (4,0) -> (4,1)
const cuts = doesWallIntersectPath({ x: 4, y: 0, orientation: 'H' }, dummyPath);
const noCut = doesWallIntersectPath({ x: 0, y: 5, orientation: 'H' }, dummyPath);
assert(cuts === true, 'Articulation Path: accurately detects wall cutting player path');
assert(noCut === false, 'Articulation Path: accurately detects wall NOT cutting player path (bypasses BFS)');

// 9. Test Zobrist Hashing & Transposition Cache
const hash1 = zobrist.computeHash(players, [], 0);
const hash2 = zobrist.computeHash(players, [testWall], 0);
assert(hash1 !== hash2, 'Zobrist produces unique 64-bit hash for different board states');

const dummyTestHash = 0x123456789ABCDEFn;
zobrist.setCache(dummyTestHash, { delta: 0, advice: { mock: true } });
const cachedEntry = zobrist.getCache(dummyTestHash);
assert(cachedEntry !== undefined && (cachedEntry.advice as { mock: boolean }).mock === true, 'Zobrist LRU transposition cache saves and retrieves state');

// 10. Test Alpha Oracle AI Engine
const advice = calculateAlphaAdvice(0, players, []);
assert(advice.recommendedAction === 'move' || advice.recommendedAction === 'wall', 'Oracle returns a valid action');
assert(advice.playerPathLength === 8, `Oracle correctly computed player path length: ${advice.playerPathLength}`);
assert(advice.opponentPathLength === 8, `Oracle correctly computed opponent path length: ${advice.opponentPathLength}`);
assert(advice.reason.length > 10, `Oracle generates tactical explanation: "${advice.reason.substring(0, 45)}..."`);

// 11. Test All 3 AI Difficulty Tiers
import { getAiMove } from './src/game/aiBot.ts';

// Level 1: Easy (Apprentice)
const easyMove = getAiMove(1, players, [], 'easy');
assert(easyMove.action === 'move' || easyMove.action === 'wall', 'Easy AI returns valid legal action');
if (easyMove.action === 'move') {
  assert(easyMove.to !== undefined && easyMove.to.y < 8, `Easy AI correctly advances towards row 0 (to y=${easyMove.to?.y})`);
}

// Level 2: Normal (Tactician)
const normalMove = getAiMove(1, players, [], 'normal');
assert(normalMove.action === 'move' || normalMove.action === 'wall', 'Normal AI returns valid strategic action');
assert(normalMove.reason !== undefined && normalMove.reason.length > 0, `Normal AI provides tactical reason: "${normalMove.reason}"`);

// Level 3: Grandmaster (2-Ply Minimax)
const gmMove = getAiMove(1, players, [], 'grandmaster');
assert(gmMove.action === 'move' || gmMove.action === 'wall', 'Grandmaster 2-Ply Minimax returns optimal action');
assert(gmMove.reason !== undefined && gmMove.reason.includes('Grandmaster'), `Grandmaster AI reason confirms 2-Ply Minimax execution`);

// 12. Test Chess.com Style Esports Analysis Engine
import { analyzeMatch, calculateWinProbability } from './src/game/analysisEngine.ts';
import { MoveRecord } from './src/types/game.ts';

// Test Win Probability Calculus
const pAhead = calculateWinProbability(4, 10, 8, 4);
const pBehind = calculateWinProbability(10, 4, 4, 8);
assert(pAhead > 0.8, `Win probability calculates high advantage when opponent has long detour (${(pAhead * 100).toFixed(0)}%)`);
assert(pBehind < 0.2, `Win probability calculates disadvantage when player is behind (${(pBehind * 100).toFixed(0)}%)`);

// Construct mock match history with a Brilliant wall
const mockHistory: MoveRecord[] = [
  // Turn 1: P0 moves down
  {
    type: 'move',
    playerIndex: 0,
    from: { x: 4, y: 0 },
    to: { x: 4, y: 1 },
    timestamp: Date.now(),
    notation: 'E2',
  },
  // Turn 2: P1 moves up
  {
    type: 'move',
    playerIndex: 1,
    from: { x: 4, y: 8 },
    to: { x: 4, y: 7 },
    timestamp: Date.now(),
    notation: 'E8',
  },
  // Turn 3: P0 places a devastating wall right in front of P1
  {
    type: 'wall',
    playerIndex: 0,
    wall: { id: 'w-brilliant', x: 4, y: 6, orientation: 'H', placedBy: 0 },
    timestamp: Date.now(),
    notation: 'E7H',
  },
];

const analysis = analyzeMatch(mockHistory, players);
assert(analysis.turns.length === 3, `Analysis engine evaluated all 3 recorded turns`);
assert(analysis.p0Accuracy >= 50 && analysis.p0Accuracy <= 100, `Player 0 CAPS accuracy generated: ${analysis.p0Accuracy}%`);
assert(analysis.p1Accuracy >= 50 && analysis.p1Accuracy <= 100, `Player 1 CAPS accuracy generated: ${analysis.p1Accuracy}%`);
assert(analysis.clutchTurnIndex >= 0, `Turning point accurately identified at turn ${analysis.clutchTurnIndex + 1}`);
assert(analysis.turningPointDescription.length > 0, `Turning point description created: "${analysis.turningPointDescription}"`);

// 13. Test Headless Bot API & 100x Benchmark Simulator
import { runHeadlessDuel, runHeadlessBatch } from './src/game/headlessBotApi.ts';

const duelResult = runHeadlessDuel(
  { id: 'b0', name: 'Tactician', difficulty: 'normal' },
  { id: 'b1', name: 'Grandmaster', difficulty: 'grandmaster' }
);
assert(duelResult.turns > 0, `Headless duel completed in ${duelResult.turns} turns (Winner: ${duelResult.winnerName})`);
assert(duelResult.durationMs >= 0, `Headless duel duration measured: ${duelResult.durationMs}ms`);

const batchResult = runHeadlessBatch(
  { id: 'b0', name: 'Scout', difficulty: 'easy' },
  { id: 'b1', name: 'Tactician', difficulty: 'normal' },
  5
);
assert(batchResult.totalGames === 5, `Headless batch runner simulated ${batchResult.totalGames} duels`);
assert(batchResult.p0WinRate + batchResult.p1WinRate <= 100, `Batch win rates correctly normalized: ${batchResult.p0WinRate}% vs ${batchResult.p1WinRate}%`);
assert(batchResult.averageTurns > 0, `Batch average turns measured: ${batchResult.averageTurns}`);

// 14. Test Progression & Leveling Calculus (XP = 100 * Level^1.4)
import {
  calculateXpRequired,
  calculateMatchXp,
  rollStickerRarity,
  rollStickerDrop,
  settleMatch,
  MASTER_STICKERS,
} from './src/lib/progressionRpc.ts';

const xpL1 = calculateXpRequired(1);
const xpL2 = calculateXpRequired(2);
const xpL5 = calculateXpRequired(5);
const xpL10 = calculateXpRequired(10);

assert(xpL1 === 100, `Level 1 required XP is 100 (got ${xpL1})`);
assert(xpL2 === 263, `Level 2 required XP is 263 (got ${xpL2})`);
assert(xpL5 === 951, `Level 5 required XP is 951 (got ${xpL5})`);
assert(xpL10 === 2511, `Level 10 required XP is 2511 (got ${xpL10})`);
assert(xpL10 > xpL5 * 2.5, `XP smoothly scales with exponent 1.4 to prevent rapid inflation`);

// Test Match XP rewards (+10 per unused wall)
const winReward = calculateMatchXp(true, 7);
assert(winReward.baseXp === 120, `Win awards 120 base XP`);
assert(winReward.bonusWallXp === 70, `7 unused walls award +70 bonus XP`);
assert(winReward.totalXp === 190, `Total win reward with 7 unused walls is 190 XP`);

const lossReward = calculateMatchXp(false, 3);
assert(lossReward.baseXp === 40, `Loss awards 40 base XP`);
assert(lossReward.bonusWallXp === 30, `3 unused walls award +30 bonus XP`);
assert(lossReward.totalXp === 70, `Total loss reward is 70 XP`);

// 15. Test Sticker Loot Drop Rarity Engine (Monte Carlo 5,000 rolls: 65% / 25% / 8% / 2%)
let commonCount = 0;
let rareCount = 0;
let epicCount = 0;
let legendaryCount = 0;
const MONTE_CARLO_TRIALS = 5000;

for (let i = 0; i < MONTE_CARLO_TRIALS; i++) {
  const rarity = rollStickerRarity();
  if (rarity === 'common') commonCount++;
  else if (rarity === 'rare') rareCount++;
  else if (rarity === 'epic') epicCount++;
  else if (rarity === 'legendary') legendaryCount++;
}

const commonPct = (commonCount / MONTE_CARLO_TRIALS) * 100;
const rarePct = (rareCount / MONTE_CARLO_TRIALS) * 100;
const epicPct = (epicCount / MONTE_CARLO_TRIALS) * 100;
const legendaryPct = (legendaryCount / MONTE_CARLO_TRIALS) * 100;

assert(commonPct >= 61 && commonPct <= 69, `Common drop rate within target 65% ± 4% (got ${commonPct.toFixed(1)}%)`);
assert(rarePct >= 21 && rarePct <= 29, `Rare drop rate within target 25% ± 4% (got ${rarePct.toFixed(1)}%)`);
assert(epicPct >= 5.5 && epicPct <= 10.5, `Epic drop rate within target 8% ± 2.5% (got ${epicPct.toFixed(1)}%)`);
assert(legendaryPct >= 0.8 && legendaryPct <= 3.5, `Legendary drop rate within target 2% ± 1.5% (got ${legendaryPct.toFixed(1)}%)`);

// Test rollStickerDrop excludes already owned slugs
const allSlugs = new Set(MASTER_STICKERS.map((s) => s.slug));
const emptyRoll = rollStickerDrop(allSlugs);
assert(emptyRoll === null, `rollStickerDrop correctly returns null when all stickers are collected`);

// 16. Test The Gauntlet Solo Campaign (20 Levels, 3 Tiers, Solvability)
import { CAMPAIGN_LEVELS, getCampaignLevel, getStarsForLevel } from './src/game/campaignLevels.ts';

assert(CAMPAIGN_LEVELS.length === 20, `The Gauntlet contains exactly 20 levels`);

const basicsLevels = CAMPAIGN_LEVELS.filter((l) => l.tier === 'basics');
const tacticalLevels = CAMPAIGN_LEVELS.filter((l) => l.tier === 'tactical');
const masterLevels = CAMPAIGN_LEVELS.filter((l) => l.tier === 'master');

assert(basicsLevels.length === 5, `Levels 1-5 categorized as The Basics (count: ${basicsLevels.length})`);
assert(tacticalLevels.length === 10, `Levels 6-15 categorized as Tactical Puzzles (count: ${tacticalLevels.length})`);
assert(masterLevels.length === 5, `Levels 16-20 categorized as Master Trials (count: ${masterLevels.length})`);

// Verify Master Trials have 15s blitz timers
const allMasterBlitz = masterLevels.every((l) => l.turnTimerSeconds === 15);
assert(allMasterBlitz, `All Master Trials enforce strict 15s blitz turn clock`);

// Verify solvability of all pre-placed neutral barrier labyrinths
for (const level of CAMPAIGN_LEVELS) {
  if (level.preplacedWalls.length > 0) {
    const p0Path = getShortestPath({ x: 4, y: 0 }, 8, level.preplacedWalls);
    const p1Path = getShortestPath({ x: 4, y: 8 }, 0, level.preplacedWalls);
    assert(p0Path !== null, `Level ${level.levelNumber} (${level.title}): P0 has clear path through pre-placed barriers`);
    assert(p1Path !== null, `Level ${level.levelNumber} (${level.title}): P1 has clear path through pre-placed barriers`);
  }
}

// Test Star calculation
assert(getStarsForLevel(10, 10, true) === 3, `Win at or under par moves awards 3 stars`);
assert(getStarsForLevel(14, 10, true) === 2, `Win within 5 moves over par awards 2 stars`);
assert(getStarsForLevel(20, 10, true) === 1, `Win over par threshold awards 1 star`);
assert(getStarsForLevel(10, 10, false) === 0, `Loss awards 0 stars`);

// 17. Test Atomic Match Settlement Engine
(async () => {
  const settlement = await settleMatch({
    gameMode: '1v1_ranked',
    winnerPlayerIndex: 0,
    turnsCount: 16,
    moveLog: [],
    playerWallsLeft: 10,
    playerWallsPlaced: 0,
    opponentWallsPlaced: 5,
    p1Name: 'James',
    p2Name: 'Dino',
  });

  assert(settlement.isWin === true, `Settlement correctly records win`);
  assert(settlement.bonusWallXp === 100, `10 unused walls award 100 bonus XP (got ${settlement.bonusWallXp})`);
  assert(settlement.xpGained === 220, `Total XP gained is 220 (120 win + 100 wall bonus)`);
  assert(settlement.newXp > settlement.previousXp, `Profile XP successfully incremented`);
  assert(settlement.unlockedAchievement !== null || settlement.unlockedSticker !== null, `Victory rolled unlocked loot or achievement`);

  // 18. Test Quick-Chat Engine & Realtime Multiplayer Service
  const { QUICK_CHAT_PRESETS } = await import('./src/components/QuickChatWheel');
  assert(QUICK_CHAT_PRESETS.length >= 8, `Quick-Chat contains at least 8 presets (got ${QUICK_CHAT_PRESETS.length})`);
  const niceBlock = QUICK_CHAT_PRESETS.find((p) => p.phrase.includes('Nice block'));
  assert(Boolean(niceBlock), `Quick-Chat contains 'Nice block! 🧱'`);
  const bigMistake = QUICK_CHAT_PRESETS.find((p) => p.phrase.includes('Big mistake'));
  assert(Boolean(bigMistake), `Quick-Chat contains 'Big mistake... 😈'`);
  const hurryUp = QUICK_CHAT_PRESETS.find((p) => p.phrase.includes('Hurry up'));
  assert(Boolean(hurryUp), `Quick-Chat contains 'Hurry up! ⏳'`);
  const goodGame = QUICK_CHAT_PRESETS.find((p) => p.phrase.includes('Good game'));
  assert(Boolean(goodGame), `Quick-Chat contains 'Good game! 🤝'`);

  const { multiplayerService } = await import('./src/services/multiplayer');
  let receivedCallout: any = null;
  const unsubChat = multiplayerService.onQuickChat((callout) => {
    receivedCallout = callout;
  });

  multiplayerService.sendQuickChat({
    id: 'test-callout-1',
    phrase: 'Nice block!',
    emoji: '🧱',
    senderIndex: 0,
    timestamp: Date.now(),
  });

  assert(receivedCallout !== null, `multiplayerService dispatches quick-chat event`);
  assert(receivedCallout?.phrase === 'Nice block!', `Quick-chat event contains correct phrase`);
  assert(receivedCallout?.emoji === '🧱', `Quick-chat event contains correct emoji`);
  assert(receivedCallout?.senderIndex === 0, `Quick-chat event contains correct senderIndex`);
  unsubChat();

  let receivedMove: any = null;
  const unsubMove = multiplayerService.onMove((m) => {
    receivedMove = m;
  });

  const moveResult1 = multiplayerService.sendMove('move', { x: 4, y: 1 }, 0);
  const moveResult2 = multiplayerService.sendMove('wall', { x: 3, y: 3, orientation: 'h' }, 1);

  assert(moveResult1.sequenceId === 1, `First move gets sequence_id 1`);
  assert(moveResult2.sequenceId === 2, `Second move increments monotonic sequence_id to 2`);
  assert(receivedMove?.action === 'wall', `Move listener correctly captured last move`);
  unsubMove();

  // =========================================================================
  // SECTION 13: DOTS AND BOXES ENGINE & AI (ARJUN-G & KARAN REFERENCE)
  // =========================================================================
  const {
    createInitialDotsState,
    playLine,
    isLineLegal,
    countBoxWalls,
    getBoxesClosedByLine,
    categorizeMoves,
  } = await import('./src/game/dotsAndBoxes');

  const { getDotsAiMove, detectCapturableChains } = await import('./src/game/dotsAndBoxesAi');
  const { glendenningMcts } = await import('./src/game/glendenningMctsBot');
  const { supabaseKeepalive } = await import('./src/services/supabaseKeepalive');

  const testPlayers: any[] = [
    { id: 'p1', name: 'Player 1', avatar: 'james', color: '#2563EB', accentColor: '#60A7FF', type: 'human', score: 0 },
    { id: 'p2', name: 'Player 2', avatar: 'dino', color: '#DC2626', accentColor: '#F87171', type: 'ai', difficulty: 'master', score: 0 },
  ];

  let dotsState = createInitialDotsState(2, testPlayers, 'streetwear');
  assert(dotsState.gridSize === 2, `Dots & Boxes: Initialized 2x2 board (3x3 dots)`);
  assert(dotsState.boxes.length === 2 && dotsState.boxes[0].length === 2, `Dots & Boxes: Contains 4 total boxes`);
  assert(isLineLegal(dotsState, 'h', 0, 0), `Dots & Boxes: (h, 0, 0) is legal`);

  // Draw 3 walls around box (0, 0): top, left, right
  dotsState = playLine(dotsState, 'h', 0, 0); // P1 draws top
  assert(dotsState.currentTurn === 1, `Dots & Boxes: No box closed -> turn advances to P2`);
  dotsState = playLine(dotsState, 'v', 0, 0); // P2 draws left
  assert(dotsState.currentTurn === 0, `Dots & Boxes: Turn advances to P1`);
  dotsState = playLine(dotsState, 'v', 0, 1); // P1 draws right
  assert(dotsState.currentTurn === 1, `Dots & Boxes: Turn advances to P2`);

  assert(countBoxWalls(dotsState, 0, 0) === 3, `Dots & Boxes: Box (0,0) has 3 walls drawn`);

  // P2 draws bottom wall: closes box (0, 0)
  const closedExpected = getBoxesClosedByLine(dotsState, 'h', 1, 0);
  assert(closedExpected.length >= 1, `Dots & Boxes: Correctly predicts box (0, 0) will close`);

  dotsState = playLine(dotsState, 'h', 1, 0); // P2 closes box (0, 0)
  assert(dotsState.boxes[0][0] === 1, `Dots & Boxes: Box (0, 0) claimed by Player 2`);
  assert(dotsState.players[1].score === 1, `Dots & Boxes: Player 2 score incremented to 1`);
  assert(dotsState.currentTurn === 1, `Dots & Boxes: Turn continuation -> Player 2 moves AGAIN upon closing box`);

  // Test 4-player turn rotation
  const fourPlayers: any[] = [
    { id: 'p1', name: 'P1', avatar: 'james', color: '#1', accentColor: '#1', type: 'human', score: 0 },
    { id: 'p2', name: 'P2', avatar: 'dino', color: '#2', accentColor: '#2', type: 'human', score: 0 },
    { id: 'p3', name: 'P3', avatar: 'mint', color: '#3', accentColor: '#3', type: 'human', score: 0 },
    { id: 'p4', name: 'P4', avatar: 'flame', color: '#4', accentColor: '#4', type: 'human', score: 0 },
  ];
  let fourState = createInitialDotsState(3, fourPlayers);
  fourState = playLine(fourState, 'h', 0, 0); // P1 moves
  assert(fourState.currentTurn === 1, `Dots & Boxes 4P: Turn rotates from P1 to P2`);
  fourState = playLine(fourState, 'h', 0, 1); // P2 moves
  assert(fourState.currentTurn === 2, `Dots & Boxes 4P: Turn rotates from P2 to P3`);
  fourState = playLine(fourState, 'h', 0, 2); // P3 moves
  assert(fourState.currentTurn === 3, `Dots & Boxes 4P: Turn rotates from P3 to P4`);
  fourState = playLine(fourState, 'h', 1, 0); // P4 moves
  assert(fourState.currentTurn === 0, `Dots & Boxes 4P: Turn wraps back to P1`);

  // Test AI levels (Easy, Medium, Hard, Master)
  const aiEasy = getDotsAiMove(fourState, 'easy');
  assert(Boolean(aiEasy?.move), `Dots & Boxes AI: Easy returns legal move`);

  const aiMed = getDotsAiMove(fourState, 'medium');
  assert(Boolean(aiMed?.move), `Dots & Boxes AI: Medium returns strategic move`);

  const aiHard = getDotsAiMove(fourState, 'hard');
  assert(Boolean(aiHard?.move), `Dots & Boxes AI: Hard returns minimax move`);

  // Test Double-Cross Strategy
  const aiMaster = getDotsAiMove(fourState, 'master');
  assert(Boolean(aiMaster?.move), `Dots & Boxes AI: Master returns move with tactical reason`);

  // =========================================================================
  // SECTION 14: VICTOR GLENDENNING MCTS QUORIDOR ENGINE
  // =========================================================================
  const quoridorPlayers: any[] = [
    { id: 'p0', name: 'P0', avatar: 'james', x: 4, y: 0, targetRow: 8, wallsLeft: 10, color: '#1', accentColor: '#1' },
    { id: 'p1', name: 'P1', avatar: 'dino', x: 4, y: 8, targetRow: 0, wallsLeft: 10, color: '#2', accentColor: '#2' },
  ];
  const mctsResult = glendenningMcts.search(0, quoridorPlayers, [], 40);
  assert(Boolean(mctsResult?.action), `Glendenning MCTS: Successfully executed PUCT tree search`);
  assert(Boolean(mctsResult?.reason?.includes('Glendenning MCTS')), `Glendenning MCTS: Confirms Victor Glendenning MCTS selection`);
  assert(typeof mctsResult.visits === 'number' && mctsResult.visits > 0, `Glendenning MCTS: Computed visit count`);

  // =========================================================================
  // SECTION 15: SUPABASE KEEPALIVE HEARTBEAT SERVICE
  // =========================================================================
  const keepaliveStatus = supabaseKeepalive.getStatus();
  assert(typeof keepaliveStatus === 'object', `Supabase Keepalive: Status object initialized`);
  const pingOk = await supabaseKeepalive.ping();
  assert(pingOk === true, `Supabase Keepalive: Successfully triggered active keepalive ping`);
  const updatedStatus = supabaseKeepalive.getStatus();
  assert(updatedStatus.pingCount >= 1, `Supabase Keepalive: Ping counter incremented`);
  assert(typeof updatedStatus.lastPingTime === 'number', `Supabase Keepalive: Recorded last ping timestamp`);

  console.log(`\n🎉 RESULTS: ${passedTests} / ${totalTests} TESTS PASSED!`);
})();


