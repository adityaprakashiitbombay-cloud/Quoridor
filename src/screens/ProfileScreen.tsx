import React, { useState } from 'react';
import { AvatarGraphic, AVATAR_LIST, HexBadge, STREETWEAR_BADGES } from '../components/Avatars';
import { WallMaterial, MatchHistoryEntry } from '../types/game';
import { RadialXpRing } from '../components/RadialXpRing';
import { InteractiveStickerDeck } from '../components/InteractiveStickerDeck';
import { MiniMatchReplayModal } from '../components/MiniMatchReplayModal';
import { getUserProfile, getMatchHistory, calculateXpRequired } from '../lib/progressionRpc';
import {
  Undo2,
  Pencil,
  Flame,
  Star,
  ShieldCheck,
  Trophy,
  Sparkles,
  Layers,
  Sparkle,
  History,
  TrendingUp,
  Target,
  Percent,
  PlayCircle,
  Database,
} from 'lucide-react';
import { sounds } from '../utils/audio';

const WALL_MATERIALS: { id: WallMaterial; name: string; icon: string; previewClass: string }[] = [
  { id: 'caution', name: 'Caution Tape', icon: '🚧', previewClass: 'wall-mat-caution' },
  { id: 'neon', name: 'Neon Acrylic', icon: '⚡', previewClass: 'wall-mat-neon' },
  { id: 'carbon', name: 'Carbon Fiber', icon: '🏎️', previewClass: 'wall-mat-carbon' },
  { id: 'concrete', name: 'Concrete', icon: '🧱', previewClass: 'wall-mat-concrete' },
  { id: 'wood', name: 'Birch Wood', icon: '🌲', previewClass: 'wall-mat-wood' },
];

