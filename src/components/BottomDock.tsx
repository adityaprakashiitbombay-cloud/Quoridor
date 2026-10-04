import React from 'react';
import { ScreenType } from '../types/game';
import { Home, Compass, LayoutGrid, Trophy, User } from 'lucide-react';

interface BottomDockProps {
  currentScreen: ScreenType;
  onSelectScreen: (screen: ScreenType) => void;
  isInActiveGame: boolean;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  currentScreen,
  onSelectScreen,
  isInActiveGame,
}) => {
  return (
    <nav className="fixed bottom-4 inset-x-0 mx-auto w-[calc(100%-2rem)] max-w-sm z-50 pointer-events-auto">
      <div className="bg-neutral-950/95 backdrop-blur-md text-white rounded-full px-4 py-2.5 flex items-center justify-between shadow-2xl border border-white/10">
        
        {/* 1. Hub / Home */}
        <button
          onClick={() => onSelectScreen('hub')}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            currentScreen === 'hub'
              ? 'bg-white text-neutral-950 scale-105 shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          title="Home Hub"
        >
          <Home size={20} strokeWidth={2.2} />
        </button>

        {/* 2. Squad Lobby / Friends */}
        <button
          onClick={() => onSelectScreen('squad')}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            currentScreen === 'squad'
              ? 'bg-white text-neutral-950 scale-105 shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          title="Squad Lobby"
        >
          <Compass size={20} strokeWidth={2.2} />
        </button>

        {/* 3. Center Hero: Game Board */}
        <button
          onClick={() => onSelectScreen('game')}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg ${
            currentScreen === 'game'
              ? 'bg-white text-neutral-950 scale-110 ring-2 ring-white/50'
              : isInActiveGame
              ? 'bg-white text-neutral-950 ring-2 ring-[#ACF234] animate-pulse'
              : 'bg-neutral-800 text-white hover:bg-neutral-700 hover:scale-105'
          }`}
          title={isInActiveGame ? 'Resume Game Arena' : 'Game Arena'}
        >
          <LayoutGrid size={22} strokeWidth={2.2} />
        </button>

        {/* 4. The Gauntlet Campaign / Trophies */}
        <button
          onClick={() => onSelectScreen('campaign')}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            currentScreen === 'campaign'
              ? 'bg-white text-neutral-950 scale-105 shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          title="Campaign & Trophies"
        >
          <Trophy size={20} strokeWidth={2.2} />
        </button>

        {/* 5. Profile & Customization */}
        <button
          onClick={() => onSelectScreen('profile')}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            currentScreen === 'profile'
              ? 'bg-white text-neutral-950 scale-105 shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          title="Profile & Customization"
        >
          <User size={20} strokeWidth={2.2} />
        </button>

      </div>
    </nav>
  );
};
