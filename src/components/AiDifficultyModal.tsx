import React from 'react';
import { AiDifficulty } from '../types/game';
import { Bot, Zap, Shield, Sparkles, X, ChevronRight } from 'lucide-react';
import { sounds } from '../utils/audio';

interface AiDifficultyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDifficulty: (difficulty: AiDifficulty) => void;
}

export const AiDifficultyModal: React.FC<AiDifficultyModalProps> = ({
  isOpen,
  onClose,
  onSelectDifficulty,
}) => {
  if (!isOpen) return null;

  const handleSelect = (diff: AiDifficulty) => {
    sounds.playTurnChirp();
    onSelectDifficulty(diff);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-sm bg-gradient-to-b from-[#FAF7EE] to-[#EFE7D2] text-[#121212] rounded-[32px] p-6 border-4 border-black shadow-[0_20px_50px_rgba(0,0,0,0.4)] relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/5 hover:bg-black/10 text-gray-700 transition"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#A3E635] to-[#65A30D] flex items-center justify-center text-white shadow-md mb-2">
            <Bot size={30} />
          </div>

          <h2 className="text-2xl font-display tracking-wider text-black">
            SELECT AI LEVEL
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Choose your AI opponent's tactical intelligence
          </p>
        </div>

        {/* 3 Difficulty Tiers */}
        <div className="mt-5 flex flex-col gap-2.5">
          
          {/* 1. Easy / Apprentice */}
          <div
            onClick={() => handleSelect('easy')}
            className="bg-white rounded-2xl p-3.5 border-2 border-black/10 hover:border-green-500 shadow-sm cursor-pointer transition transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                <Shield size={20} />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-gray-900">Apprentice</span>
                  <span className="text-[9px] font-extrabold px-2 py-0.2 bg-green-100 text-green-800 rounded-full">
                    EASY
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                  Clean pathfinding, gentle defense, relaxed play.
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400 group-hover:text-green-600 transition" />
          </div>

          {/* 2. Normal / Tactician */}
          <div
            onClick={() => handleSelect('normal')}
            className="bg-white rounded-2xl p-3.5 border-2 border-black/10 hover:border-amber-500 shadow-sm cursor-pointer transition transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Zap size={20} />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-gray-900">Tactician</span>
                  <span className="text-[9px] font-extrabold px-2 py-0.2 bg-amber-100 text-amber-800 rounded-full">
                    NORMAL
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                  Dual-path tracking, detour maximization, wall economy.
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400 group-hover:text-amber-600 transition" />
          </div>

          {/* 3. Grandmaster / Alpha Engine */}
          <div
            onClick={() => handleSelect('grandmaster')}
            className="bg-white rounded-2xl p-3.5 border-2 border-black/10 hover:border-red-500 shadow-sm cursor-pointer transition transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <Sparkles size={20} className="fill-red-500" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-gray-900">Grandmaster</span>
                  <span className="text-[9px] font-extrabold px-2 py-0.2 bg-red-100 text-red-800 rounded-full">
                    MINIMAX
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                  2-Ply Minimax, counter-trap foresight, ruthless blocking.
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400 group-hover:text-red-600 transition" />
          </div>

          {/* 4. Glendenning MCTS (Alpha Adinomide) */}
          <div
            onClick={() => handleSelect('mcts')}
            className="bg-white rounded-2xl p-3.5 border-2 border-black/10 hover:border-purple-500 shadow-sm cursor-pointer transition transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Zap size={20} className="fill-purple-500" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-gray-900">Alpha Adinomide</span>
                  <span className="text-[9px] font-extrabold px-2 py-0.2 bg-purple-100 text-purple-800 rounded-full">
                    MCTS
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                  Victor Glendenning MCTS: PUCT search & progressive detour bias.
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400 group-hover:text-purple-600 transition" />
          </div>

        </div>

      </div>
    </div>
  );
};
