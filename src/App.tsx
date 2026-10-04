import React, { useState, useEffect } from 'react';
import { ScreenType, GameMode, AiDifficulty, WallMaterial, CampaignLevelConfig } from './types/game';
import { MatchHubScreen } from './screens/MatchHubScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SquadLobbyScreen } from './screens/SquadLobbyScreen';
import { GameScreen } from './screens/GameScreen';
import { SandboxScreen } from './screens/SandboxScreen';
import { BotArenaScreen } from './screens/BotArenaScreen';
import { CampaignScreen } from './screens/CampaignScreen';
import { DotsAndBoxesScreen } from './screens/DotsAndBoxesScreen';
import { BottomDock } from './components/BottomDock';
import { MasterLoginModal } from './components/MasterLoginModal';
import { generateRoomCode } from './lib/supabase';
import { supabaseKeepalive } from './services/supabaseKeepalive';
import { sounds } from './utils/audio';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('hub');
  const [userName, setUserName] = useState<string>('James');
  const [userAvatar, setUserAvatar] = useState<string>('james');
  const [wallMaterial, setWallMaterial] = useState<WallMaterial>('caution');
  const [pawnBadge, setPawnBadge] = useState<string>('crown');
  const [isMaster, setIsMaster] = useState<boolean>(false);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState<boolean>(false);
  const [gameMode, setGameMode] = useState<GameMode>('1v1');
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('normal');
  const [roomCode, setRoomCode] = useState<string>(() => generateRoomCode());
  const [isInActiveGame, setIsInActiveGame] = useState<boolean>(false);
  const [activeCampaignConfig, setActiveCampaignConfig] = useState<CampaignLevelConfig | undefined>(undefined);

  // Initialize Supabase Keep-Alive Heartbeat (prevents inactivity sleep)
  useEffect(() => {
    supabaseKeepalive.init();
    return () => supabaseKeepalive.destroy();
  }, []);

  // Switch screen with sound
  const handleSelectScreen = (screen: ScreenType) => {
    sounds.playPawnHop();
    setCurrentScreen(screen);
  };

  // Launch a game from Hub or Squad
  const handleStartGame = (
    mode: GameMode,
    options?: { vsAi?: boolean; aiDifficulty?: AiDifficulty; roomCode?: string }
  ) => {
    sounds.playTurnChirp();
    setActiveCampaignConfig(undefined);
    setGameMode(mode);
    if (options?.aiDifficulty) {
      setAiDifficulty(options.aiDifficulty);
    }
    if (options?.roomCode) {
      setRoomCode(options.roomCode);
    }
    setIsInActiveGame(true);
    setCurrentScreen('game');
  };

  // Launch a Campaign Level
  const handleStartCampaignLevel = (level: CampaignLevelConfig) => {
    sounds.playVictoryFanfare();
    setActiveCampaignConfig(level);
    setGameMode('ai');
    setAiDifficulty(level.aiDifficulty);
    setIsInActiveGame(true);
    setCurrentScreen('game');
  };

  // Exit from active game
  const handleExitGame = () => {
    sounds.playPawnHop();
    setIsInActiveGame(false);
    setActiveCampaignConfig(undefined);
    setCurrentScreen('hub');
  };

  return (
    <main className="w-full min-h-[100dvh] flex flex-col items-center justify-start bg-[#DCE4EC] relative overflow-hidden font-sans">
      
      {/* Active Screen View */}
      {currentScreen === 'hub' && (
        <MatchHubScreen
          onStartGame={handleStartGame}
          onOpenMasterLogin={() => setIsMasterModalOpen(true)}
          isMaster={isMaster}
          userAvatar={userAvatar}
          userName={userName}
          onOpenSandbox={() => setCurrentScreen('sandbox')}
          onOpenBotArena={() => setCurrentScreen('bot-arena')}
          onOpenCampaign={() => setCurrentScreen('campaign')}
          onOpenDotsAndBoxes={() => setCurrentScreen('dots-and-boxes')}
          onGoToProfile={() => setCurrentScreen('profile')}
        />
      )}

      {currentScreen === 'campaign' && (
        <CampaignScreen
          onBack={() => setCurrentScreen('hub')}
          onStartCampaignLevel={handleStartCampaignLevel}
        />
      )}

      {currentScreen === 'profile' && (
        <ProfileScreen
          currentAvatar={userAvatar}
          onSelectAvatar={(id) => setUserAvatar(id)}
          userName={userName}
          onBack={() => setCurrentScreen('hub')}
          isMaster={isMaster}
          wallMaterial={wallMaterial}
          onSelectWallMaterial={(mat) => setWallMaterial(mat)}
          pawnBadge={pawnBadge}
          onSelectPawnBadge={(badge) => setPawnBadge(badge)}
        />
      )}

      {currentScreen === 'squad' && (
        <SquadLobbyScreen
          roomCode={roomCode}
          onStartMatch={() => handleStartGame('friends')}
          userAvatar={userAvatar}
          userName={userName}
          isHost={true}
          isMaster={isMaster}
          onOpenMasterLogin={() => setIsMasterModalOpen(true)}
        />
      )}

      {currentScreen === 'sandbox' && (
        <SandboxScreen
          onBack={() => setCurrentScreen('hub')}
          onPlayCustomGame={() => {
            handleStartGame('friends');
          }}
          wallMaterial={wallMaterial}
          userAvatar={userAvatar}
          userName={userName}
        />
      )}

      {currentScreen === 'bot-arena' && (
        <BotArenaScreen onBack={() => setCurrentScreen('hub')} />
      )}

      {currentScreen === 'game' && (
        <GameScreen
          gameMode={gameMode}
          aiDifficulty={aiDifficulty}
          roomCode={roomCode}
          isMaster={isMaster}
          onToggleMaster={(enabled) => setIsMaster(enabled)}
          myPlayerIndex={0}
          userAvatar={userAvatar}
          userName={userName}
          onExitGame={handleExitGame}
          wallMaterial={wallMaterial}
          pawnBadge={pawnBadge}
          campaignConfig={activeCampaignConfig}
          onGoToProfile={() => setCurrentScreen('profile')}
        />
      )}

      {currentScreen === 'dots-and-boxes' && (
        <DotsAndBoxesScreen
          onBack={() => setCurrentScreen('hub')}
          userAvatar={userAvatar}
          userName={userName}
        />
      )}

      {/* Floating Bottom Navigation Dock (Hidden during full-screen battle & dots arena) */}
      {currentScreen !== 'game' && currentScreen !== 'dots-and-boxes' && (
        <BottomDock
          currentScreen={currentScreen}
          onSelectScreen={handleSelectScreen}
          isInActiveGame={isInActiveGame}
        />
      )}

      {/* Master Login Modal (ALPHA / 1845) */}
      <MasterLoginModal
        isOpen={isMasterModalOpen}
        onClose={() => setIsMasterModalOpen(false)}
        isMaster={isMaster}
        onLoginSuccess={(master) => setIsMaster(master)}
      />

    </main>
  );
}

export default App;
