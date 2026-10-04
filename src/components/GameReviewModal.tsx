import React, { useState } from 'react';
import { MatchAnalysis, Player, MoveQuality } from '../types/game';
import { Board } from './Board';
import { AvatarGraphic } from './Avatars';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Share2,
  Check,
  Zap,
  TrendingUp,
  Award,
} from 'lucide-react';
import { sounds } from '../utils/audio';

interface GameReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: MatchAnalysis;
  players: Player[];
  winner: number | null;
}

const QUALITY_STYLES: Record<MoveQuality, { label: string; badge: string; bg: string; text: string; icon: string }> = {
  brilliant: { label: 'Brilliant', badge: '!!', bg: 'bg-[#06B6D4]', text: 'text-white', icon: '💎' },
  great: { label: 'Great', badge: '!', bg: 'bg-[#10B981]', text: 'text-white', icon: '✨' },
  best: { label: 'Best', badge: '★', bg: 'bg-[#3B82F6]', text: 'text-white', icon: '🎯' },
  inaccuracy: { label: 'Inaccuracy', badge: '?', bg: 'bg-[#F59E0B]', text: 'text-white', icon: '⚠️' },
  blunder: { label: 'Blunder', badge: '??', bg: 'bg-[#EF4444]', text: 'text-white', icon: '💥' },
};