interface ProfileScreenProps {
  currentAvatar: string;
  onSelectAvatar: (avatarId: string) => void;
  userName: string;
  onBack: () => void;
  isMaster: boolean;
  wallMaterial?: WallMaterial;
  onSelectWallMaterial?: (mat: WallMaterial) => void;
  pawnBadge?: string;
  onSelectPawnBadge?: (badge: string) => void;
  onOpenDataExtraction?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentAvatar,
  onSelectAvatar,
  userName,
  onBack,
  isMaster,
  wallMaterial = 'caution',
  onSelectWallMaterial,
  pawnBadge = 'cap',
  onSelectPawnBadge,
  onOpenDataExtraction,
}) => {
  const profile = getUserProfile();
  const matchHistory = getMatchHistory(20);
  const [selectedReplayMatch, setSelectedReplayMatch] = useState<MatchHistoryEntry | null>(null);

  // Performance Radar & Stats Strip Calculations
  const totalMatches = profile.matchesPlayed || 1;
  const winCount = profile.matchesWon || 0;
  const lossCount = Math.max(0, totalMatches - winCount);
  const winRatePercentage = Math.round((winCount / totalMatches) * 100);

  // Average turns to victory
  const avgTurns = winCount > 0 ? Math.round(profile.totalTurns / totalMatches) || 22 : 24;

  // Trap Efficiency ratio: detours created / walls placed (defaults to 1.8x if new)
  const trapEfficiency =
    profile.wallsPlaced > 0
      ? (profile.detoursCreated / profile.wallsPlaced).toFixed(1)
      : '2.4';

  const xpRequiredForNext = calculateXpRequired(profile.level);

  return (
    <div className="w-full min-h-[100dvh] bg-gradient-to-b from-[#60A7FF] via-[#7BB7FF] to-[#BDDCFF] px-4 pt-4 pb-28 flex flex-col items-center select-none overflow-y-auto">
      
      {/* Mobile Shell */}
      <div className="w-full max-w-[430px] flex flex-col items-center">
        
        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between">
          <button
            onClick={() => {
              sounds.playPawnHop();
              onBack();
            }}
            className="w-10 h-10 rounded-full bg-white text-black shadow-sm flex items-center justify-center hover:bg-gray-100 transition active:scale-95"
          >
            <Undo2 size={18} strokeWidth={2.5} />
          </button>

          <span className="text-base font-extrabold text-[#121212] tracking-wide">
            Streetwear & Style
          </span>

          <button className="w-10 h-10 rounded-full bg-white text-black shadow-sm flex items-center justify-center hover:bg-gray-100 transition active:scale-95">
            <Pencil size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Player Name Display Header (Anton heavy font) */}
        <h1 className="mt-3 text-[44px] sm:text-[52px] font-display text-[#121212] tracking-wider leading-none text-center">
          {userName.toUpperCase()}
        </h1>

        {/* Following & Followers Metric Rows */}
        <div className="w-full flex items-center justify-center gap-10 mt-1">
          <div className="flex flex-col items-center">
            <span className="font-display text-2xl text-[#121212]">22</span>
            <span className="text-xs font-bold text-black/60 -mt-1">following</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="font-display text-2xl text-[#121212]">14</span>
            <span className="text-xs font-bold text-black/60 -mt-1">followers</span>
          </div>
        </div>

        {/* Hero 3D Avatar Wrapped in Smooth Radial SVG XP Progress Ring */}
        <div className="my-2 relative flex items-center justify-center">
          <RadialXpRing
            avatarId={currentAvatar}
            pawnBadge={pawnBadge}
            level={profile.level}
            currentXp={profile.xp}
            eloRating={profile.eloRating}
            size={180}
            strokeWidth={8}
          />
          {isMaster && (
            <div className="absolute top-2 right-2 bg-amber-400 text-black px-2 py-0.5 rounded-full border border-black text-[10px] font-extrabold shadow-md flex items-center gap-1 animate-pulse">
              <Sparkles size={11} />
              <span>ORACLE ACTIVE</span>
            </div>
          )}
        </div>

        {/* XP Progress Details Bar */}
        <div className="w-full bg-white/70 backdrop-blur-sm rounded-full px-3 py-1 flex items-center justify-between text-[11px] font-extrabold text-gray-800 border border-black/10 mt-1">
          <span>Level {profile.level} Progress</span>
          <span className="text-blue-600 font-mono">
            {profile.xp} / {xpRequiredForNext} XP
          </span>
        </div>

        {/* 1. Performance Radar / Stats Strip */}
        <div className="w-full bg-white/90 backdrop-blur-md rounded-2xl p-3 shadow-sm border border-black/10 mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-extrabold text-gray-800">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-blue-600" />
              <span>PERFORMANCE STATS STRIP</span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">ELO: {profile.eloRating}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            
            {/* Metric 1: Win Rate % */}
            <div className="bg-blue-50/80 p-2.5 rounded-xl border border-blue-100 flex flex-col items-center text-center">
              <div className="flex items-center gap-1 text-blue-700 font-display text-lg leading-none">
                <Percent size={14} strokeWidth={3} />
                <span>{winRatePercentage}%</span>
              </div>
              <span className="text-[9px] font-extrabold text-blue-900/60 uppercase mt-1">
                Win Rate ({winCount}W-{lossCount}L)
              </span>
            </div>

            {/* Metric 2: Average Turns to Victory */}
            <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-100 flex flex-col items-center text-center">
              <div className="flex items-center gap-1 text-emerald-700 font-display text-lg leading-none">
                <Target size={14} strokeWidth={3} />
                <span>{avgTurns}</span>
              </div>
              <span className="text-[9px] font-extrabold text-emerald-900/60 uppercase mt-1">
                Avg Turns / Win
              </span>
            </div>

            {/* Metric 3: Trap Efficiency */}
            <div className="bg-purple-50/80 p-2.5 rounded-xl border border-purple-100 flex flex-col items-center text-center">
              <div className="flex items-center gap-1 text-purple-700 font-display text-lg leading-none">
                <Sparkle size={14} strokeWidth={3} />
                <span>{trapEfficiency}x</span>
              </div>
              <span className="text-[9px] font-extrabold text-purple-900/60 uppercase mt-1">
                Trap Detour Ratio
              </span>
            </div>

          </div>
        </div>

        {/* 2. Trophy Sticker Deck: Skateboard / Laptop Lid Physical Canvas with 3D Tilt */}
        <InteractiveStickerDeck />

        {/* 3. Match Timeline Scrubber (Last 20 Matches with interactive mini-board replay) */}
        <div className="w-full bg-white/90 backdrop-blur-md rounded-2xl p-3 shadow-sm border border-black/10 mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-extrabold text-gray-800">
            <div className="flex items-center gap-1.5">
              <History size={14} className="text-amber-500" />
              <span>MATCH TIMELINE SCRUBBER</span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">Last 20 Matches</span>
          </div>

          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1 mt-1">
            {matchHistory.map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  sounds.playPawnHop();
                  setSelectedReplayMatch(m);
                }}
                className="w-full bg-gray-50 hover:bg-gray-100 p-2 rounded-xl border border-black/5 flex items-center justify-between cursor-pointer transition active:scale-[0.99] group"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      m.isWin ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-gray-900 group-hover:text-blue-600 transition">
                      vs {m.player2Name || 'Opponent'}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {m.gameMode.replace('_', ' ')} • {m.turnsCount} turns
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      m.isWin
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {m.isWin ? 'WIN' : 'LOSS'}
                  </span>
                  <PlayCircle size={15} className="text-gray-400 group-hover:text-blue-600" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Avatar Customizer / Switcher Bar */}
        <div className="w-full bg-white/80 backdrop-blur-md rounded-2xl p-2 shadow-sm border border-black/10 flex items-center justify-around mt-3">
          {AVATAR_LIST.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                sounds.playPawnHop();
                onSelectAvatar(item.id);
              }}
              className={`p-1.5 rounded-xl transition flex flex-col items-center gap-1 ${
                currentAvatar === item.id
                  ? 'bg-black text-white scale-110 shadow-md ring-2 ring-black'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <AvatarGraphic id={item.id} size={32} showStickerBorder={false} />
              <span className="text-[10px] font-extrabold">{item.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* 5. Streetwear Pawn Badges */}
        <div className="w-full bg-white/90 backdrop-blur-md rounded-2xl p-3 shadow-sm border border-black/10 mt-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-gray-800">
            <Sparkle size={14} className="text-amber-500" />
            <span>PAWN STREETWEAR BADGE</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5 pt-1">
            {STREETWEAR_BADGES.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  sounds.playPawnHop();
                  onSelectPawnBadge?.(b.id);
                }}
                className={`py-1.5 px-1 rounded-xl flex flex-col items-center gap-0.5 transition ${
                  pawnBadge === b.id
                    ? 'bg-black text-white shadow-md ring-2 ring-black scale-105'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                }`}
              >
                <span className="text-lg">{b.icon}</span>
                <span className="text-[9px] font-extrabold truncate w-full text-center">{b.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 6. Tactile Wall Materials Selector */}
        <div className="w-full bg-white/90 backdrop-blur-md rounded-2xl p-3 shadow-sm border border-black/10 mt-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-gray-800">
            <Layers size={14} className="text-blue-500" />
            <span>TACTILE WALL MATERIAL</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5 pt-1">
            {WALL_MATERIALS.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  sounds.playWallSnap();
                  onSelectWallMaterial?.(m.id);
                }}
                className={`p-1.5 rounded-xl flex flex-col items-center gap-1 transition ${
                  wallMaterial === m.id
                    ? 'bg-black text-white shadow-md ring-2 ring-black scale-105'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                }`}
              >
                <div className={`w-full h-4 rounded-md ${m.previewClass}`} />
                <span className="text-[9px] font-extrabold truncate w-full text-center">{m.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Data Extraction & Telemetry Card */}
        {onOpenDataExtraction && (
          <div
            onClick={onOpenDataExtraction}
            className="w-full bg-neutral-900 text-white rounded-2xl p-3 shadow-sm border border-neutral-850 mt-3 flex items-center justify-between cursor-pointer hover:border-cyan-400 transition active:scale-95 group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                <Database size={16} />
              </div>
              <div className="text-left">
                <span className="text-xs font-black block text-white">Export Game Data & History</span>
                <span className="text-[10px] text-neutral-400 block font-medium">Download JSON/CSV and sync real-time tables</span>
              </div>
            </div>
            <span className="text-[10px] font-black text-cyan-300 px-2.5 py-1 bg-black/60 rounded-xl border border-neutral-700 group-hover:border-cyan-400 transition">
              EXPORT
            </span>
          </div>
        )}

        {/* Hexagonal Badges */}
        <div className="w-full bg-white/90 backdrop-blur-md rounded-3xl p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)] border border-black/10 mt-3 flex items-center justify-around">
          <HexBadge numberText="365" theme="blue" label="Champion" />
          <HexBadge numberText="100" theme="yellow" label="Century" />
          <HexBadge numberText="50" theme="lime" label="Speedster" />
        </div>

      </div>

      {/* Mini-Match Replay Modal */}
      <MiniMatchReplayModal
        match={selectedReplayMatch}
        isOpen={selectedReplayMatch !== null}
        onClose={() => setSelectedReplayMatch(null)}
      />

    </div>
  );
};
