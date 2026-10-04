import React, { useState, useEffect, useRef } from 'react';
import { Player, Wall, Orientation, Position, AiDifficulty } from '../types/game';
import { Board } from '../components/Board';
import {
  HeadlessBotConfig,
  runHeadlessDuel,
  runHeadlessBatch,
  HeadlessBatchSummary,
  HeadlessDuelResult,
} from '../game/headlessBotApi';
import { getAiMove } from '../game/aiBot';
import { isValidWallPlacement, getLegalPawnMoves } from '../game/quoridor';
import { sounds } from '../utils/audio';
import {
  Undo2,
  Play,
  FastForward,
  Cpu,
  Trophy,
  Zap,
  BarChart3,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface BotArenaScreenProps {
  onBack: () => void;
}

export const BotArenaScreen: React.FC<BotArenaScreenProps> = ({ onBack }) => {
  const [bot0Tier, setBot0Tier] = useState<AiDifficulty>('normal');
  const [bot1Tier, setBot1Tier] = useState<AiDifficulty>('grandmaster');
  const [simSpeed, setSimSpeed] = useState<'1x' | '10x' | 'instant'>('10x');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [batchSummary, setBatchSummary] = useState<HeadlessBatchSummary | null>(null);

  // Live board state for 1x and 10x simulations
  const [livePlayers, setLivePlayers] = useState<Player[]>([
    {
      id: 'bot0',
      name: 'Bot Blue',
      avatar: 'james',
      x: 4,
      y: 0,
      targetRow: 8,
      wallsLeft: 10,
      color: '#2563EB',
      accentColor: '#60A7FF',
    },
    {
      id: 'bot1',
      name: 'Bot Red',
      avatar: 'blaze',
      x: 4,
      y: 8,
      targetRow: 0,
      wallsLeft: 10,
      color: '#DC2626',
      accentColor: '#F87171',
    },
  ]);

  const [liveWalls, setLiveWalls] = useState<Wall[]>([]);
  const [liveTurn, setLiveTurn] = useState<number>(0);
  const [liveWinner, setLiveWinner] = useState<number | null>(null);
  const [turnCount, setTurnCount] = useState<number>(0);

  const timerRef = useRef<number | null>(null);

  const bot0Config: HeadlessBotConfig = {
    id: 'bot-0',
    name: `Bot Blue [${bot0Tier.toUpperCase()}]`,
    difficulty: bot0Tier,
  };

  const bot1Config: HeadlessBotConfig = {
    id: 'bot-1',
    name: `Bot Red [${bot1Tier.toUpperCase()}]`,
    difficulty: bot1Tier,
  };

  // Run 100x instant batch benchmark
  const handleRunInstantBatch = (rounds: number = 25) => {
    sounds.playVictoryFanfare();
    const summary = runHeadlessBatch(bot0Config, bot1Config, rounds);
    setBatchSummary(summary);
  };

  // Run single animated live match
  const handleStartLiveDuel = () => {
    sounds.playTurnChirp();
    setLivePlayers([
      { ...livePlayers[0], x: 4, y: 0, wallsLeft: 10 },
      { ...livePlayers[1], x: 4, y: 8, wallsLeft: 10 },
    ]);
    setLiveWalls([]);
    setLiveTurn(0);
    setLiveWinner(null);
    setTurnCount(0);
    setIsRunning(true);
  };

  // Step the simulation
  useEffect(() => {
    if (!isRunning || liveWinner !== null) return;

    const delay = simSpeed === '1x' ? 380 : 120;

    timerRef.current = window.setTimeout(() => {
      const activeDifficulty = liveTurn === 0 ? bot0Tier : bot1Tier;
      const decision = getAiMove(liveTurn, livePlayers, liveWalls, activeDifficulty);

      const nextPlayers = [...livePlayers];
      const nextWalls = [...liveWalls];

      if (decision.action === 'wall' && decision.wall && nextPlayers[liveTurn].wallsLeft > 0) {
        const check = isValidWallPlacement(decision.wall, nextWalls, nextPlayers);
        if (check.valid) {
          nextWalls.push({
            id: `w-${Date.now()}`,
            x: decision.wall.x,
            y: decision.wall.y,
            orientation: decision.wall.orientation,
            placedBy: liveTurn,
          });
          nextPlayers[liveTurn].wallsLeft -= 1;
        } else if (decision.to) {
          nextPlayers[liveTurn].x = decision.to.x;
          nextPlayers[liveTurn].y = decision.to.y;
        }
      } else if (decision.to) {
        nextPlayers[liveTurn].x = decision.to.x;
        nextPlayers[liveTurn].y = decision.to.y;
      }

      setLivePlayers(nextPlayers);
      setLiveWalls(nextWalls);
      setTurnCount((c) => c + 1);

      // Check win
      if (nextPlayers[liveTurn].y === nextPlayers[liveTurn].targetRow) {
        setLiveWinner(liveTurn);
        setIsRunning(false);
        sounds.playVictoryFanfare();
        return;
      }

      setLiveTurn(1 - liveTurn);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRunning, liveTurn, livePlayers, liveWalls, liveWinner, simSpeed, bot0Tier, bot1Tier]);

  return (
    <div className="w-full min-h-[100dvh] bg-[#ECE5D3] px-3 pt-3 pb-24 flex flex-col items-center select-none overflow-y-auto">
      <div className="w-full max-w-[430px] flex flex-col items-center gap-2">
        
        {/* Top Header */}
        <div className="w-full flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-black text-xs font-extrabold hover:bg-gray-100 transition active:scale-95 shadow-sm"
          >
            <Undo2 size={15} />
            <span>EXIT</span>
          </button>

          <div className="flex flex-col items-center">
            <h1 className="font-display text-lg tracking-wider text-black">HEADLESS BOT ARENA</h1>
            <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider -mt-1">
              AUTOMATED BENCHMARK SIMULATOR
            </span>
          </div>

          <div className="w-8" />
        </div>

        {/* Bot Algorithm Matchup Selector */}
        <div className="w-full bg-white rounded-3xl p-3 border-2 border-black shadow-md flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            
            {/* Bot 0 Selector */}
            <div className="p-2 bg-blue-50 rounded-2xl border border-blue-200 flex flex-col gap-1">
              <span className="text-[10px] font-extrabold text-blue-800 uppercase">BOT 1 (BLUE)</span>
              <select
                value={bot0Tier}
                onChange={(e) => setBot0Tier(e.target.value as AiDifficulty)}
                className="w-full text-xs font-extrabold p-1.5 rounded-xl border border-blue-300 bg-white"
              >
                <option value="easy">Apprentice (Easy)</option>
                <option value="normal">Tactician (Normal)</option>
                <option value="grandmaster">Grandmaster (2-Ply Minimax)</option>
              </select>
            </div>

            {/* Bot 1 Selector */}
            <div className="p-2 bg-red-50 rounded-2xl border border-red-200 flex flex-col gap-1">
              <span className="text-[10px] font-extrabold text-red-800 uppercase">BOT 2 (RED)</span>
              <select
                value={bot1Tier}
                onChange={(e) => setBot1Tier(e.target.value as AiDifficulty)}
                className="w-full text-xs font-extrabold p-1.5 rounded-xl border border-red-300 bg-white"
              >
                <option value="easy">Apprentice (Easy)</option>
                <option value="normal">Tactician (Normal)</option>
                <option value="grandmaster">Grandmaster (2-Ply Minimax)</option>
              </select>
            </div>

          </div>

          {/* Speed & Execution Controls */}
          <div className="flex items-center justify-between gap-1.5 pt-1">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-full text-xs font-extrabold">
              {(['1x', '10x'] as const).map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSimSpeed(spd)}
                  className={`px-3 py-1 rounded-full transition ${
                    simSpeed === spd
                      ? 'bg-black text-white shadow-sm'
                      : 'text-gray-700 hover:text-black'
                  }`}
                >
                  {spd}
                </button>
              ))}
            </div>

            <div className="flex gap-1.5">
              <button
                onClick={handleStartLiveDuel}
                className="px-3.5 py-2 rounded-2xl bg-black text-white font-display text-xs tracking-wider flex items-center gap-1.5 hover:bg-gray-800 shadow-sm active:scale-95"
              >
                <Play size={13} />
                <span>LIVE DUEL</span>
              </button>

              <button
                onClick={() => handleRunInstantBatch(25)}
                className="px-3.5 py-2 rounded-2xl bg-[#ACF234] text-black font-display text-xs tracking-wider flex items-center gap-1.5 hover:bg-[#9BE322] shadow-sm active:scale-95"
              >
                <FastForward size={13} />
                <span>100x BENCHMARK (25G)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Simulation Board */}
        <div className="w-full mt-1">
          <div className="w-full flex items-center justify-between px-3 py-1 bg-white/80 rounded-t-2xl border-t-2 border-x-2 border-black text-xs font-bold">
            <span>Turn: {turnCount}</span>
            <span>
              {liveWinner !== null
                ? `🏆 ${livePlayers[liveWinner].name} WINS!`
                : isRunning
                ? `⚡ ${livePlayers[liveTurn].name} THINKING...`
                : 'IDLE'}
            </span>
          </div>

          <Board
            players={livePlayers}
            walls={liveWalls}
            currentTurn={liveTurn}
            myPlayerIndex={0}
            isMyTurn={false}
            onMakeMove={() => {}}
            onPlaceWall={() => {}}
          />
        </div>

        {/* Batch Summary Benchmark Card */}
        {batchSummary && (
          <div className="w-full bg-white rounded-3xl p-4 border-2 border-black shadow-xl flex flex-col gap-3 mt-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <BarChart3 size={18} className="text-blue-600" />
                <h3 className="font-display text-sm tracking-wider text-black">
                  BENCHMARK TELEMETRY ({batchSummary.totalGames} DUELS)
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-gray-500">
                Avg {batchSummary.averageTurns} turns
              </span>
            </div>

            {/* Win Rate Progress Bar */}
            <div className="w-full flex flex-col gap-1">
              <div className="flex justify-between text-xs font-extrabold">
                <span className="text-blue-600">Bot 1: {batchSummary.p0WinRate}% ({batchSummary.p0Wins}W)</span>
                <span className="text-red-600">Bot 2: {batchSummary.p1WinRate}% ({batchSummary.p1Wins}W)</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex border border-black/10">
                <div style={{ width: `${batchSummary.p0WinRate}%` }} className="h-full bg-blue-600" />
                <div style={{ width: `${batchSummary.p1WinRate}%` }} className="h-full bg-red-600" />
              </div>
            </div>

            {/* Recent Match Log Strip */}
            <div className="w-full max-h-32 overflow-y-auto flex flex-col gap-1 text-[11px] font-mono font-bold border-t border-gray-100 pt-2">
              {batchSummary.games.slice(0, 8).map((g, idx) => (
                <div key={idx} className="flex justify-between p-1 rounded-lg bg-gray-50">
                  <span>Match #{idx + 1}: {g.winnerName}</span>
                  <span className="text-gray-500">{g.turns} turns ({g.durationMs}ms)</span>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
