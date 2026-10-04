import React, { useState, useEffect, useRef } from 'react';
import {
  Player,
  Wall,
  Orientation,
  Position,
  GameMode,
  AiDifficulty,
  WallMaterial,
  MoveRecord,
  MatchAnalysis,
  BoardStickerStamp,
  CampaignLevelConfig,
  SettlementResult,
  QuickChatCallout,
} from '../types/game';
import { Board } from '../components/Board';
import { HUD } from '../components/HUD';
import { GameReviewModal } from '../components/GameReviewModal';

import { LootDropModal } from '../components/LootDropModal';
import { QuickChatWheel, QuickChatPreset } from '../components/QuickChatWheel';
import { multiplayerService } from '../services/multiplayer';
import { analyzeMatch } from '../game/analysisEngine';
import { useOracleWorker } from '../hooks/useOracleWorker';
import { getAiMove } from '../game/aiBot';
import { sounds } from '../utils/audio';
import { isThreefoldRepetition, getPositionStateKey, MAX_GAME_MOVES } from '../game/quoridor';
import { multiplayerRpc, AuthoritativeGameState } from '../lib/multiplayerRpc';
import { settleMatch } from '../lib/progressionRpc';
import confetti from 'canvas-confetti';
import { Undo2, RotateCcw, Trophy, Home, Scale, Sparkles, MessageSquarePlus, MessageSquare } from 'lucide-react';

