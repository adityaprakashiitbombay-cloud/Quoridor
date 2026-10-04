import React, { useState, useEffect } from 'react';
import { Player, OracleAdvice, QuickChatCallout } from '../types/game';
import { AvatarGraphic } from './Avatars';
import { SpeechBubble } from './SpeechBubble';
import { Sparkles, Zap, ChevronDown, ChevronUp, Smile, Volume2, VolumeX, MessageSquare, Clock } from 'lucide-react';
import { sounds } from '../utils/audio';

interface HUDProps {
  players: Player[];
  currentTurn: number;
  myPlayerIndex: number;
  turnTimeLeft: number;
  maxTurnTime?: number;
  isTimerEnabled?: boolean;
  onToggleTimer?: () => void;
  oracleAdvice?: OracleAdvice | null;
  isMaster: boolean;
  onAutoExecuteOracle?: () => void;
  onSendEmote: (emoji: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onSurrender?: () => void;
  p1Callout?: QuickChatCallout | null;
  p2Callout?: QuickChatCallout | null;
  onOpenQuickChat?: () => void;
}

const EMOTE_LIST = ['🔥', '🧱', '😎', '🏃‍♂️', '🤯', '👑', '👏', '👀'];

export const HUD: React.FC<HUDProps> = ({
  players,
  currentTurn,
  myPlayerIndex,
  turnTimeLeft,
  maxTurnTime = 30,
  isTimerEnabled = true,
  onToggleTimer,
  oracleAdvice,
  isMaster,
  onAutoExecuteOracle,
  onSendEmote,
  isMuted,
  onToggleMute,
  p1Callout = null,
  p2Callout = null,
  onOpenQuickChat,
}) => {
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const [showOracleDetails, setShowOracleDetails] = useState(false);

  // Low time warning tick and mobile pulse
  useEffect(() => {
    if (isTimerEnabled && turnTimeLeft <= 5 && turnTimeLeft > 0) {
      sounds.playTick();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
    }
  }, [turnTimeLeft, isTimerEnabled]);

  const p1 = players[0];
  const p2 = players[1];
  const isMyTurn = currentTurn === myPlayerIndex;
  const isUrgent = turnTimeLeft <= 5;
  const timerPercent = (turnTimeLeft / maxTurnTime) * 100;

  return (
    <div className="w-full max-w-[430px] mx-auto px-3 flex flex-col gap-2 select-none">
      
      {/* Top Players Bar */}
      <div className="grid grid-cols-2 gap-3 items-center">
        {/* Player 1 Card */}
        <div
          className={`relative p-2 rounded-2xl transition-all duration-200 ${
            currentTurn === 0
              ? 'bg-white shadow-[0_6px_16px_rgba(0,0,0,0.12)] border-2 border-[#121212] scale-[1.02]'
              : 'bg-white/70 border border-gray-200 opacity-80'
          }`}
        >
          {/* Floating Tactical Speech Bubble */}
          <SpeechBubble callout={p1Callout} position="top" />

          <div className="flex items-center gap-2">
            <div className="sticker-diecut">
              <AvatarGraphic id={p1.avatar} size={42} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-extrabold text-gray-900 truncate">
                {p1.name} {myPlayerIndex === 0 ? '(You)' : ''}
              </span>
              <span className="text-[10px] font-bold text-gray-500">
                Target: Row 9
              </span>
            </div>
          </div>

          {/* Wall inventory blocks with 3D bevel */}
          <div className="mt-1.5 flex gap-0.5 items-center">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-all ${
                  i < p1.wallsLeft ? 'bg-[#2563EB] shadow-sm' : 'bg-gray-200'
                }`}
              />
            ))}
            <span className="ml-1 text-[10px] font-extrabold text-gray-600">
              {p1.wallsLeft}
            </span>
          </div>
        </div>

        {/* Player 2 Card */}
        <div
          className={`relative p-2 rounded-2xl transition-all duration-200 ${
            currentTurn === 1
              ? 'bg-white shadow-[0_6px_16px_rgba(0,0,0,0.12)] border-2 border-[#121212] scale-[1.02]'
              : 'bg-white/70 border border-gray-200 opacity-80'
          }`}
        >
          {/* Floating Tactical Speech Bubble */}
          <SpeechBubble callout={p2Callout} position="top" />

          <div className="flex items-center gap-2">
            <div className="sticker-diecut">
              <AvatarGraphic id={p2.avatar} size={42} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-extrabold text-gray-900 truncate">
                {p2.name} {myPlayerIndex === 1 ? '(You)' : ''}
              </span>
              <span className="text-[10px] font-bold text-gray-500">
                Target: Row 1
              </span>
            </div>
          </div>

          {/* Wall inventory blocks with 3D bevel */}
          <div className="mt-1.5 flex gap-0.5 items-center">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-all ${
                  i < p2.wallsLeft ? 'bg-[#DC2626] shadow-sm' : 'bg-gray-200'
                }`}
              />
            ))}
            <span className="ml-1 text-[10px] font-extrabold text-gray-600">
              {p2.wallsLeft}
            </span>
          </div>
        </div>
      </div>

      {/* Turn Timer & Status Strip with Elastic Heartbeat */}
      <div
        className={`relative flex items-center justify-between bg-white/85 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border transition-all ${
          isUrgent ? 'border-red-500 ring-2 ring-red-400/50' : 'border-gray-200'
        }`}
      >
        <div className="flex items-center gap-2 font-extrabold">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isUrgent
                ? 'bg-red-500 animate-ping'
                : isMyTurn
                ? 'bg-[#ACF234] animate-ping'
                : 'bg-[#60A7FF]'
            }`}
          />
          <span className="text-gray-900 text-xs">
            {isMyTurn ? "IT'S YOUR TURN!" : `${players[currentTurn].name}'S TURN`}
          </span>
        </div>

        {/* Dynamic Urgency Timer Ring / Bar or Untimed Badge */}
        <div className="flex items-center gap-2">
          {isTimerEnabled ? (
            <>
              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  style={{ width: `${timerPercent}%` }}
                  className={`h-full transition-all duration-300 ${
                    isUrgent ? 'bg-red-600' : 'bg-[#121212]'
                  }`}
                />
              </div>

              <span
                className={`text-xs font-mono font-extrabold ${
                  isUrgent ? 'text-red-600 animate-timer-heartbeat' : 'text-gray-700'
                }`}
              >
                {turnTimeLeft}s
              </span>
            </>
          ) : (
            <span className="text-[10px] font-mono font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
              ∞ UNTIMED
            </span>
          )}

          {/* Turn Timer ON/OFF Primary Toggle */}
          {onToggleTimer && (
            <button
              onClick={onToggleTimer}
              className={`p-1 rounded-full transition ${
                isTimerEnabled
                  ? 'text-amber-600 hover:bg-amber-50'
                  : 'text-gray-400 hover:bg-gray-100 opacity-60'
              }`}
              title={isTimerEnabled ? 'Turn Timer: ON (Click to disable)' : 'Turn Timer: OFF (Click to enable)'}
            >
              <Clock size={15} />
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className="p-1 rounded-full text-gray-500 hover:text-black transition"
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {/* Quick-Chat Button */}
          {onOpenQuickChat && (
            <button
              onClick={onOpenQuickChat}
              className="p-1 rounded-full text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition active:scale-90"
              title="Tactical Quick-Chat"
            >
              <MessageSquare size={15} />
            </button>
          )}

          {/* Emote Button */}
          <button
            onClick={() => setShowEmotePicker(!showEmotePicker)}
            className="p-1 rounded-full text-gray-600 hover:text-black hover:bg-gray-100 transition"
            title="Reaction Emotes"
          >
            <Smile size={16} />
          </button>
        </div>

        {/* Emote Picker Popover */}
        {showEmotePicker && (
          <div className="absolute top-10 right-2 z-50 bg-white p-2 rounded-2xl shadow-xl border-2 border-black flex gap-1.5 animate-in zoom-in-95">
            {EMOTE_LIST.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onSendEmote(emoji);
                  setShowEmotePicker(false);
                }}
                className="text-xl p-1 hover:scale-125 transition active:scale-95"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MASTER ORACLE HUD (Visible only to ALPHA 1845) */}
      {isMaster && oracleAdvice && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-100 border-2 border-amber-400 rounded-2xl p-2.5 shadow-md flex flex-col gap-1.5 text-xs text-amber-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-extrabold text-amber-900">
              <Zap size={14} className="text-amber-600 fill-amber-500" />
              <span>ALPHA ORACLE</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded-full font-bold">
                ZOBRIST ACCELERATED
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px] font-bold">
              <span className="text-blue-700">You: {oracleAdvice.playerPathLength} steps</span>
              <span>|</span>
              <span className="text-red-700">Opp: {oracleAdvice.opponentPathLength} steps</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                  oracleAdvice.delta >= 0
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {oracleAdvice.delta >= 0 ? `+${oracleAdvice.delta} Lead` : `${oracleAdvice.delta} Deficit`}
              </span>
            </div>
          </div>

          {/* Advice Strip */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/80">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-600" />
              <span className="font-extrabold text-[11px]">
                {oracleAdvice.recommendedAction === 'wall' ? '🧱 WALL RECOMMENDED' : '🏃 ADVANCE PAWN'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {isMyTurn && onAutoExecuteOracle && (
                <button
                  onClick={onAutoExecuteOracle}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-[10px] rounded-full shadow-sm active:scale-95 transition"
                >
                  ⚡ AUTO-PLAY
                </button>
              )}

              <button
                onClick={() => setShowOracleDetails(!showOracleDetails)}
                className="p-0.5 text-amber-800 hover:text-black"
              >
                {showOracleDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>

          {/* Expandable Strategic Reasoning */}
          {showOracleDetails && (
            <div className="mt-1 p-2 bg-white/80 rounded-xl border border-amber-200 text-[11px] leading-snug font-medium text-amber-900 animate-in fade-in">
              <p>{oracleAdvice.reason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
