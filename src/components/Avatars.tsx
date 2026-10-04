import React from 'react';

export interface AvatarProps {
  id: string;
  size?: number;
  className?: string;
  showStickerBorder?: boolean;
  badge?: string;
}

export const STREETWEAR_BADGES = [
  { id: 'none', name: 'Clean', icon: '✨' },
  { id: 'crown', name: 'Gold Crown', icon: '👑' },
  { id: 'headphones', name: 'DJ Cans', icon: '🎧' },
  { id: 'cyber-visor', name: 'Cyber Visor', icon: '🥽' },
  { id: 'halo', name: 'Saint Halo', icon: '😇' },
  { id: 'chain', name: 'Gold Chain', icon: '⛓️' },
];

export const StreetwearBadge: React.FC<{ badge?: string; size: number }> = ({ badge, size }) => {
  if (!badge || badge === 'none') return null;

  switch (badge) {
    case 'crown':
      return (
        <svg
          width={size * 0.45}
          height={size * 0.35}
          viewBox="0 0 40 30"
          className="absolute -top-[18%] left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] animate-pulse"
        >
          <path d="M4 24L8 8L20 18L32 8L36 24H4Z" fill="#FACC15" stroke="#B45309" strokeWidth="2" />
          <circle cx="8" cy="8" r="3" fill="#EF4444" />
          <circle cx="20" cy="18" r="3" fill="#3B82F6" />
          <circle cx="32" cy="8" r="3" fill="#10B981" />
        </svg>
      );
    case 'headphones':
      return (
        <svg
          width={size * 0.85}
          height={size * 0.5}
          viewBox="0 0 85 50"
          className="absolute -top-[12%] left-1/2 -translate-x-1/2 z-30 pointer-events-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)]"
        >
          <path d="M12 35C12 12 73 12 73 35" stroke="#18181B" strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M18 32C18 16 67 16 67 32" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" fill="none" />
          <rect x="6" y="24" width="12" height="22" rx="6" fill="#06B6D4" stroke="#18181B" strokeWidth="2.5" />
          <rect x="67" y="24" width="12" height="22" rx="6" fill="#06B6D4" stroke="#18181B" strokeWidth="2.5" />
        </svg>
      );
    case 'cyber-visor':
      return (
        <svg
          width={size * 0.65}
          height={size * 0.28}
          viewBox="0 0 65 28"
          className="absolute top-[38%] left-1/2 -translate-x-1/2 z-30 pointer-events-none drop-shadow-[0_0_8px_#EC4899]"
        >
          <rect x="2" y="2" width="61" height="24" rx="12" fill="#18181B" stroke="#EC4899" strokeWidth="2.5" />
          <rect x="6" y="6" width="53" height="16" rx="8" fill="url(#visor-grad)" />
          <defs>
            <linearGradient id="visor-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
          <path d="M12 14H53" stroke="#FFF" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>
      );
    case 'halo':
      return (
        <svg
          width={size * 0.55}
          height={size * 0.25}
          viewBox="0 0 60 25"
          className="absolute -top-[22%] left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_0_10px_#FACC15] animate-bounce"
        >
          <ellipse cx="30" cy="12" rx="26" ry="8" fill="none" stroke="#FACC15" strokeWidth="4" />
          <ellipse cx="30" cy="12" rx="26" ry="8" fill="none" stroke="#FEF08A" strokeWidth="1.5" />
        </svg>
      );
    case 'chain':
      return (
        <svg
          width={size * 0.6}
          height={size * 0.3}
          viewBox="0 0 60 30"
          className="absolute -bottom-[6%] left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
        >
          <path d="M6 6C15 26 45 26 54 6" stroke="#F59E0B" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <path d="M8 8C16 24 44 24 52 8" stroke="#FDE047" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="30" cy="24" r="5" fill="#FACC15" stroke="#78350F" strokeWidth="1.5" />
          <text x="30" y="27" fontSize="6" fontWeight="bold" textAnchor="middle" fill="#78350F">Q</text>
        </svg>
      );
    default:
      return null;
  }
};