interface GameScreenProps {
  gameMode: GameMode;
  aiDifficulty?: AiDifficulty;
  roomCode: string;
  isMaster: boolean;
  onToggleMaster: (enabled: boolean) => void;
  myPlayerIndex: number;
  userAvatar: string;
  userName: string;
  onExitGame: () => void;
  wallMaterial?: WallMaterial;
  pawnBadge?: string;
  campaignConfig?: CampaignLevelConfig;
  onGoToProfile?: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  gameMode,
  aiDifficulty = 'normal',
  roomCode,
  isMaster,
  onToggleMaster,
  myPlayerIndex,
  userAvatar,
  userName,
  onExitGame,
  wallMaterial = 'caution',
  pawnBadge = 'cap',
  campaignConfig,
  onGoToProfile,
}) => {
  const effectiveAiDifficulty = campaignConfig?.aiDifficulty || aiDifficulty;
  const botName =
    campaignConfig?.botName ||
    (effectiveAiDifficulty === 'grandmaster'
      ? 'Alpha Master [Hard]'
      : effectiveAiDifficulty === 'easy'
      ? 'Scout [Easy]'
      : 'Tactician [Normal]');
  const botAvatar =
    campaignConfig?.botAvatar ||
    (effectiveAiDifficulty === 'grandmaster' ? 'blaze' : effectiveAiDifficulty === 'easy' ? 'minty' : 'dino');

  const initialP0Walls = campaignConfig?.playerWalls ?? 10;
  const initialP1Walls = campaignConfig?.opponentWalls ?? 10;
  const initialTimer = campaignConfig?.turnTimerSeconds ?? 30;

  const [players, setPlayers] = useState<Player[]>([
    {
      id: 'p1',
      name: userName || 'James',
      avatar: userAvatar || 'james',
      x: 4,
      y: 0,
      targetRow: 8,
      wallsLeft: initialP0Walls,
      color: '#2563EB',
      accentColor: '#60A7FF',
    },
    {
      id: 'p2',
      name: gameMode === 'ai' || campaignConfig ? botName : 'Opponent',
      avatar: botAvatar,
      x: 4,
      y: 8,
      targetRow: 0,
      wallsLeft: initialP1Walls,
      color: '#DC2626',
      accentColor: '#F87171',
      isAi: gameMode === 'ai' || !!campaignConfig,
      aiDifficulty: effectiveAiDifficulty,
    },
  ]);

  const [walls, setWalls] = useState<Wall[]>(() =>
    campaignConfig?.preplacedWalls ? [...campaignConfig.preplacedWalls] : []
  );
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [winner, setWinner] = useState<number | null>(null);
  const [isDraw, setIsDraw] = useState<boolean>(false);
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(initialTimer);
  const [isTimerEnabled, setIsTimerEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('quoridor_timer_enabled') !== 'false';
    } catch {
      return true;
    }
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeEmotes, setActiveEmotes] = useState<{ id: number; emoji: string; x: number; y: number }[]>([]);
  const [positionHistory, setPositionHistory] = useState<string[]>([]);
  const moveCountRef = useRef<number>(0);

  // Settlement & Loot Rolling Engine
  const [settlementResult, setSettlementResult] = useState<SettlementResult | null>(null);
  const [isLootModalOpen, setIsLootModalOpen] = useState<boolean>(false);

  // Match History & Esports Review Engine
  const initialPlayersRef = useRef<Player[]>([]);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [matchAnalysis, setMatchAnalysis] = useState<MatchAnalysis | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);



  // Board Emote Reaction Stickers (Realistic slap physics with 3s fade)
  const [boardStickers, setBoardStickers] = useState<BoardStickerStamp[]>([]);
  const [showSoundboard, setShowSoundboard] = useState<boolean>(false);

  // Initialize initial players snapshot for review
  useEffect(() => {
    if (initialPlayersRef.current.length === 0 && players.length === 2) {
      initialPlayersRef.current = JSON.parse(JSON.stringify(players));
    }
  }, [players]);

  // Compute game review whenever game reaches terminal state
  useEffect(() => {
    if ((winner !== null || isDraw) && moveHistory.length > 0) {
      const analysis = analyzeMatch(moveHistory, initialPlayersRef.current);
      setMatchAnalysis(analysis);
    }
  }, [winner, isDraw, moveHistory]);

  const handleDropBoardSticker = (emoji: string, text: string) => {
    sounds.playStickerSlap();
    const newSticker: BoardStickerStamp = {
      id: Date.now(),
      text,
      emoji,
      x: Math.random() * 50 + 25,
      y: Math.random() * 50 + 25,
      rotation: Math.floor(Math.random() * 30) - 15,
      timestamp: Date.now(),
    };
    setBoardStickers((prev) => [...prev, newSticker]);
    setTimeout(() => {
      setBoardStickers((prev) => prev.filter((s) => s.id !== newSticker.id));
    }, 3000);
  };

  // Stealth Avatar Long-Press Gesture Tracker (> 600ms)
  const avatarPressTimer = useRef<number | null>(null);

  // Mobile Quick-Chat Tactical Callout Engine
  const [isQuickChatOpen, setIsQuickChatOpen] = useState<boolean>(false);
  const [p1Callout, setP1Callout] = useState<QuickChatCallout | null>(null);
  const [p2Callout, setP2Callout] = useState<QuickChatCallout | null>(null);

  // Setup Realtime Multiplayer Broadcast & Quick-Chat Listeners
  useEffect(() => {
    multiplayerService.joinRoom(roomCode, {
      id: players[myPlayerIndex]?.id || 'p1',
      username: players[myPlayerIndex]?.name || userName,
      playerIndex: myPlayerIndex,
    });

    const unsubQuickChat = multiplayerService.onQuickChat((callout) => {
      sounds.playPawnHop();
      if (callout.senderIndex === 0) {
        setP1Callout(callout);
      } else {
        setP2Callout(callout);
      }
    });

    const unsubReaction = multiplayerService.onReaction((reaction) => {
      setBoardStickers((prev) => [...prev, reaction]);
      setTimeout(() => {
        setBoardStickers((prev) => prev.filter((s) => s.id !== reaction.id));
      }, 3000);
    });

    return () => {
      unsubQuickChat();
      unsubReaction();
      multiplayerService.leaveRoom();
    };
  }, [roomCode, myPlayerIndex, userName]);

  const handleSendQuickChat = (preset: QuickChatPreset) => {
    const callout: QuickChatCallout = {
      id: `qc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      phrase: preset.phrase,
      emoji: preset.emoji,
      senderIndex: myPlayerIndex,
      timestamp: Date.now(),
    };
    multiplayerService.sendQuickChat(callout, players[myPlayerIndex]?.id);

    // Contextual bot response if in solo AI/Campaign mode
    if (gameMode === 'ai' || campaignConfig) {
      setTimeout(() => {
        const botReplies = [
          { phrase: 'Calculating...', emoji: '🧠' },
          { phrase: 'Nice block!', emoji: '🧱' },
          { phrase: 'Big mistake...', emoji: '😈' },
          { phrase: 'Good game!', emoji: '🤝' },
          { phrase: 'Close one!', emoji: '💨' },
        ];
        const randomReply = botReplies[Math.floor(Math.random() * botReplies.length)];
        const botCallout: QuickChatCallout = {
          id: `qc-bot-${Date.now()}`,
          phrase: randomReply.phrase,
          emoji: randomReply.emoji,
          senderIndex: 1 - myPlayerIndex,
          timestamp: Date.now(),
        };
        setP2Callout(botCallout);
        sounds.playPawnHop();
      }, 1100);
    }
  };

  // Setup Sleep/Wake Rehydration
  useEffect(() => {
    multiplayerRpc.setRoom(roomCode, (rehydratedState: AuthoritativeGameState) => {
      setPlayers(rehydratedState.players);
      setWalls(rehydratedState.walls);
      setCurrentTurn(rehydratedState.currentTurn);
      setWinner(rehydratedState.winner);
    });
  }, [roomCode]);

  // Turn timer countdown (pauses when Turn Timer is toggled OFF)
  useEffect(() => {
    if (winner !== null || isDraw || !isTimerEnabled) return;
    const interval = setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          handleTurnTimeout();
          return initialTimer;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentTurn, winner, isDraw, initialTimer, isTimerEnabled]);

  // Decoupled Background Web Worker for 2-Ply Minimax (Zero Network Footprint)
  const oracleAdvice = useOracleWorker(isMaster, myPlayerIndex, players, walls, winner);

  const checkWin = (updatedPlayers: Player[]) => {
    for (let i = 0; i < updatedPlayers.length; i++) {
      if (updatedPlayers[i].y === updatedPlayers[i].targetRow) {
        setWinner(i);
        sounds.playVictoryFanfare();
        confetti({
          particleCount: 140,
          spread: 85,
          origin: { y: 0.6 },
        });

        // Trigger atomic settlement & loot rolling
        settleMatch({
          gameMode: campaignConfig ? 'campaign' : gameMode,
          winnerPlayerIndex: i,
          turnsCount: moveCountRef.current + 1,
          moveLog: moveHistory,
          playerWallsLeft: updatedPlayers[0].wallsLeft,
          playerWallsPlaced: initialP0Walls - updatedPlayers[0].wallsLeft,
          opponentWallsPlaced: initialP1Walls - updatedPlayers[1].wallsLeft,
          p1Name: updatedPlayers[0].name,
          p2Name: updatedPlayers[1].name,
          campaignLevelNumber: campaignConfig?.levelNumber,
        })
          .then((res) => {
            setSettlementResult(res);
            if (res.unlockedSticker || res.leveledUp) {
              setIsLootModalOpen(true);
            }
          })
          .catch((err) => {
            console.error('Settlement error:', err);
          });

        return true;
      }
    }
    return false;
  };

  const advanceTurn = (nextTurnIndex?: number) => {
    const next = nextTurnIndex !== undefined ? nextTurnIndex : 1 - currentTurn;
    moveCountRef.current += 1;

    // Track state for Threefold Repetition & 50-turn cycle limit
    const stateKey = getPositionStateKey(players, next);
    const newHistory = [...positionHistory, stateKey];
    setPositionHistory(newHistory);

    if (isThreefoldRepetition(newHistory) || moveCountRef.current >= MAX_GAME_MOVES) {
      setIsDraw(true);
      sounds.playInvalidAction();
      return;
    }

    setCurrentTurn(next);
    setTurnTimeLeft(initialTimer);
    sounds.playTurnChirp();
  };

  const handleTurnTimeout = () => {
    sounds.playInvalidAction();
    advanceTurn();
  };

  const handleMakeMove = async (to: Position) => {
    if (winner !== null || isDraw) return;

    const moveRecord: MoveRecord = {
      type: 'move',
      playerIndex: currentTurn,
      from: { x: players[currentTurn].x, y: players[currentTurn].y },
      to,
      timestamp: Date.now(),
      notation: `${String.fromCharCode(65 + to.x)}${to.y + 1}`,
      boardStateBefore: {
        players: JSON.parse(JSON.stringify(players)),
        walls: JSON.parse(JSON.stringify(walls)),
      },
    };
    setMoveHistory((prev) => [...prev, moveRecord]);


    const nextPlayers = [...players];
    nextPlayers[currentTurn] = {
      ...nextPlayers[currentTurn],
      x: to.x,
      y: to.y,
    };

    const hasWon = checkWin(nextPlayers);
    const nextTurn = 1 - currentTurn;

    setPlayers(nextPlayers);

    // Route move through PostgreSQL RPC with monotonic sequence counter
    await multiplayerRpc.submitAuthoritativeTurn(
      roomCode,
      currentTurn,
      'move',
      { pos: to },
      { players: nextPlayers, walls, currentTurn: nextTurn, winner: hasWon ? currentTurn : null }
    );

    advanceTurn();
  };

  const handlePlaceWall = async (wallSlot: { x: number; y: number; orientation: Orientation }) => {
    if (winner !== null || isDraw || players[currentTurn].wallsLeft <= 0) return;

    const newWall: Wall = {
      id: `w-${Date.now()}`,
      x: wallSlot.x,
      y: wallSlot.y,
      orientation: wallSlot.orientation,
      placedBy: currentTurn,
    };

    const moveRecord: MoveRecord = {
      type: 'wall',
      playerIndex: currentTurn,
      wall: newWall,
      timestamp: Date.now(),
      notation: `${String.fromCharCode(65 + wallSlot.x)}${wallSlot.y + 1}${wallSlot.orientation}`,
      boardStateBefore: {
        players: JSON.parse(JSON.stringify(players)),
        walls: JSON.parse(JSON.stringify(walls)),
      },
    };
    setMoveHistory((prev) => [...prev, moveRecord]);


    const nextWalls = [...walls, newWall];
    const nextPlayers = [...players];
    nextPlayers[currentTurn] = {
      ...nextPlayers[currentTurn],
      wallsLeft: nextPlayers[currentTurn].wallsLeft - 1,
    };

    const nextTurn = 1 - currentTurn;

    setWalls(nextWalls);
    setPlayers(nextPlayers);

    // Route wall placement through PostgreSQL RPC with monotonic sequence counter
    await multiplayerRpc.submitAuthoritativeTurn(
      roomCode,
      currentTurn,
      'wall',
      { wall: wallSlot },
      { players: nextPlayers, walls: nextWalls, currentTurn: nextTurn, winner: null }
    );

    advanceTurn();
  };

  const handleAutoExecuteOracle = () => {
    if (!oracleAdvice || currentTurn !== myPlayerIndex) return;

    if (oracleAdvice.recommendedAction === 'wall' && oracleAdvice.targetWall) {
      handlePlaceWall(oracleAdvice.targetWall);
    } else if (oracleAdvice.targetPosition) {
      handleMakeMove(oracleAdvice.targetPosition);
    }
  };

  // AI Turn Execution with Difficulty-Tuned Latency
  useEffect(() => {
    if (winner !== null || isDraw) return;
    const activePlayer = players[currentTurn];

    if (activePlayer.isAi) {
      const reactionDelay =
        aiDifficulty === 'grandmaster' ? 450 : aiDifficulty === 'easy' ? 550 : 600;

      const timer = setTimeout(() => {
        const aiDecision = getAiMove(currentTurn, players, walls, aiDifficulty);
        if (aiDecision.action === 'wall' && aiDecision.wall) {
          handlePlaceWall(aiDecision.wall);
        } else if (aiDecision.to) {
          handleMakeMove(aiDecision.to);
        }
      }, reactionDelay);

      return () => clearTimeout(timer);
    }
  }, [currentTurn, players, walls, winner, isDraw, aiDifficulty]);

  const handleSendEmote = (emoji: string) => {
    sounds.playPawnHop();
    const newEmote = {
      id: Date.now(),
      emoji,
      x: Math.random() * 60 + 20,
      y: Math.random() * 30 + 40,
    };
    setActiveEmotes((prev) => [...prev, newEmote]);
    setTimeout(() => {
      setActiveEmotes((prev) => prev.filter((e) => e.id !== newEmote.id));
    }, 2000);
  };

  const handleResetGame = () => {
    setPlayers([
      { ...players[0], x: 4, y: 0, wallsLeft: initialP0Walls },
      { ...players[1], x: 4, y: 8, wallsLeft: initialP1Walls },
    ]);
    setWalls(campaignConfig?.preplacedWalls ? [...campaignConfig.preplacedWalls] : []);
    setCurrentTurn(0);
    setWinner(null);
    setIsDraw(false);
    setTurnTimeLeft(initialTimer);
    setPositionHistory([]);
    moveCountRef.current = 0;
    setMoveHistory([]);
    setMatchAnalysis(null);
    setIsReviewOpen(false);
    setBoardStickers([]);
    setSettlementResult(null);
    setIsLootModalOpen(false);
  };

  // Zero-Trace Stealth Master Trigger: Long-press on avatar badge
  const handleAvatarTouchStart = () => {
    avatarPressTimer.current = window.setTimeout(() => {
      onToggleMaster(!isMaster);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([25, 40, 25]);
      }
    }, 600);
  };

  const handleAvatarTouchEnd = () => {
    if (avatarPressTimer.current) {
      clearTimeout(avatarPressTimer.current);
      avatarPressTimer.current = null;
    }
  };

  const isUrgent = turnTimeLeft <= 5 && winner === null && !isDraw;

  return (
    <div
      className={`w-full min-h-[100dvh] bg-[#ECE5D3] px-2 pt-2 pb-24 flex flex-col items-center select-none overflow-y-auto transition-all ${
        isUrgent ? 'animate-timer-pressure' : ''
      }`}
    >
      {/* Mobile Shell Container */}
      <div className="w-full max-w-[430px] flex flex-col items-center gap-2 relative">
        
        {/* Top Header */}
        <div className="w-full flex items-center justify-between px-2 pt-1">
          <button
            onClick={onExitGame}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/90 border border-black text-xs font-extrabold hover:bg-gray-100 transition active:scale-95 shadow-sm"
          >
            <Undo2 size={14} />
            <span>LEAVE</span>
          </button>

          {/* Room Badge with Stealth Avatar Long-Press Trigger */}
          <div
            onPointerDown={handleAvatarTouchStart}
            onPointerUp={handleAvatarTouchEnd}
            onPointerLeave={handleAvatarTouchEnd}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black text-white text-xs font-display tracking-wider shadow-sm cursor-pointer"
            title="Room Code"
          >
            <span>ROOM: {roomCode}</span>
          </div>

          <button
            onClick={handleResetGame}
            className="p-2 rounded-full bg-white/90 border border-black text-xs font-bold hover:bg-gray-100 transition active:scale-95 shadow-sm"
            title="Restart Match"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* HUD with Dynamic Pressure and Wall Inventory */}
        <HUD
          players={players}
          currentTurn={currentTurn}
          myPlayerIndex={myPlayerIndex}
          turnTimeLeft={turnTimeLeft}
          maxTurnTime={30}
          isTimerEnabled={isTimerEnabled}
          onToggleTimer={() => {
            setIsTimerEnabled((prev) => {
              const next = !prev;
              try {
                localStorage.setItem('quoridor_timer_enabled', String(next));
              } catch {}
              return next;
            });
          }}
          oracleAdvice={oracleAdvice}
          isMaster={isMaster}
          onAutoExecuteOracle={handleAutoExecuteOracle}
          onSendEmote={handleSendEmote}
          isMuted={isMuted}
          onToggleMute={() => {
            sounds.setMuted(!isMuted);
            setIsMuted(!isMuted);
          }}
          p1Callout={p1Callout}
          p2Callout={p2Callout}
          onOpenQuickChat={() => setIsQuickChatOpen(true)}
        />



        {/* Tactile Board with 60 FPS Flat Surface, Stealth 5-Tap, Wall Materials & Reaction Stickers */}
        <div className="w-full mt-1">
          <Board
            players={players}
            walls={walls}
            currentTurn={currentTurn}
            myPlayerIndex={myPlayerIndex}
            isMyTurn={currentTurn === myPlayerIndex}
            onMakeMove={handleMakeMove}
            onPlaceWall={handlePlaceWall}
            oracleAdvice={oracleAdvice}
            showOracleHud={isMaster}
            onToggleStealthMaster={() => onToggleMaster(!isMaster)}
            wallMaterial={wallMaterial}
            pawnBadge={pawnBadge}
            boardStickers={boardStickers}
          />
        </div>

        {/* Soundboard Reaction Sticker Drop Tray & Quick-Chat Wheel Trigger */}
        <div className="w-full max-w-[390px] mt-1 bg-white/95 backdrop-blur-md rounded-2xl p-2 border-2 border-black/10 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsQuickChatOpen(true)}
              className="px-2 py-1 rounded-xl bg-blue-600 text-white font-black text-[10px] flex items-center gap-1 shadow-sm hover:bg-blue-700 transition active:scale-90"
              title="Open Tactical Quick-Chat Wheel"
            >
              <MessageSquare size={12} />
              <span>CHAT</span>
            </button>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-0.5 text-[10px] font-black text-gray-500 uppercase">
              <span>SLAP:</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {[
              { emoji: '👑', text: 'GG' },
              { emoji: '💀', text: 'DEAD' },
              { emoji: '🧂', text: 'SALTY' },
              { emoji: '🤡', text: 'CLOWN' },
              { emoji: '🔥', text: 'FIRE' },
              { emoji: '🧊', text: 'CHILL' },
            ].map((item) => (
              <button
                key={item.text}
                onClick={() => handleDropBoardSticker(item.emoji, item.text)}
                className="px-1.5 py-1 rounded-xl bg-gray-100 hover:bg-black hover:text-white transition active:scale-90 flex items-center gap-0.5 shadow-sm text-xs font-bold"
                title={`Slap ${item.text} onto board`}
              >
                <span>{item.emoji}</span>
                <span className="text-[9px] font-extrabold">{item.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Floating Animated Reaction Stickers */}
        {activeEmotes.map((emote) => (
          <div
            key={emote.id}
            style={{ left: `${emote.x}%`, top: `${emote.y}%` }}
            className="absolute z-50 text-5xl pointer-events-none animate-in zoom-in-50 fade-in slide-in-from-bottom-6 duration-300 drop-shadow-xl"
          >
            {emote.emoji}
          </div>
        ))}

        {/* Draw / Threefold Repetition Modal */}
        {isDraw && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in-95">
            <div className="w-full max-w-sm bg-white rounded-[32px] p-6 border-4 border-black shadow-2xl flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 border-2 border-black flex items-center justify-center mb-2 shadow-md">
                <Scale size={36} className="text-black" />
              </div>

              <h2 className="text-3xl font-display tracking-wider text-black">
                STALEMATE / DRAW
              </h2>

              <p className="text-sm font-extrabold text-gray-700 mt-1">
                Threefold repetition or 50-move limit reached. Match ended in a draw!
              </p>

              <div className="w-full flex flex-col gap-2 mt-5">
                <div className="w-full flex gap-2">
                  <button
                    onClick={() => {
                      sounds.playTurnChirp();
                      if (!matchAnalysis && moveHistory.length > 0) {
                        setMatchAnalysis(analyzeMatch(moveHistory, initialPlayersRef.current));
                      }
                      setIsReviewOpen(true);
                    }}
                    className="flex-1 py-3 px-2 rounded-full bg-gradient-to-r from-[#06B6D4] to-[#3B82F6] text-white font-display text-xs tracking-wider hover:opacity-90 shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Sparkles size={16} className="text-amber-300" />
                    <span>REVIEW MATCH (!!)</span>
                  </button>
                </div>

                <div className="w-full flex gap-2">
                  <button
                    onClick={handleResetGame}
                    className="flex-1 py-3 rounded-full bg-black text-white font-display text-sm tracking-wider hover:bg-gray-800 transition active:scale-95"
                  >
                    PLAY AGAIN
                  </button>

                  <button
                    onClick={onExitGame}
                    className="px-4 py-3 rounded-full bg-gray-200 text-black font-display text-sm tracking-wider hover:bg-gray-300 transition active:scale-95 flex items-center justify-center"
                  >
                    <Home size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Victory Celebration Modal */}
        {winner !== null && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in-95">
            <div className="w-full max-w-sm bg-white rounded-[32px] p-6 border-4 border-black shadow-2xl flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-yellow-400 border-2 border-black flex items-center justify-center mb-2 shadow-md">
                <Trophy size={36} className="text-black fill-yellow-200" />
              </div>

              <h2 className="text-3xl font-display tracking-wider text-black">
                VICTORY!
              </h2>

              <p className="text-sm font-extrabold text-gray-700 mt-1">
                {players[winner].name} wins the match!
              </p>

              <div className="my-4 p-3 bg-gray-100 rounded-2xl w-full flex justify-around text-xs font-bold text-gray-700">
                <div>
                  <span className="block text-gray-400 text-[10px]">WALLS USED</span>
                  <span>{10 - players[winner].wallsLeft} / 10</span>
                </div>
                <div className="w-[1px] bg-gray-300" />
                <div>
                  <span className="block text-gray-400 text-[10px]">TOTAL WALLS</span>
                  <span>{walls.length}</span>
                </div>
              </div>

              <div className="w-full flex flex-col gap-2">
                {/* Loot & XP Reward Button */}
                {settlementResult && (
                  <button
                    onClick={() => {
                      sounds.playPawnHop();
                      setIsLootModalOpen(true);
                    }}
                    className="w-full py-2.5 px-3 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-display text-sm tracking-wider hover:opacity-95 shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Trophy size={16} className="text-amber-900" />
                    <span>VIEW LOOT & XP SETTLEMENT (+{settlementResult.xpGained} XP)</span>
                  </button>
                )}

                {/* Game Review Button */}
                <button
                  onClick={() => {
                    sounds.playTurnChirp();
                    if (!matchAnalysis && moveHistory.length > 0) {
                      setMatchAnalysis(analyzeMatch(moveHistory, initialPlayersRef.current));
                    }
                    setIsReviewOpen(true);
                  }}
                  className="w-full py-3 px-3 rounded-full bg-gradient-to-r from-[#06B6D4] via-[#3B82F6] to-[#8B5CF6] text-white font-display text-sm tracking-wider hover:opacity-90 shadow-md flex items-center justify-center gap-2 active:scale-95"
                >
                  <Sparkles size={18} className="text-amber-300 animate-pulse" />
                  <span>CHESS.COM STYLE REVIEW (!!)</span>
                </button>

                <div className="w-full flex gap-2">
                  <button
                    onClick={handleResetGame}
                    className="flex-1 py-3 rounded-full bg-black text-white font-display text-sm tracking-wider hover:bg-gray-800 transition active:scale-95"
                  >
                    PLAY AGAIN
                  </button>

                  <button
                    onClick={onExitGame}
                    className="px-4 py-3 rounded-full bg-gray-200 text-black font-display text-sm tracking-wider hover:bg-gray-300 transition active:scale-95 flex items-center justify-center"
                  >
                    <Home size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chess.com Style Interactive Game Review Modal */}
        {matchAnalysis && (
          <GameReviewModal
            isOpen={isReviewOpen}
            onClose={() => setIsReviewOpen(false)}
            analysis={matchAnalysis}
            players={players}
            winner={winner}
          />
        )}

        {/* Post-Match Loot Drop & Level-Up Reveal Modal */}
        <LootDropModal
          result={settlementResult}
          isOpen={isLootModalOpen}
          onClose={() => setIsLootModalOpen(false)}
          onGoToProfile={onGoToProfile}
        />

        {/* Mobile Canned Quick-Chat Radial Wheel */}
        <QuickChatWheel
          isOpen={isQuickChatOpen}
          onClose={() => setIsQuickChatOpen(false)}
          onSelectCallout={handleSendQuickChat}
        />

      </div>
    </div>
  );
};
