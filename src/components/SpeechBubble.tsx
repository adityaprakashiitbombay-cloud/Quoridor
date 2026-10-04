import React, { useEffect, useState } from 'react';
import { QuickChatCallout } from '../types/game';

interface SpeechBubbleProps {
  callout: QuickChatCallout | null;
  position?: 'top' | 'bottom';
  align?: 'left' | 'right' | 'center';
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  callout,
  position = 'top',
  align = 'center',
}) => {
  const [visible, setVisible] = useState<boolean>(false);
  const [currentCallout, setCurrentCallout] = useState<QuickChatCallout | null>(null);

  useEffect(() => {
    if (callout) {
      setCurrentCallout(callout);
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [callout]);

  if (!visible || !currentCallout) return null;

  return (
    <div
      className={`absolute z-50 pointer-events-none transition-all duration-300 transform ${
        visible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
      } ${
        position === 'top'
          ? '-top-12 left-1/2 -translate-x-1/2'
          : '-bottom-12 left-1/2 -translate-x-1/2'
      }`}
      style={{ minWidth: '130px', maxWidth: '220px' }}
    >
      {/* Speech Bubble Container */}
      <div className="relative bg-white text-gray-900 px-3 py-1.5 rounded-2xl border-[3px] border-[#121212] shadow-[0_6px_16px_rgba(0,0,0,0.22)] flex items-center justify-center gap-1.5 whitespace-nowrap animate-in zoom-in-75 fade-in duration-200">
        <span className="text-base drop-shadow-sm">{currentCallout.emoji}</span>
        <span className="text-xs font-black tracking-tight text-gray-900 font-sans">
          {currentCallout.phrase}
        </span>

        {/* Comic Speech Pointer Tail */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-solid ${
            position === 'top'
              ? 'border-t-[8px] border-t-[#121212] border-x-[7px] border-x-transparent border-b-0 -bottom-[8px]'
              : 'border-b-[8px] border-b-[#121212] border-x-[7px] border-x-transparent border-t-0 -top-[8px]'
          }`}
        />
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-solid ${
            position === 'top'
              ? 'border-t-[6px] border-t-white border-x-[5px] border-x-transparent border-b-0 -bottom-[6px]'
              : 'border-b-[6px] border-b-white border-x-[5px] border-x-transparent border-t-0 -top-[6px]'
          }`}
        />
      </div>
    </div>
  );
};