export const AVATAR_LIST = [
  { id: 'james', name: 'James', theme: '#60A7FF', title: 'Streetwear Prodigy' },
  { id: 'dino', name: 'Dino Explorer', theme: '#F7EC4F', title: 'Tactical Scout' },
  { id: 'minty', name: 'Mint Rush', theme: '#ACF234', title: 'Speed Sprinter' },
  { id: 'blaze', name: 'Blaze King', theme: '#FF7A45', title: 'Grandmaster' },
];

export const AvatarGraphic: React.FC<AvatarProps> = ({
  id,
  size = 80,
  className = '',
  showStickerBorder = true,
  badge,
}) => {
  const borderClass = showStickerBorder
    ? 'drop-shadow-[0_8px_12px_rgba(0,0,0,0.18)]'
    : '';

  const renderGraphic = () => {
    switch (id) {
      case 'james':
        // Blue hoodie, backwards beanie, gold shades, cool smile
        return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${borderClass} ${className}`}
        >
          {/* White Die-Cut Sticker Outline */}
          <circle cx="50" cy="50" r="46" fill="#FFFFFF" />
          
          {/* Inner Background Pill */}
          <circle cx="50" cy="50" r="42" fill="#E8F2FF" />

          {/* Body / Blue Streetwear Hoodie */}
          <path
            d="M25 88C25 72 35 68 50 68C65 68 75 72 75 88V92H25V88Z"
            fill="#3B82F6"
          />
          <path
            d="M44 72L47 88M56 72L53 88"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Head & Skin Tone */}
          <circle cx="50" cy="46" r="22" fill="#A86E4B" />

          {/* Cool Ears */}
          <circle cx="28" cy="48" r="5" fill="#A86E4B" />
          <circle cx="72" cy="48" r="5" fill="#A86E4B" />
          <circle cx="28" cy="50" r="2" fill="#FFD700" /> {/* Gold Earring */}

          {/* Backwards Beanie / Cap */}
          <path
            d="M28 42C28 26 38 22 50 22C62 22 72 26 72 42C72 43 28 43 28 42Z"
            fill="#2563EB"
          />
          <rect x="25" y="38" width="50" height="7" rx="3.5" fill="#1D4ED8" />

          {/* Metallic Gold Sunglasses */}
          <rect
            x="32"
            y="43"
            width="16"
            height="11"
            rx="4"
            fill="#FBBF24"
            stroke="#1E293B"
            strokeWidth="2.5"
          />
          <rect
            x="52"
            y="43"
            width="16"
            height="11"
            rx="4"
            fill="#FBBF24"
            stroke="#1E293B"
            strokeWidth="2.5"
          />
          <path d="M48 48H52" stroke="#1E293B" strokeWidth="2.5" />
          {/* Glass Glare */}
          <path d="M35 45L44 45" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M55 45L64 45" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" />

          {/* Confident Grin */}
          <path
            d="M44 59C47 62 53 62 56 59"
            stroke="#1E293B"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'dino':
      // Yellow explorer mascot with bucket hat and compass
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${borderClass} ${className}`}
        >
          {/* White Sticker Outline */}
          <circle cx="50" cy="50" r="46" fill="#FFFFFF" />
          <circle cx="50" cy="50" r="42" fill="#FEFCE8" />

          {/* Yellow Character Body */}
          <ellipse cx="50" cy="56" rx="26" ry="24" fill="#FACC15" />
          
          {/* Cheerful Eyes */}
          <circle cx="41" cy="50" r="5.5" fill="#1E293B" />
          <circle cx="59" cy="50" r="5.5" fill="#1E293B" />
          <circle cx="43" cy="48" r="2" fill="#FFFFFF" />
          <circle cx="61" cy="48" r="2" fill="#FFFFFF" />

          {/* Pink Cheeks */}
          <circle cx="34" cy="57" r="4" fill="#F472B6" opacity="0.6" />
          <circle cx="66" cy="57" r="4" fill="#F472B6" opacity="0.6" />

          {/* Big Smile */}
          <path
            d="M44 58C46 64 54 64 56 58"
            fill="#B91C1C"
            stroke="#1E293B"
            strokeWidth="2.5"
          />

          {/* Green Explorer Bucket Hat */}
          <path
            d="M32 36C32 26 40 22 50 22C60 22 68 26 68 36H32Z"
            fill="#65A30D"
          />
          <ellipse cx="50" cy="36" rx="26" ry="6" fill="#4D7C0F" />
          <circle cx="50" cy="28" r="3.5" fill="#FACC15" /> {/* Compass badge */}

          {/* Compass Medal */}
          <circle cx="50" cy="74" r="6" fill="#EAB308" stroke="#1E293B" strokeWidth="2" />
          <path d="M50 71L52 74L50 77L48 74Z" fill="#DC2626" />
        </svg>
      );

    case 'minty':
      // Lime green athletic runner with visor & headphones
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${borderClass} ${className}`}
        >
          <circle cx="50" cy="50" r="46" fill="#FFFFFF" />
          <circle cx="50" cy="50" r="42" fill="#F0FDF4" />

          {/* Mint Character */}
          <circle cx="50" cy="52" r="24" fill="#A3E635" />

          {/* White Visor / Headband */}
          <path d="M26 44C26 36 34 32 50 32C66 32 74 36 74 44H26Z" fill="#FFFFFF" />
          <rect x="24" y="42" width="52" height="6" rx="3" fill="#121212" />

          {/* Sport Eyes */}
          <ellipse cx="42" cy="54" rx="4" ry="6" fill="#121212" />
          <ellipse cx="58" cy="54" rx="4" ry="6" fill="#121212" />
          <circle cx="43" cy="52" r="1.5" fill="#FFF" />
          <circle cx="59" cy="52" r="1.5" fill="#FFF" />

          {/* Smug Grin */}
          <path d="M46 63C48 66 54 66 56 63" stroke="#121212" strokeWidth="3" strokeLinecap="round" />

          {/* Blue Headphones */}
          <rect x="22" y="46" width="6" height="14" rx="3" fill="#3B82F6" />
          <rect x="72" y="46" width="6" height="14" rx="3" fill="#3B82F6" />
        </svg>
      );

    case 'blaze':
    default:
      // Fiery champion with gold crown & streetwear goggles
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${borderClass} ${className}`}
        >
          <circle cx="50" cy="50" r="46" fill="#FFFFFF" />
          <circle cx="50" cy="50" r="42" fill="#FFF7ED" />

          {/* Flame Body */}
          <ellipse cx="50" cy="54" rx="25" ry="23" fill="#FB923C" />

          {/* Golden Crown */}
          <path d="M34 32L40 38L50 28L60 38L66 32V42H34V32Z" fill="#FBBF24" stroke="#D97706" strokeWidth="2" />

          {/* Futuristic Cyber Visor */}
          <rect x="30" y="46" width="40" height="10" rx="5" fill="#18181B" />
          <rect x="33" y="48" width="34" height="6" rx="3" fill="#EF4444" />

          {/* Smirk */}
          <path d="M44 65C47 68 53 68 56 65" stroke="#18181B" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    }
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {renderGraphic()}
      <StreetwearBadge badge={badge} size={size} />
    </div>
  );
};

