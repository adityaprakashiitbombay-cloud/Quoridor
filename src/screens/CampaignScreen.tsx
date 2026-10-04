import React, { useState } from 'react';
import { CampaignLevelConfig } from '../types/game';
import { CAMPAIGN_LEVELS, getCampaignLevel } from '../game/campaignLevels';
import { getUserProfile } from '../lib/progressionRpc';
import { MASTER_STICKERS } from '../lib/progressionRpc';
import { sounds } from '../utils/audio';
import { Undo2, Star, Lock, Play, ShieldAlert, Zap, Trophy, Sparkles, Clock, CheckCircle } from 'lucide-react';

interface CampaignScreenProps {
  onBack: () => void;
  onStartCampaignLevel: (level: CampaignLevelConfig) => void;
}

export const CampaignScreen: React.FC<CampaignScreenProps> = ({
  onBack,
  onStartCampaignLevel,
}) => {
  const profile = getUserProfile();
  const unlockedLevel = profile.campaignLevel || 1;
  const [selectedLevel, setSelectedLevel] = useState<CampaignLevelConfig | null>(null);

  const handleOpenLevel = (level: CampaignLevelConfig) => {
    if (level.levelNumber > unlockedLevel) {
      sounds.playInvalidAction();
      return;
    }
    sounds.playPawnHop();
    setSelectedLevel(level);
  };

  const handleDeploy = () => {
    if (!selectedLevel) return;
    sounds.playTurnChirp();
    onStartCampaignLevel(selectedLevel);
  };

  return (
    <div className="w-full min-h-[100dvh] bg-gradient-to-b from-[#1C1815] via-[#2A231C] to-[#12100E] px-4 pt-4 pb-28 flex flex-col items-center select-none overflow-y-auto text-white">
      
      {/* Mobile Shell Container */}
      <div className="w-full max-w-[430px] flex flex-col items-center">
        
        {/* Top Bar */}
        <div className="w-full flex items-center justify-between">
          <button
            onClick={() => {
              sounds.playPawnHop();
              onBack();
            }}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95 border border-white/10"
          >
            <Undo2 size={18} />
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
            <Trophy size={14} />
            <span>PROGRESS: LEVEL {unlockedLevel}/20</span>
          </div>
        </div>

        {/* Hero Title */}
        <div className="mt-4 flex flex-col items-center text-center">
          <div className="flex items-center gap-1 text-xs font-mono tracking-widest text-amber-400 uppercase">
            <Sparkles size={12} />
            <span>SOLO CAMPAIGN TRIALS</span>
            <Sparkles size={12} />
          </div>
          <h1 className="text-[44px] sm:text-[50px] font-display tracking-wider leading-none text-white mt-1">
            THE GAUNTLET
          </h1>
          <p className="text-xs text-stone-400 max-w-[320px] mt-1">
            Sequential puzzles, asymmetric barrier labyrinths, and 15s AlphaZero blitz trials.
          </p>
        </div>

        {/* Campaign Roadmap List */}
        <div className="w-full flex flex-col gap-3 mt-6">
          {CAMPAIGN_LEVELS.map((level) => {
            const isUnlocked = level.levelNumber <= unlockedLevel;
            const isCompleted = level.levelNumber < unlockedLevel;
            const isCurrent = level.levelNumber === unlockedLevel;
            const rewardSticker = MASTER_STICKERS.find((s) => s.slug === level.rewardStickerSlug);

            return (
              <div
                key={level.levelNumber}
                onClick={() => handleOpenLevel(level)}
                className={`w-full rounded-2xl p-4 border transition-all duration-200 flex items-center justify-between ${
                  isCurrent
                    ? 'bg-gradient-to-r from-amber-950/60 to-stone-900 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)] scale-[1.02] cursor-pointer'
                    : isCompleted
                    ? 'bg-stone-900/80 border-stone-700 hover:border-stone-500 cursor-pointer'
                    : 'bg-stone-950/60 border-stone-800/80 opacity-50 cursor-not-allowed'
                }`}
              >
                {/* Left: Level Number Node & Tier Badge */}
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-display text-lg shadow-inner ${
                      isCurrent
                        ? 'bg-amber-500 text-black animate-pulse'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-800 text-stone-500'
                    }`}
                  >
                    {isCompleted ? <CheckCircle size={20} /> : !isUnlocked ? <Lock size={18} /> : level.levelNumber}
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-extrabold text-white">
                        {level.title}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full ${
                          level.tier === 'master'
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : level.tier === 'tactical'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-stone-800 text-stone-300'
                        }`}
                      >
                        {level.tier}
                      </span>
                    </div>

                    <span className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">
                      {level.subtitle}
                    </span>
                  </div>
                </div>

                {/* Right: Reward Sticker & Status */}
                <div className="flex items-center gap-2">
                  {rewardSticker && (
                    <div
                      className="w-8 h-8 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center text-base overflow-hidden"
                      title={`Reward: ${rewardSticker.name}`}
                    >
                      {rewardSticker.imageUrl.endsWith('.jpg') || rewardSticker.imageUrl.endsWith('.png') ? (
                        <img
                          src={rewardSticker.imageUrl}
                          alt={rewardSticker.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        rewardSticker.badgeEmoji
                      )}
                    </div>
                  )}

                  {isCurrent && (
                    <span className="px-2.5 py-1 bg-amber-400 text-black text-[10px] font-black rounded-full uppercase shadow">
                      PLAY
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Level Briefing Modal */}
      {selectedLevel && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 text-stone-900">
          <div className="w-full max-w-[390px] bg-white rounded-3xl p-6 border-4 border-[#121212] shadow-2xl flex flex-col items-center select-none">
            
            {/* Level Title & Tier */}
            <div className="w-full flex items-center justify-between pb-2 border-b border-stone-200">
              <span className="text-xs font-black uppercase text-stone-400 tracking-wider">
                GAUNTLET // LEVEL {selectedLevel.levelNumber}
              </span>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  selectedLevel.tier === 'master'
                    ? 'bg-red-100 text-red-800'
                    : selectedLevel.tier === 'tactical'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-stone-100 text-stone-800'
                }`}
              >
                {selectedLevel.tier} TRIAL
              </span>
            </div>

            <h2 className="text-2xl font-extrabold text-stone-900 mt-3 text-center">
              {selectedLevel.title}
            </h2>
            <p className="text-xs text-stone-500 text-center mt-0.5">
              {selectedLevel.subtitle}
            </p>

            {/* Tactical Conditions Grid */}
            <div className="w-full grid grid-cols-3 gap-2 mt-4">
              
              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 flex flex-col items-center text-center">
                <span className="text-xs font-extrabold text-stone-900">
                  {selectedLevel.playerWalls} vs {selectedLevel.opponentWalls}
                </span>
                <span className="text-[9px] font-bold text-stone-400 uppercase">Walls (P vs Opp)</span>
              </div>

              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 flex flex-col items-center text-center">
                <span className="text-xs font-extrabold text-stone-900">
                  {selectedLevel.turnTimerSeconds}s
                </span>
                <span className="text-[9px] font-bold text-stone-400 uppercase">Turn Clock</span>
              </div>

              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 flex flex-col items-center text-center">
                <span className="text-xs font-extrabold text-stone-900">
                  {selectedLevel.preplacedWalls.length}
                </span>
                <span className="text-[9px] font-bold text-stone-400 uppercase">Barriers</span>
              </div>

            </div>

            {/* Objective Box */}
            <div className="w-full bg-amber-50 rounded-2xl p-3 border border-amber-200 mt-3">
              <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider block mb-1">
                PRIMARY OBJECTIVE
              </span>
              <p className="text-xs font-bold text-amber-950 leading-snug">
                {selectedLevel.objective}
              </p>
            </div>

            {/* Bot Opponent Dossier */}
            <div className="w-full flex items-center justify-between px-2 py-2 mt-2 text-xs text-stone-600">
              <span className="font-bold">Opponent: {selectedLevel.botName}</span>
              <span className="text-[11px] font-mono text-stone-400 uppercase">
                Diff: {selectedLevel.aiDifficulty}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex items-center gap-2 mt-4">
              <button
                onClick={() => setSelectedLevel(null)}
                className="py-3 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-extrabold text-xs transition active:scale-95"
              >
                BACK
              </button>

              <button
                onClick={handleDeploy}
                className="flex-1 py-3 px-4 rounded-2xl bg-black text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg hover:bg-stone-800 transition active:scale-95"
              >
                <Play size={14} className="fill-white" />
                <span>DEPLOY INTO TRIAL</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
