import React from 'react';
import { SettlementResult } from '../types/game';
import { sounds } from '../utils/audio';
import { Sparkles, Trophy, Star, ArrowUpRight, Check } from 'lucide-react';

interface LootDropModalProps {
  result: SettlementResult | null;
  isOpen: boolean;
  onClose: () => void;
  onGoToProfile?: () => void;
}

export const LootDropModal: React.FC<LootDropModalProps> = ({
  result,
  isOpen,
  onClose,
  onGoToProfile,
}) => {
  if (!isOpen || !result) return null;

  const sticker = result.unlockedSticker;
  const isEpic = sticker?.rarity === 'epic';
  const isLegendary = sticker?.rarity === 'legendary';
  const isRare = sticker?.rarity === 'rare';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-[390px] bg-white rounded-3xl p-6 shadow-2xl border-4 border-[#121212] flex flex-col items-center relative overflow-hidden select-none">
        
        {/* Confetti / Rayburst Glow in Background */}
        <div
          className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-30 pointer-events-none blur-3xl animate-pulse"
          style={{
            background: isLegendary
              ? 'radial-gradient(circle, #F59E0B 0%, transparent 70%)'
              : isEpic
              ? 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)'
              : 'radial-gradient(circle, #3B82F6 0%, transparent 70%)',
          }}
        />

        {/* Top Header Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-black text-white text-xs font-display tracking-widest rounded-full uppercase shadow-md mb-3">
          <Trophy size={14} className="text-amber-400 fill-amber-400" />
          <span>MATCH REWARD SETTLEMENT</span>
        </div>

        {/* Level Up Announcement (if applicable) */}
        {result.leveledUp && (
          <div className="w-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 p-2.5 rounded-2xl border-2 border-amber-600 shadow-md text-center mb-3 animate-bounce">
            <span className="text-xs font-black uppercase text-amber-950 tracking-wider flex items-center justify-center gap-1">
              <Sparkles size={14} />
              LEVEL UP! REACHED LEVEL {result.newLevel}
              <Sparkles size={14} />
            </span>
          </div>
        )}

        {/* XP Breakdown Card */}
        <div className="w-full bg-gray-50 rounded-2xl p-3 border border-gray-200 flex items-center justify-around mb-4">
          <div className="flex flex-col items-center">
            <span className="text-xl font-display text-blue-600">+{result.xpGained} XP</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Total Earned</span>
          </div>

          <div className="w-px h-8 bg-gray-200" />

          <div className="flex flex-col items-center">
            <span className="text-xl font-display text-emerald-600">+{result.bonusWallXp} XP</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Wall Bonus</span>
          </div>

          <div className="w-px h-8 bg-gray-200" />

          <div className="flex flex-col items-center">
            <span className="text-xl font-display text-purple-600">LVL {result.newLevel}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Current Tier</span>
          </div>
        </div>

        {/* Unlocked Sticker Card (if dropped) */}
        {sticker ? (
          <div className="w-full flex flex-col items-center">
            <div className="text-xs font-extrabold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Star size={12} className="text-amber-500 fill-amber-400" />
              <span>NEW STICKER UNLOCKED!</span>
            </div>

            {/* Sticker Die-cut Vinyl Preview */}
            {sticker.imageUrl && (sticker.imageUrl.endsWith('.jpg') || sticker.imageUrl.endsWith('.png')) ? (
              <div className="relative mb-3 flex flex-col items-center">
                <div
                  className="relative select-none"
                  style={{ width: '150px', height: '150px' }}
                >
                  <img
                    src={sticker.imageUrl}
                    alt={sticker.name}
                    className={`w-full h-full object-contain rounded-3xl streetwear-sticker drop-shadow-2xl ${
                      isLegendary ? 'sticker-foil-gold' : isRare ? 'sticker-holo-prism' : ''
                    }`}
                  />
                  <div className="absolute inset-0 rounded-3xl pointer-events-none bg-gradient-to-b from-white/20 to-transparent opacity-60" />
                </div>
                <span className="text-xs font-black uppercase mt-2 tracking-tight text-center text-gray-900">
                  {sticker.name}
                </span>
                <span
                  className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full mt-1 ${
                    isLegendary
                      ? 'bg-amber-900 text-yellow-300'
                      : isEpic
                      ? 'bg-purple-900 text-pink-200'
                      : isRare
                      ? 'bg-blue-900 text-cyan-200'
                      : 'bg-black text-white'
                  }`}
                >
                  {sticker.rarity}
                </span>
              </div>
            ) : (
              <div
                className={`relative rounded-3xl p-5 flex flex-col items-center justify-center shadow-xl mb-3 border-4 streetwear-sticker ${
                  isLegendary
                    ? 'bg-gradient-to-br from-amber-300 via-yellow-100 to-amber-500 border-amber-600 ring-4 ring-yellow-400/50'
                    : isEpic
                    ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-600 border-purple-200 text-white'
                    : isRare
                    ? 'bg-gradient-to-br from-cyan-400 via-teal-300 to-blue-500 border-white text-gray-900'
                    : 'bg-white border-black text-black'
                }`}
                style={{ width: '150px', height: '150px' }}
              >
                <span className="text-6xl drop-shadow-md">{sticker.badgeEmoji || '🏷️'}</span>
                <span className="text-xs font-extrabold uppercase mt-1 tracking-tight text-center">
                  {sticker.name}
                </span>
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full mt-1 ${
                    isLegendary
                      ? 'bg-amber-900 text-yellow-300'
                      : isEpic
                      ? 'bg-purple-900 text-pink-200'
                      : isRare
                      ? 'bg-blue-900 text-cyan-200'
                      : 'bg-black text-white'
                  }`}
                >
                  {sticker.rarity}
                </span>
              </div>
            )}

            {sticker.description && (
              <p className="text-xs text-center text-gray-600 max-w-[280px] mb-4">
                {sticker.description}
              </p>
            )}
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center text-gray-400 text-xs font-bold text-center">
            <span>Keep battling to unlock rare & legendary deck stickers!</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full flex items-center gap-2">
          {onGoToProfile && sticker && (
            <button
              onClick={() => {
                sounds.playPawnHop();
                onClose();
                onGoToProfile();
              }}
              className="flex-1 py-3 px-4 rounded-2xl bg-black text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md hover:bg-gray-800 transition active:scale-95"
            >
              <span>VIEW ON DECK</span>
              <ArrowUpRight size={14} />
            </button>
          )}

          <button
            onClick={() => {
              sounds.playPawnHop();
              onClose();
            }}
            className="flex-1 py-3 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-900 font-extrabold text-xs flex items-center justify-center gap-1 transition active:scale-95"
          >
            <Check size={14} />
            <span>CONTINUE</span>
          </button>
        </div>

      </div>
    </div>
  );
};
