import React from 'react';
import { sounds } from '../utils/audio';
import { MessageSquare, X } from 'lucide-react';

export interface QuickChatPreset {
  id: string;
  phrase: string;
  emoji: string;
}

export const QUICK_CHAT_PRESETS: QuickChatPreset[] = [
  { id: 'block', phrase: 'Nice block!', emoji: '🧱' },
  { id: 'mistake', phrase: 'Big mistake...', emoji: '😈' },
  { id: 'hurry', phrase: 'Hurry up!', emoji: '⏳' },
  { id: 'gg', phrase: 'Good game!', emoji: '🤝' },
  { id: 'brain', phrase: 'Calculating...', emoji: '🧠' },
  { id: 'close', phrase: 'Close one!', emoji: '💨' },
  { id: 'checkmate', phrase: 'Checkmate?', emoji: '♟️' },
  { id: 'rematch', phrase: 'Rematch?', emoji: '🔁' },
];

interface QuickChatWheelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCallout: (preset: QuickChatPreset) => void;
}

export const QuickChatWheel: React.FC<QuickChatWheelProps> = ({
  isOpen,
  onClose,
  onSelectCallout,
}) => {
  if (!isOpen) return null;

  const handleSelect = (preset: QuickChatPreset) => {
    sounds.playPawnHop();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
    onSelectCallout(preset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-20 px-3 pointer-events-auto animate-in fade-in duration-150">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm -z-10"
        onClick={onClose}
      />

      {/* Quick-Chat Wheel / Dock Container */}
      <div className="w-full max-w-[400px] bg-white/95 backdrop-blur-md rounded-3xl p-4 border-4 border-[#121212] shadow-[0_12px_36px_rgba(0,0,0,0.3)] flex flex-col gap-3 animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
        
        {/* Header Strip */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase text-gray-800 tracking-wider">
            <MessageSquare size={14} className="text-blue-600" />
            <span>TACTICAL QUICK-CHAT</span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-500 transition active:scale-90"
            title="Close Quick-Chat"
          >
            <X size={16} />
          </button>
        </div>

        {/* 2-Column Radial / Dock Grid */}
        <div className="grid grid-cols-2 gap-2">
          {QUICK_CHAT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelect(preset)}
              className="py-2.5 px-3 rounded-2xl bg-gray-50 hover:bg-yellow-50 border-2 border-black/10 hover:border-black text-left flex items-center gap-2.5 shadow-sm hover:shadow transition-all duration-150 active:scale-95 group"
            >
              <span className="text-xl group-hover:scale-110 transition-transform select-none">
                {preset.emoji}
              </span>
              <span className="text-xs font-black text-gray-800 group-hover:text-black truncate">
                {preset.phrase}
              </span>
            </button>
          ))}
        </div>

        <div className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-wider">
          One-tap tactical broadcast to room
        </div>
      </div>
    </div>
  );
};