/**
 * 3D Hexagonal Achievement Token / Badge (Matching the 365, 100, 50 tokens in the screenshot)
 */
export const HexBadge: React.FC<{
  numberText: string;
  theme: 'blue' | 'yellow' | 'lime';
  label: string;
  icon?: React.ReactNode;
}> = ({ numberText, theme, label }) => {
  const colors = {
    blue: { bg: 'from-[#60A7FF] to-[#3B82F6]', border: 'border-[#93C5FD]', text: 'text-[#1E3A8A]' },
    yellow: { bg: 'from-[#FACC15] to-[#EAB308]', border: 'border-[#FEF08A]', text: 'text-[#713F12]' },
    lime: { bg: 'from-[#A3E635] to-[#65A30D]', border: 'border-[#BEF264]', text: 'text-[#365314]' },
  }[theme];

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-16 h-18 bg-gradient-to-b ${colors.bg} rounded-2xl border-4 ${colors.border} shadow-lg flex flex-col items-center justify-center relative transform transition hover:scale-105 active:scale-95`}
        style={{ clipPath: 'polygon(50% 0%, 100% 15%, 100% 85%, 50% 100%, 0% 85%, 0% 15%)' }}
      >
        <span className="text-xl font-display text-white drop-shadow-md tracking-wider">
          {numberText}
        </span>
        <div className="w-8 h-1 bg-white/40 rounded-full mt-0.5" />
      </div>
      <span className="text-xs font-bold text-gray-700 mt-1">{label}</span>
    </div>
  );
};