export const GameReviewModal: React.FC<GameReviewModalProps> = ({
  isOpen,
  onClose,
  analysis,
  players,
  winner,
}) => {
  const [currentTurnIdx, setCurrentTurnIdx] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'review' | 'shareCard'>('review');

  if (!isOpen || analysis.turns.length === 0) return null;

  const currentTurn = analysis.turns[currentTurnIdx];
  const activeMover = players[currentTurn.playerIndex];
  const qualityMeta = QUALITY_STYLES[currentTurn.quality];

  const handleNext = () => {
    if (currentTurnIdx < analysis.turns.length - 1) {
      sounds.playPawnHop();
      setCurrentTurnIdx(currentTurnIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentTurnIdx > 0) {
      sounds.playPawnHop();
      setCurrentTurnIdx(currentTurnIdx - 1);
    }
  };

  const handleCopySummary = () => {
    sounds.playTurnChirp();
    const summaryText = `Quoridor Online Game Review:
🏆 Winner: ${winner !== null ? players[winner].name : 'Draw'}
📊 ${players[0].name}: ${analysis.p0Accuracy}% Accuracy (${analysis.p0QualityCounts.brilliant} 💎 Brilliants)
📊 ${players[1].name}: ${analysis.p1Accuracy}% Accuracy
⏱️ Total Moves: ${analysis.turns.length}
🎯 Turning Point: ${analysis.turningPointDescription}
Play online: https://quoridor.game`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in select-none">
      <div className="w-full max-w-lg bg-[#FAF8F2] rounded-[36px] border-4 border-black shadow-[0_24px_60px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header Bar */}
        <div className="bg-[#121212] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="text-[#ACF234]" size={22} />
            <div>
              <h2 className="font-display text-lg tracking-wider text-white">GAME REVIEW</h2>
              <span className="text-[10px] text-gray-400 font-bold block -mt-1">
                CHESS.COM STYLE EVALUATION
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'review' ? 'shareCard' : 'review')}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-gray-200 transition"
            >
              {viewMode === 'review' ? 'VIEW REPLAY CARD' : 'INTERACTIVE REVIEW'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {viewMode === 'review' ? (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
            
            {/* CAPS Accuracy Score Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Player 0 Accuracy */}
              <div className="bg-white rounded-2xl p-3 border-2 border-black/10 shadow-sm flex items-center gap-3">
                <AvatarGraphic id={players[0].avatar} size={44} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-extrabold text-gray-900 truncate block">{players[0].name}</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-display text-2xl text-blue-600">{analysis.p0Accuracy}%</span>
                    <span className="text-[10px] font-extrabold text-gray-400">ACCURACY</span>
                  </div>
                  {/* Quality Pills */}
                  <div className="flex gap-1 mt-1 text-[9px] font-extrabold">
                    {analysis.p0QualityCounts.brilliant > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800 font-bold">
                        {analysis.p0QualityCounts.brilliant} 💎
                      </span>
                    )}
                    {analysis.p0QualityCounts.blunder > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-800 font-bold">
                        {analysis.p0QualityCounts.blunder} 💥
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Player 1 Accuracy */}
              <div className="bg-white rounded-2xl p-3 border-2 border-black/10 shadow-sm flex items-center gap-3">
                <AvatarGraphic id={players[1].avatar} size={44} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-extrabold text-gray-900 truncate block">{players[1].name}</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-display text-2xl text-red-600">{analysis.p1Accuracy}%</span>
                    <span className="text-[10px] font-extrabold text-gray-400">ACCURACY</span>
                  </div>
                  <div className="flex gap-1 mt-1 text-[9px] font-extrabold">
                    {analysis.p1QualityCounts.brilliant > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800 font-bold">
                        {analysis.p1QualityCounts.brilliant} 💎
                      </span>
                    )}
                    {analysis.p1QualityCounts.blunder > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-800 font-bold">
                        {analysis.p1QualityCounts.blunder} 💥
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Turning Point Highlight Banner */}
            <div
              onClick={() => setCurrentTurnIdx(analysis.clutchTurnIndex)}
              className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-2.5 flex items-center gap-2.5 cursor-pointer hover:bg-amber-100 transition shadow-sm"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center text-black shrink-0 font-extrabold">
                <Zap size={18} className="fill-black" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">
                  CLUTCH TURNING POINT (CLICK TO JUMP)
                </span>
                <p className="text-xs font-bold text-amber-950 truncate">
                  {analysis.turningPointDescription}
                </p>
              </div>
            </div>

            {/* Interactive Timeline Graph */}
            <div className="bg-white rounded-2xl p-3 border-2 border-black/10 shadow-sm flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                <span className="flex items-center gap-1">
                  <TrendingUp size={14} />
                  <span>Win Probability Timeline</span>
                </span>
                <span className="font-mono text-[11px]">
                  Turn {currentTurnIdx + 1} / {analysis.turns.length}
                </span>
              </div>

              {/* Advantage bar with tick scrubber */}
              <div className="w-full h-8 bg-gray-100 rounded-xl flex overflow-hidden border border-black/10 relative">
                {analysis.turns.map((t, idx) => {
                  const prob = t.playerIndex === 0 ? t.winProbabilityAfter : 1 - t.winProbabilityAfter;
                  const isCurrent = idx === currentTurnIdx;
                  const isClutch = idx === analysis.clutchTurnIndex;

                  return (
                    <div
                      key={idx}
                      onClick={() => setCurrentTurnIdx(idx)}
                      style={{ width: `${100 / analysis.turns.length}%` }}
                      className={`h-full cursor-pointer transition-all relative ${
                        isCurrent ? 'bg-black ring-2 ring-black z-10' : prob >= 0.5 ? 'bg-blue-400' : 'bg-red-400'
                      }`}
                      title={`Turn ${idx + 1}: ${t.quality} (${(prob * 100).toFixed(0)}% Win Prob)`}
                    >
                      {isClutch && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Board at Current Scrubber Turn */}
            <div className="w-full flex flex-col items-center">
              <Board
                players={currentTurn.playersAtTurn}
                walls={currentTurn.wallsAtTurn}
                currentTurn={currentTurn.playerIndex}
                myPlayerIndex={0}
                isMyTurn={false}
                onMakeMove={() => {}}
                onPlaceWall={() => {}}
              />
            </div>

            {/* Move Annotation & Explanation Card */}
            <div className="bg-white rounded-2xl p-3.5 border-2 border-black/15 shadow-md flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl ${qualityMeta.bg} flex items-center justify-center text-white font-display text-base shrink-0 shadow-sm`}>
                {qualityMeta.badge}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-gray-900">
                      {activeMover.name} played {currentTurn.move.type === 'wall' ? 'Wall' : 'Move'}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.2 rounded-full ${qualityMeta.bg} text-white`}>
                      {qualityMeta.label}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-gray-500">
                    Turn {currentTurn.turnNumber}
                  </span>
                </div>

                <p className="text-xs text-gray-700 font-medium leading-snug mt-1">
                  {currentTurn.explanation}
                </p>

                {/* Detour metrics comparison */}
                <div className="mt-2 flex gap-3 text-[11px] font-mono font-bold text-gray-500 border-t border-gray-100 pt-1.5">
                  <span>Player Path: {currentTurn.dPlayerBefore} → {currentTurn.dPlayerAfter}</span>
                  <span>Opponent Path: {currentTurn.dOppBefore} → {currentTurn.dOppAfter}</span>
                </div>
              </div>
            </div>

            {/* Scrubber Controls */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                onClick={handlePrev}
                disabled={currentTurnIdx === 0}
                className="flex items-center gap-1 px-4 py-2.5 rounded-full bg-white border border-black font-extrabold text-xs disabled:opacity-30 hover:bg-gray-100 transition active:scale-95 shadow-sm"
              >
                <ChevronLeft size={16} />
                <span>PREV TURN</span>
              </button>

              <span className="font-display text-base text-gray-800">
                {currentTurnIdx + 1} / {analysis.turns.length}
              </span>

              <button
                onClick={handleNext}
                disabled={currentTurnIdx === analysis.turns.length - 1}
                className="flex items-center gap-1 px-4 py-2.5 rounded-full bg-black text-white font-extrabold text-xs disabled:opacity-30 hover:bg-gray-800 transition active:scale-95 shadow-sm"
              >
                <span>NEXT TURN</span>
                <ChevronRight size={16} />
              </button>
            </div>

          </div>
        ) : (
          /* Instant Replay & Social Share Card View */
          <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-4">
            
            {/* The Exportable Social Card */}
            <div className="w-full max-w-sm bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-black rounded-3xl p-5 text-white border-4 border-amber-400 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
              
              {/* Background ambient glow */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

              {/* Title & Handles */}
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-amber-400" />
                <span className="font-display text-xs tracking-widest text-amber-400">QUORIDOR ESPORTS SUMMARY</span>
              </div>

              <h3 className="font-display text-2xl tracking-wider text-white">
                {winner !== null ? `${players[winner].name.toUpperCase()} WINS!` : 'DRAW MATCH!'}
              </h3>

              {/* Avatars Head-to-Head */}
              <div className="my-3 flex items-center justify-center gap-6">
                <div className="flex flex-col items-center">
                  <AvatarGraphic id={players[0].avatar} size={54} />
                  <span className="text-xs font-bold mt-1 truncate max-w-[80px]">{players[0].name}</span>
                  <span className="font-display text-lg text-blue-400">{analysis.p0Accuracy}%</span>
                </div>

                <div className="font-display text-xl text-gray-500">VS</div>

                <div className="flex flex-col items-center">
                  <AvatarGraphic id={players[1].avatar} size={54} />
                  <span className="text-xs font-bold mt-1 truncate max-w-[80px]">{players[1].name}</span>
                  <span className="font-display text-lg text-red-400">{analysis.p1Accuracy}%</span>
                </div>
              </div>

              {/* Animated Mini SVG Board Replay */}
              <div className="w-48 aspect-square bg-white/10 rounded-2xl p-2 border border-white/20 my-2 relative flex items-center justify-center">
                <svg viewBox="0 0 90 90" className="w-full h-full">
                  {/* Mini tiles */}
                  {Array.from({ length: 9 }).map((_, r) =>
                    Array.from({ length: 9 }).map((_, c) => (
                      <rect
                        key={`${r}-${c}`}
                        x={c * 10 + 1}
                        y={r * 10 + 1}
                        width="8"
                        height="8"
                        rx="1.5"
                        fill="rgba(255,255,255,0.15)"
                      />
                    ))
                  )}

                  {/* Placed Walls */}
                  {analysis.turns[analysis.turns.length - 1]?.wallsAtTurn.map((w, idx) => (
                    <rect
                      key={idx}
                      x={w.orientation === 'H' ? w.x * 10 : (w.x + 1) * 10 - 1}
                      y={w.orientation === 'H' ? (w.y + 1) * 10 - 1 : w.y * 10}
                      width={w.orientation === 'H' ? 20 : 2}
                      height={w.orientation === 'H' ? 2 : 20}
                      fill={w.placedBy === 0 ? '#3B82F6' : '#EF4444'}
                      rx="1"
                    />
                  ))}

                  {/* Animated Pawns */}
                  <circle cx={players[0].x * 10 + 5} cy={players[0].y * 10 + 5} r="3.5" fill="#3B82F6" stroke="#FFF" strokeWidth="1" />
                  <circle cx={players[1].x * 10 + 5} cy={players[1].y * 10 + 5} r="3.5" fill="#EF4444" stroke="#FFF" strokeWidth="1" />
                </svg>
              </div>

              {/* Stats Strip */}
              <div className="w-full grid grid-cols-3 gap-2 bg-white/5 rounded-xl p-2 border border-white/10 text-xs font-bold text-gray-300">
                <div>
                  <span className="block text-[9px] text-gray-400">TURNS</span>
                  <span>{analysis.turns.length}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-gray-400">BRILLIANTS</span>
                  <span className="text-cyan-400">{analysis.p0QualityCounts.brilliant + analysis.p1QualityCounts.brilliant} 💎</span>
                </div>
                <div>
                  <span className="block text-[9px] text-gray-400">BLUNDERS</span>
                  <span className="text-red-400">{analysis.p0QualityCounts.blunder + analysis.p1QualityCounts.blunder} 💥</span>
                </div>
              </div>

            </div>

            {/* Copy / Export Action Buttons */}
            <div className="w-full max-w-sm flex gap-2">
              <button
                onClick={handleCopySummary}
                className="flex-1 py-3 rounded-full bg-black text-white font-display text-xs tracking-wider shadow-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition active:scale-95"
              >
                {copied ? <Check size={16} className="text-[#ACF234]" /> : <Share2 size={16} />}
                <span>{copied ? 'SUMMARY COPIED!' : 'SHARE TO DISCORD / SOCIALS'}</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
