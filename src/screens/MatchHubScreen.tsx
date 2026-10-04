import React, { useState } from 'react';
import { AvatarGraphic } from '../components/Avatars';
import { Search, Bell, Zap, Swords, Users, Bot, KeyRound, Sparkles, Trophy, Cloud, ShieldCheck, Grid, Play } from 'lucide-react';
import { GameMode, AiDifficulty } from '../types/game';
import { AiDifficultyModal } from '../components/AiDifficultyModal';
import { AuthModal } from '../components/AuthModal';
import { useAuth } from '../hooks/useAuth';

interface MatchHubScreenProps {
  onStartGame: (
    mode: GameMode,
    options?: { vsAi?: boolean; aiDifficulty?: AiDifficulty; roomCode?: string }
  ) => void;
  onOpenMasterLogin: () => void;
  isMaster: boolean;
  userAvatar: string;
  userName: string;
  onOpenSandbox?: () => void;
  onOpenBotArena?: () => void;
  onOpenCampaign?: () => void;
  onOpenDotsAndBoxes?: () => void;
  onGoToProfile?: () => void;
}

export const MatchHubScreen: React.FC<MatchHubScreenProps> = ({
  onStartGame,
  onOpenMasterLogin,
  isMaster,
  userAvatar,
  userName,
  onOpenSandbox,
  onOpenBotArena,
  onOpenCampaign,
  onOpenDotsAndBoxes,
  onGoToProfile,
}) => {
  const { isGuest, profile } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [roomInput, setRoomInput] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);

  const handleAiDifficultySelect = (difficulty: AiDifficulty) => {
    onStartGame('ai', { vsAi: true, aiDifficulty: difficulty });
  };

  return (
    <div className="w-full min-h-[100dvh] bg-gradient-to-b from-[#FFF574] via-[#FCE440] to-[#FACC15] flex flex-col items-center select-none overflow-y-auto">
      
      {/* Mobile Shell Container */}
      <div className="w-full max-w-md mx-auto relative flex flex-col justify-between min-h-[100dvh] px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
        
        {/* Main Content Column */}
        <div className="w-full flex flex-col items-center">
          
          {/* Top App Bar with Avatar & Actions */}
          <div className="w-full flex items-center justify-between">
            {/* Left: Player Profile Badge */}
            <div
              onClick={onGoToProfile}
              className="flex items-center gap-2.5 bg-white/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-black/10 shadow-sm cursor-pointer hover:bg-white/90 transition active:scale-95"
            >
              <div className="relative">
                <AvatarGraphic id={userAvatar} size={36} />
                {isMaster && (
                  <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full border border-black animate-pulse" />
                )}
              </div>

              <div className="flex flex-col text-left">
                <span className="text-[10px] font-black text-neutral-600 uppercase tracking-wider leading-none">PLAYER</span>
                <span className="text-sm font-extrabold text-neutral-900 leading-tight">
                  {profile?.username || userName}
                </span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Supabase Cloud Auth Status */}
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-black/10 shadow-sm text-[10px] font-black transition active:scale-95 ${
                  isGuest
                    ? 'bg-white/80 text-neutral-800 hover:bg-white'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-400'
                }`}
                title={isGuest ? 'Claim Permanent Account' : 'Account Verified'}
              >
                {isGuest ? <Cloud size={12} /> : <ShieldCheck size={12} className="text-emerald-700" />}
                <span>{isGuest ? 'GUEST' : (profile?.username || 'SYNCED')}</span>
              </button>

              {/* Master Key Trigger */}
              <button
                onClick={onOpenMasterLogin}
                className={`p-2 rounded-full border border-black/10 shadow-sm transition active:scale-95 ${
                  isMaster ? 'bg-amber-400 text-black animate-pulse' : 'bg-white/80 text-neutral-800 hover:bg-white'
                }`}
                title="Master Oracle / Admin"
              >
                <KeyRound size={16} />
              </button>

              {/* Notification Bell */}
              <div className="relative p-2 rounded-full bg-white/80 border border-black/10 shadow-sm text-neutral-800 cursor-pointer">
                <Bell size={16} />
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center">
                  2
                </div>
              </div>
            </div>
          </div>

          {/* Hero Title Stack (Clean vertical flex layout with gap-2, zero rogue background labels) */}
          <div className="w-full flex flex-col items-center gap-2 mt-4">
            {/* Title: WELCOME! in Anton Display */}
            <h1 className="font-['Anton'] font-display tracking-wide text-4xl sm:text-5xl text-neutral-900 text-center leading-none">
              WELCOME!
            </h1>

            {/* Hero Overlapping Sticker Avatars (Die-cut stroke, no stray text behind) */}
            <div className="flex items-center justify-center my-1">
              <div className="flex items-center justify-center">
                <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-full bg-white ring-4 ring-white shadow-lg flex items-center justify-center overflow-hidden z-10 -mr-4 transform -rotate-3 hover:scale-105 transition">
                  <AvatarGraphic id="james" size={88} />
                </div>
                <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-full bg-white ring-4 ring-white shadow-lg flex items-center justify-center overflow-hidden z-20 transform rotate-3 hover:scale-105 transition">
                  <AvatarGraphic id="dino" size={88} />
                </div>
              </div>
            </div>

            {/* Subtitle */}
            <h2 className="font-['Plus_Jakarta_Sans'] font-sans text-neutral-800 font-semibold text-lg text-center leading-tight">
              Find your local game
            </h2>
          </div>

          {/* Search / Room Code Input */}
          <div className="w-full mt-3">
            <div className="w-full bg-white/90 backdrop-blur rounded-full py-3 px-4 sm:py-3.5 sm:px-5 flex items-center gap-3 shadow-sm border border-neutral-100">
              <Search size={18} className="text-neutral-400 shrink-0" />
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                placeholder="SEARCH OR ENTER 6-DIGIT ROOM CODE"
                maxLength={6}
                className="w-full bg-transparent uppercase tracking-wider text-xs font-bold text-neutral-700 placeholder:text-neutral-400 focus:outline-none"
              />
              {roomInput.length >= 4 && (
                <button
                  onClick={() => onStartGame('friends', { roomCode: roomInput })}
                  className="px-3.5 py-1.5 bg-neutral-950 text-white text-xs font-bold rounded-full hover:bg-neutral-800 transition active:scale-95 shrink-0 shadow-sm"
                >
                  JOIN
                </button>
              )}
            </div>
          </div>

          {/* Game Mode Cards */}
          <div className="w-full grid grid-cols-2 gap-3 mt-4">
            
            {/* Card 1: 1v1 Ranked Duel */}
            <div
              onClick={() => onStartGame('1v1')}
              className="group bg-white rounded-3xl p-4 shadow-[0_8px_20px_rgba(0,0,0,0.06)] border border-neutral-100 flex flex-col justify-between cursor-pointer hover:-translate-y-1 transition duration-200 active:scale-95"
            >
              <div>
                <div className="w-full aspect-[4/3] rounded-2xl bg-gradient-to-br from-[#93C5FF] to-[#3B82F6] p-2 flex items-center justify-center relative overflow-hidden shadow-inner">
                  <span className="absolute top-1.5 left-2.5 font-display text-2xl sm:text-3xl text-white/90 drop-shadow">
                    1
                  </span>
                  <div className="w-13 h-13 rounded-full bg-white/90 ring-2 ring-white shadow flex items-center justify-center overflow-hidden transform group-hover:scale-105 transition">
                    <AvatarGraphic id="dino" size={54} />
                  </div>
                </div>

                <h3 className="font-extrabold text-sm text-neutral-900 mt-2.5">
                  1v1 Duel
                </h3>
                <p className="text-[11px] text-neutral-500 leading-tight mt-0.5">
                  Ranked matchmaking. Block, leap, and conquer the grid.
                </p>
              </div>

              <div className="mt-3 pt-1 flex items-center justify-between">
                <span className="text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
                  <Swords size={11} />
                  <span>1V1 RANKED</span>
                </span>
                <Swords size={15} className="text-neutral-400 group-hover:text-blue-600 transition" />
              </div>
            </div>

            {/* Card 2: Private Room */}
            <div
              onClick={() => onStartGame('friends')}
              className="group bg-white rounded-3xl p-4 shadow-[0_8px_20px_rgba(0,0,0,0.06)] border border-neutral-100 flex flex-col justify-between cursor-pointer hover:-translate-y-1 transition duration-200 active:scale-95"
            >
              <div>
                <div className="w-full aspect-[4/3] rounded-2xl bg-gradient-to-br from-[#FDE047] to-[#CA8A04] p-2 flex items-center justify-center relative overflow-hidden shadow-inner">
                  <span className="absolute top-1.5 left-2.5 font-display text-2xl sm:text-3xl text-white/90 drop-shadow">
                    2
                  </span>
                  <div className="w-13 h-13 rounded-full bg-white/90 ring-2 ring-white shadow flex items-center justify-center overflow-hidden transform group-hover:scale-105 transition">
                    <AvatarGraphic id="james" size={54} />
                  </div>
                </div>

                <h3 className="font-extrabold text-sm text-neutral-900 mt-2.5">
                  Private Room
                </h3>
                <p className="text-[11px] text-neutral-500 leading-tight mt-0.5">
                  Play with friends. Custom turn timers & local pass-and-play.
                </p>
              </div>

              <div className="mt-3 pt-1 flex items-center justify-between">
                <span className="text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                  <Users size={11} />
                  <span>CUSTOM ROOM</span>
                </span>
                <Users size={15} className="text-neutral-400 group-hover:text-amber-600 transition" />
              </div>
            </div>

          </div>

          {/* Card 2.5: The Gauntlet Solo Campaign */}
          <div
            onClick={onOpenCampaign}
            className="w-full mt-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-3.5 shadow-[0_8px_20px_rgba(245,158,11,0.25)] border border-amber-400/50 flex items-center justify-between cursor-pointer hover:-translate-y-0.5 transition active:scale-95 group text-white"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-black/30 backdrop-blur-sm border border-white/20 flex items-center justify-center text-amber-300 shadow-md">
                <Trophy size={24} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm text-white">
                    The Gauntlet
                  </h3>
                  <span className="text-[9px] font-black px-1.5 py-0.2 bg-black/30 text-amber-200 border border-white/20 rounded-full">
                    20 LEVELS
                  </span>
                </div>
                <p className="text-[11px] text-amber-100/90">
                  Solo campaign puzzles & 15s blitz trials
                </p>
              </div>
            </div>

            <span className="px-3 py-1 bg-black text-amber-300 border border-amber-400 text-xs font-black rounded-full group-hover:bg-neutral-900 transition flex items-center gap-1">
              <Sparkles size={11} />
              <span>PLAY</span>
            </span>
          </div>

          {/* Card 3: AI Training Bot with 4 Difficulty Levels */}
          <div
            onClick={() => setShowAiModal(true)}
            className="w-full mt-3 bg-white rounded-3xl p-3.5 shadow-[0_8px_20px_rgba(0,0,0,0.06)] border border-neutral-100 flex items-center justify-between cursor-pointer hover:-translate-y-0.5 transition active:scale-95 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#A3E635] to-[#65A30D] flex items-center justify-center text-white shadow-md">
                <Bot size={24} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm text-neutral-900">
                    AI Battle Academy
                  </h3>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-green-100 text-green-800 rounded-full">
                    4 TIERS
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Apprentice, Tactician, Minimax & Glendenning MCTS
                </p>
              </div>
            </div>

            <span className="px-3 py-1 bg-neutral-950 text-white text-xs font-bold rounded-full group-hover:bg-neutral-800 transition">
              SELECT
            </span>
          </div>

          {/* Card 4: Dots & Boxes Arena */}
          <div
            onClick={onOpenDotsAndBoxes}
            className="w-full mt-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-3.5 shadow-[0_8px_20px_rgba(79,70,229,0.25)] border border-indigo-400/50 flex items-center justify-between cursor-pointer hover:-translate-y-0.5 transition active:scale-95 group text-white"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-black/30 backdrop-blur-sm border border-white/20 flex items-center justify-center text-cyan-300 shadow-md">
                <Grid size={24} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm text-white">
                    Dots & Boxes Arena
                  </h3>
                  <span className="text-[9px] font-black px-1.5 py-0.2 bg-black/30 text-cyan-200 border border-white/20 rounded-full">
                    NEW GAME
                  </span>
                </div>
                <p className="text-[11px] text-indigo-100/90">
                  2-4 Players, 4 AI levels & Double-Cross Master Engine
                </p>
              </div>
            </div>

            <span className="px-3 py-1 bg-black text-cyan-300 border border-cyan-400 text-xs font-black rounded-full group-hover:bg-neutral-900 transition flex items-center gap-1">
              <Play size={11} />
              <span>PLAY</span>
            </span>
          </div>

          {/* Developer & Sandbox Tools Row */}
          <div className="w-full grid grid-cols-2 gap-2.5 mt-3">
            
            {/* Labyrinth Sandbox */}
            <div
              onClick={onOpenSandbox}
              className="p-3 bg-white rounded-2xl border border-neutral-100 shadow-sm flex items-center gap-2.5 cursor-pointer hover:border-black transition active:scale-95"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
                <Sparkles size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-extrabold text-neutral-900 block truncate">Labyrinth Sandbox</span>
                <span className="text-[10px] font-bold text-neutral-400 block truncate">Puzzle Builder</span>
              </div>
            </div>

            {/* Headless Bot Arena */}
            <div
              onClick={onOpenBotArena}
              className="p-3 bg-white rounded-2xl border border-neutral-100 shadow-sm flex items-center gap-2.5 cursor-pointer hover:border-black transition active:scale-95"
            >
              <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-700 shrink-0">
                <Bot size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-extrabold text-neutral-900 block truncate">Bot Arena (100x)</span>
                <span className="text-[10px] font-bold text-neutral-400 block truncate">Duel Telemetry</span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* AI Difficulty Selector Modal */}
      <AiDifficultyModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onSelectDifficulty={handleAiDifficultySelect}
      />

      {/* Supabase Cloud Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

    </div>
  );
};
