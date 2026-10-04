import React from 'react';
import { AvatarGraphic } from './Avatars';
import { calculateXpRequired } from '../lib/progressionRpc';
import { Sparkles, Star } from 'lucide-react';

interface RadialXpRingProps {
  avatarId: string;
  pawnBadge?: string;
  level: number;
  currentXp: number;
  eloRating: number;
  size?: number;
  strokeWidth?: number;
  onClick?: () => void;
}

export const RadialXpRing: React.FC<RadialXpRingProps> = ({
  avatarId,
  pawnBadge = 'crown',
  level,
  currentXp,
  eloRating,
  size = 170,
  strokeWidth = 7,
  onClick,
}) => {
  // Required XP for current level to reach next level
  const xpRequiredForCurrent = calculateXpRequired(level);
  const xpRequiredForPrev = level > 1 ? calculateXpRequired(level - 1) : 0;
  const levelSpan = Math.max(1, xpRequiredForCurrent - xpRequiredForPrev);
  const progressIntoLevel = Math.max(0, currentXp - xpRequiredForPrev);
  const progressRatio = Math.min(1, Math.max(0, progressIntoLevel / levelSpan));

  const center = size / 2;
  const radius = center - strokeWidth - 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressRatio * circumference;

  // Compute stars based on ELO
  const starCount = eloRating >= 2000 ? 5 : eloRating >= 1700 ? 4 : eloRating >= 1400 ? 3 : eloRating >= 1200 ? 2 : 1;

  return (
    <div
      onClick={onClick}
      className="relative flex flex-col items-center justify-center cursor-pointer group select-none"
      style={{ width: size, height: size }}
    >
      {/* SVG Radial Progress Ring */}
      <svg
        width={size}
        height={size}
        className="absolute inset-0 transform -rotate-90 pointer-events-none drop-shadow-md"
      >
        <defs>
          <linearGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background Track Circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(0, 0, 0, 0.12)"
          strokeWidth={strokeWidth}
        />

        {/* Dynamic XP Progress Stroke */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#xpGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          filter="url(#glow)"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Avatar Graphic in Center */}
      <div className="relative transform group-hover:scale-105 transition-transform duration-300">
        <AvatarGraphic id={avatarId} size={size - strokeWidth * 4} badge={pawnBadge} />
      </div>

      {/* Level Pill Badge at Bottom Center */}
      <div className="absolute -bottom-2 bg-[#121212] text-white px-3 py-0.5 rounded-full border-2 border-white shadow-lg flex items-center gap-1.5 z-20 group-hover:scale-110 transition-transform">
        <Sparkles size={11} className="text-amber-400 fill-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
        <span className="text-[11px] font-display tracking-wider">LVL {level}</span>
        <div className="flex items-center -space-x-0.5 text-amber-400">
          {Array.from({ length: starCount }).map((_, i) => (
            <Star key={i} size={9} className="fill-amber-400" />
          ))}
        </div>
      </div>
    </div>
  );
};
