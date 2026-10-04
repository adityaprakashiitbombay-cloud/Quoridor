import React, { useState, useEffect } from 'react';
import { MatchHistoryEntry, Player, Wall } from '../types/game';
import { sounds } from '../utils/audio';
import { X, Play, Pause, ChevronLeft, ChevronRight, RotateCcw, Trophy, Calendar, Clock } from 'lucide-react';

interface MiniMatchReplayModalProps {
  match: MatchHistoryEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MiniMatchReplayModal: React.FC<MiniMatchReplayModalProps> = ({
  match,
  isOpen,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Reset scrub position when match changes
  useEffect(() => {
    if (match) {
      setCurrentStep(0);
      setIsPlaying(false);
    }
  }, [match]);

  // Auto-play scrubber interval
  useEffect(() => {
    if (!isPlaying || !match || match.moveLog.length === 0) return;

    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= match.moveLog.length) {
          setIsPlaying(false);
          return prev;
        }
        sounds.playTurnChirp();
        return prev + 1;
      });
    }, 900);

    return () => clearInterval(timer);
  }, [isPlaying, match]);

  if (!isOpen || !match) return null;

  const totalMoves = match.moveLog.length;

  // Reconstruct board state at current step
  const initialPlayers: Player[] = [
    {
      id: 'p1',
      name: match.player1Name || 'James',
      avatar: 'james',
      x: 4,
      y: 0,
      targetRow: 8,
      wallsLeft: 10,
      color: '#2563EB',
      accentColor: '#60A7FF',
    },
    {
      id: 'p2',
      name: match.player2Name || 'Opponent',
      avatar: 'dino',
      x: 4,
      y: 8,
      targetRow: 0,
      wallsLeft: 10,
      color: '#DC2626',
      accentColor: '#F87171',
    },
  ];

  let p1Pos = { x: 4, y: 0 };
  let p2Pos = { x: 4, y: 8 };
  const currentWalls: Wall[] = [];

  for (let i = 0; i < currentStep && i < totalMoves; i++) {
    const m = match.moveLog[i];
    if (m.type === 'move' && m.to) {
      if (m.playerIndex === 0) p1Pos = { ...m.to };
      else p2Pos = { ...m.to };
    } else if (m.type === 'wall' && m.wall) {
      currentWalls.push(m.wall);
    }
  }

  const currentMoveRecord = currentStep > 0 && currentStep <= totalMoves ? match.moveLog[currentStep - 1] : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-[420px] bg-white rounded-3xl p-5 shadow-2xl border-2 border-black flex flex-col items-center">
        
        {/* Header Bar */}
        <div className="w-full flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                match.isWin ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {match.isWin ? 'VICTORY' : 'DEFEAT'}
            </span>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {match.gameMode.replace('_', ' ')}
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition active:scale-95"
          >
            <X size={16} />
          </button>
        </div>

        {/* Match Details Strip */}
        <div className="w-full flex items-center justify-between mt-3 px-1 text-xs text-gray-600">
          <div className="flex items-center gap-1 font-bold text-gray-900">
            <span>{match.player1Name}</span>
            <span className="text-gray-400 font-normal">vs</span>
            <span>{match.player2Name}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {match.turnsCount} turns
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {new Date(match.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Interactive Mini-Board Display (9x9 Canvas) */}
        <div className="w-full aspect-square max-w-[320px] bg-[#2E2823] rounded-2xl p-2 mt-3 relative shadow-inner border-2 border-[#1E1915]">
          <div className="w-full h-full grid grid-cols-9 grid-rows-9 gap-1 relative">
            {Array.from({ length: 81 }).map((_, idx) => {
              const x = idx % 9;
              const y = Math.floor(idx / 9);
              const isP1 = p1Pos.x === x && p1Pos.y === y;
              const isP2 = p2Pos.x === x && p2Pos.y === y;

              return (
                <div
                  key={idx}
                  className="w-full h-full rounded bg-[#453C35] flex items-center justify-center relative shadow-sm"
                >
                  {isP1 && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow-md flex items-center justify-center text-[9px] font-bold text-white animate-pulse">
                      P1
                    </div>
                  )}
                  {isP2 && (
                    <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white shadow-md flex items-center justify-center text-[9px] font-bold text-white animate-pulse">
                      P2
                    </div>
                  )}
                </div>
              );
            })}

            {/* Rendered Walls on Mini Board */}
            {currentWalls.map((w) => {
              // Intersections are 0-7; span 2 tiles
              const leftPercent = ((w.x + 1) / 9) * 100;
              const topPercent = ((w.y + 1) / 9) * 100;
              return (
                <div
                  key={w.id}
                  className={`absolute bg-amber-400 rounded-full border border-amber-900 shadow-md ${
                    w.orientation === 'H' ? 'h-1.5' : 'w-1.5'
                  }`}
                  style={{
                    left: `${(w.x / 9) * 100 + 4}%`,
                    top: `${(w.y / 9) * 100 + 4}%`,
                    width: w.orientation === 'H' ? '20%' : '6px',
                    height: w.orientation === 'V' ? '20%' : '6px',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Current Move Notation Badge */}
        <div className="w-full mt-2 text-center text-xs font-bold text-gray-700 min-h-[20px]">
          {currentMoveRecord ? (
            <span>
              Turn {currentStep}: Player {currentMoveRecord.playerIndex + 1} played{' '}
              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300">
                {currentMoveRecord.notation}
              </span>
            </span>
          ) : (
            <span className="text-gray-400">Match Start (Opening Position)</span>
          )}
        </div>

        {/* Timeline Scrubber Slider */}
        <div className="w-full mt-3 flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400">0</span>
          <input
            type="range"
            min={0}
            max={totalMoves}
            value={currentStep}
            onChange={(e) => {
              setCurrentStep(Number(e.target.value));
              sounds.playTurnChirp();
            }}
            className="w-full accent-blue-600 cursor-pointer h-2 bg-gray-200 rounded-lg"
          />
          <span className="text-[10px] font-bold text-gray-400">{totalMoves}</span>
        </div>

        {/* Playback Controls */}
        <div className="w-full flex items-center justify-center gap-3 mt-3">
          <button
            onClick={() => {
              sounds.playTurnChirp();
              setCurrentStep(0);
            }}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition active:scale-95"
            title="Reset to Start"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={() => {
              sounds.playTurnChirp();
              setCurrentStep((s) => Math.max(0, s - 1));
            }}
            disabled={currentStep <= 0}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition active:scale-95 disabled:opacity-40"
            title="Previous Move"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={() => {
              sounds.playPawnHop();
              setIsPlaying(!isPlaying);
            }}
            className="px-5 py-2 rounded-full bg-black text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md hover:bg-gray-800 transition active:scale-95"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} className="fill-white" />}
            <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          <button
            onClick={() => {
              sounds.playTurnChirp();
              setCurrentStep((s) => Math.min(totalMoves, s + 1));
            }}
            disabled={currentStep >= totalMoves}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition active:scale-95 disabled:opacity-40"
            title="Next Move"
          >
            <ChevronRight size={18} />
          </button>
        </div>

      </div>
    </div>
  );
};
