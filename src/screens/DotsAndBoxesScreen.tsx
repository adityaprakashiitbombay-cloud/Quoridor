import React, { useState, useEffect, useRef } from 'react';
import {
  DotsBoardSize,
  DotsPlayer,
  DotsTheme,
  DotsGameState,
  DotsAiDifficulty,
} from '../types/game';
import { DotsAndBoxesManager } from '../game/dotsAndBoxesFramework';
import { AvatarGraphic } from '../components/Avatars';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Clock,
  Palette,
  Users,
  Trophy,
  Check,
  Bot,
  Zap,
  Play,
  X,
} from 'lucide-react';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';

interface DotsAndBoxesScreenProps {
  onBack: () => void;
  userAvatar?: string;
  userName?: string;
}

const THEME_STYLES: Record<
  DotsTheme,
  {
    bg: string;
    cardBg: string;
    dotColor: string;
    lineInactive: string;
    lineActiveDefault: string;
    textColor: string;
    label: string;
  }
> = {
  streetwear: {
    bg: 'bg-[#0E1117]',
    cardBg: 'bg-[#181D27]/90 border-black/40',
    dotColor: '#F3F4F6',
    lineInactive: 'bg-white/10 hover:bg-white/30',
    lineActiveDefault: '#ACF234',
    textColor: 'text-white',
    label: 'Streetwear Neon',
  },
  blueprint: {
    bg: 'bg-[#0A2239]',
    cardBg: 'bg-[#123659]/90 border-cyan-500/30',
    dotColor: '#E0F2FE',
    lineInactive: 'bg-cyan-300/15 hover:bg-cyan-300/35',
    lineActiveDefault: '#38BDF8',
    textColor: 'text-cyan-100',
    label: 'Technical Blueprint',
  },
  chalkboard: {
    bg: 'bg-[#1C3325]',
    cardBg: 'bg-[#284936]/90 border-emerald-900/50',
    dotColor: '#FDE68A',
    lineInactive: 'bg-white/15 hover:bg-white/35',
    lineActiveDefault: '#FDE047',
    textColor: 'text-amber-50',
    label: 'Chalkboard Slate',
  },
  aurora: {
    bg: 'bg-[#0B0F19]',
    cardBg: 'bg-white/10 backdrop-blur-md border-white/20',
    dotColor: '#FFFFFF',
    lineInactive: 'bg-white/15 hover:bg-white/40',
    lineActiveDefault: '#C084FC',
    textColor: 'text-white',
    label: 'Sunset Aurora',
  },
  woodcraft: {
    bg: 'bg-[#EFE7D2]',
    cardBg: 'bg-white/90 border-[#D4C3A3]',
    dotColor: '#78350F',
    lineInactive: 'bg-amber-900/15 hover:bg-amber-900/30',
    lineActiveDefault: '#B45309',
    textColor: 'text-amber-950',
    label: 'Woodcraft Vintage',
  },
};

const DEFAULT_PLAYER_COLORS = ['#2563EB', '#DC2626', '#16A34A', '#D97706'];

export const DotsAndBoxesScreen: React.FC<DotsAndBoxesScreenProps> = ({
  onBack,
  userAvatar = 'james',
  userName = 'James',
}) => {
  const [manager] = useState<DotsAndBoxesManager>(() => new DotsAndBoxesManager());
  const [gameState, setGameState] = useState<DotsGameState>(() => manager.getState());
  const [isMuted, setIsMuted] = useState<boolean>(() => sounds.getMuted());
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);
  const [doubleCrossAlert, setDoubleCrossAlert] = useState<boolean>(false);
  const [hoveredLine, setHoveredLine] = useState<{ type: 'h' | 'v'; r: number; c: number } | null>(null);

  // Setup form states
  const [setupPlayerCount, setSetupPlayerCount] = useState<number>(2);
  const [setupGridSize, setSetupGridSize] = useState<DotsBoardSize>(3);
  const [setupPlayers, setSetupPlayers] = useState<DotsPlayer[]>([
    {
      id: 'p1',
      name: userName || 'Player 1',
      avatar: userAvatar || 'james',
      color: '#2563EB',
      accentColor: '#60A7FF',
      type: 'human',
      score: 0,
    },
    {
      id: 'p2',
      name: 'Alpha Bot',
      avatar: 'dino',
      color: '#DC2626',
      accentColor: '#F87171',
      type: 'ai',
      difficulty: 'master',
      score: 0,
    },
    {
      id: 'p3',
      name: 'Bot Scout',
      avatar: 'mint',
      color: '#16A34A',
      accentColor: '#4ADE80',
      type: 'ai',
      difficulty: 'medium',
      score: 0,
    },
    {
      id: 'p4',
      name: 'Bot Tactician',
      avatar: 'flame',
      color: '#D97706',
      accentColor: '#FBBF24',
      type: 'ai',
      difficulty: 'hard',
      score: 0,
    },
  ]);

  // Subscribe to state manager
  useEffect(() => {
    const unsubscribe = manager.subscribe((state) => {
      setGameState(state);
      if (state.isDoubleCrossActive) {
        setDoubleCrossAlert(true);
        setTimeout(() => setDoubleCrossAlert(false), 3000);
      }
    });
    return () => unsubscribe();
  }, [manager]);

  const currentTheme = THEME_STYLES[gameState.theme] || THEME_STYLES.streetwear;
  const currentTurnPlayer = gameState.players[gameState.currentTurn];
  const isHumanTurn = currentTurnPlayer?.type === 'human';

  const handleLineClick = (lineType: 'h' | 'v', r: number, c: number) => {
    if (!isHumanTurn) return;
    manager.makeMove(lineType, r, c);
  };

  const handleStartConfiguredGame = () => {
    const activePlayers = setupPlayers.slice(0, setupPlayerCount);
    manager.startNewGame(
      setupGridSize,
      activePlayers,
      gameState.theme,
      gameState.isTimerEnabled,
      gameState.timerSeconds
    );
    setShowSetupModal(false);
  };

  return (
    <div
      className={`w-full min-h-[100dvh] ${currentTheme.bg} flex flex-col items-center justify-between px-3 py-3 select-none overflow-y-auto transition-colors duration-300 font-sans`}
    >
      {/* Top Header Bar */}
      <div className="w-full max-w-[440px] flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
          title="Back to Hub"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <h1 className={`text-xl font-display tracking-wider ${currentTheme.textColor}`}>
              DOTS & BOXES
            </h1>
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-amber-400 text-black">
              {gameState.gridSize}x{gameState.gridSize}
            </span>
          </div>
          <span className="text-[10px] font-extrabold text-gray-400">
            Tactical Pen & Paper Arena
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowThemeModal(true)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            title="Themes"
          >
            <Palette size={16} />
          </button>
          <button
            onClick={() => setShowHowToPlay(true)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            title="How to Play"
          >
            <HelpCircle size={16} />
          </button>
          <button
            onClick={() => {
              sounds.setMuted(!isMuted);
              setIsMuted(!isMuted);
            }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>

      {/* Double-Cross Alert Banner */}
      {doubleCrossAlert && (
        <div className="w-full max-w-[440px] my-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white px-3 py-1.5 rounded-xl shadow-lg border border-amber-300 flex items-center justify-center gap-2 animate-bounce">
          <Zap size={16} className="fill-amber-300" />
          <span className="text-xs font-black tracking-wide">
            DOUBLE-CROSS! Sacrificing 2 boxes for endgame control!
          </span>
        </div>
      )}

      {/* Multi-Player Scorecard Bar */}
      <div className="w-full max-w-[440px] grid grid-cols-2 sm:grid-cols-4 gap-2 my-2">
        {gameState.players.map((p, idx) => {
          const isTurn = gameState.currentTurn === idx && gameState.winner === null;
          return (
            <div
              key={p.id}
              style={{
                borderColor: isTurn ? p.color : 'transparent',
              }}
              className={`relative p-2 rounded-2xl border-2 transition-all duration-200 ${
                isTurn
                  ? `${currentTheme.cardBg} shadow-lg scale-[1.02]`
                  : 'bg-black/20 opacity-75'
              }`}
            >
              {isTurn && (
                <div
                  style={{ backgroundColor: p.color }}
                  className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full text-[8px] font-black text-white shadow animate-pulse"
                >
                  TURN
                </div>
              )}

              <div className="flex items-center gap-2">
                <div
                  style={{ borderColor: p.color }}
                  className="w-9 h-9 rounded-xl border-2 overflow-hidden shrink-0 flex items-center justify-center bg-black/40"
                >
                  <AvatarGraphic id={p.avatar} size={32} />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-black truncate text-white">
                      {p.name}
                    </span>
                    {p.type === 'ai' && (
                      <Bot size={11} className="text-amber-400 shrink-0" />
                    )}
                  </div>
                  <span
                    style={{ color: p.accentColor }}
                    className="text-base font-display leading-tight"
                  >
                    {p.score} <span className="text-[10px] font-sans font-bold text-gray-400">BOXES</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid SVG / Canvas Board */}
      <div className="w-full max-w-[440px] flex-1 flex items-center justify-center py-2">
        <div
          className={`relative p-5 rounded-3xl ${currentTheme.cardBg} border shadow-2xl flex items-center justify-center`}
        >
          {renderBoardGrid(
            gameState,
            currentTheme,
            hoveredLine,
            setHoveredLine,
            handleLineClick,
            isHumanTurn
          )}
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="w-full max-w-[440px] flex items-center justify-between gap-2 mt-2 pb-4">
        <button
          onClick={() => setShowSetupModal(true)}
          className="flex-1 py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/20 text-xs font-extrabold flex items-center justify-center gap-1.5 transition active:scale-95"
        >
          <Users size={15} />
          <span>PLAYERS & SIZES</span>
        </button>

        <button
          onClick={() => {
            sounds.playTurnChirp();
            manager.startNewGame(
              gameState.gridSize,
              gameState.players,
              gameState.theme,
              gameState.isTimerEnabled,
              gameState.timerSeconds
            );
          }}
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/20 transition active:scale-95"
          title="Restart Game"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Victory / Game Over Modal */}
      {gameState.winner !== null && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#FAF7EE] text-[#121212] rounded-[32px] p-6 border-4 border-black shadow-2xl flex flex-col items-center text-center relative">
            <div className="w-16 h-16 rounded-2xl bg-amber-400 border-2 border-black flex items-center justify-center text-black shadow-md mb-2">
              <Trophy size={36} />
            </div>

            <h2 className="text-3xl font-display tracking-wider text-black">
              {gameState.winner === 'draw'
                ? "IT'S A DRAW!"
                : `${gameState.players[gameState.winner as number].name} WINS!`}
            </h2>

            <p className="text-xs font-extrabold text-gray-500 mt-1">
              Final Scoreboard
            </p>

            <div className="w-full my-4 flex flex-col gap-2">
              {gameState.players.map((p, idx) => (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-2xl border-2 flex items-center justify-between ${
                    idx === gameState.winner
                      ? 'bg-amber-100 border-amber-500'
                      : 'bg-white border-black/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AvatarGraphic id={p.avatar} size={28} />
                    <span className="text-sm font-extrabold text-gray-900">
                      {p.name}
                    </span>
                  </div>
                  <span className="text-lg font-display text-gray-900">
                    {p.score} Boxes
                  </span>
                </div>
              ))}
            </div>

            <div className="w-full flex gap-2">
              <button
                onClick={() => {
                  manager.startNewGame(
                    gameState.gridSize,
                    gameState.players,
                    gameState.theme
                  );
                }}
                className="flex-1 py-3 bg-black text-white text-xs font-extrabold rounded-2xl hover:bg-gray-800 transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Play size={14} />
                <span>PLAY AGAIN</span>
              </button>
              <button
                onClick={onBack}
                className="py-3 px-4 bg-gray-200 text-gray-800 text-xs font-extrabold rounded-2xl hover:bg-gray-300 transition"
              >
                HUB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setup / Players Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#FAF7EE] text-[#121212] rounded-[32px] p-6 border-4 border-black shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowSetupModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/5 hover:bg-black/10 transition"
            >
              <X size={16} />
            </button>

            <h2 className="text-2xl font-display text-black tracking-wide text-center">
              GAME SETUP
            </h2>
            <p className="text-xs text-gray-500 text-center mb-4">
              Configure players, difficulties, and grid size
            </p>

            {/* Board Size Selection */}
            <div className="mb-4">
              <span className="text-xs font-extrabold text-gray-700 block mb-1.5">
                Board Size (Grid):
              </span>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { size: 2 as DotsBoardSize, label: '2x2', desc: 'Blitz' },
                  { size: 3 as DotsBoardSize, label: '3x3', desc: 'Classic' },
                  { size: 4 as DotsBoardSize, label: '4x4', desc: 'Tactical' },
                  { size: 5 as DotsBoardSize, label: '5x5', desc: 'Master' },
                ].map((b) => (
                  <button
                    key={b.size}
                    onClick={() => setSetupGridSize(b.size)}
                    className={`p-2 rounded-2xl border-2 text-center transition ${
                      setupGridSize === b.size
                        ? 'bg-black text-white border-black'
                        : 'bg-white border-black/15 hover:border-black/40 text-black'
                    }`}
                  >
                    <span className="block text-sm font-display">{b.label}</span>
                    <span className="block text-[9px] font-bold opacity-75">{b.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Number of Players (2 to 4) */}
            <div className="mb-4">
              <span className="text-xs font-extrabold text-gray-700 block mb-1.5">
                Players Count:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 4].map((count) => (
                  <button
                    key={count}
                    onClick={() => setSetupPlayerCount(count)}
                    className={`py-2 rounded-2xl border-2 font-display text-sm transition ${
                      setupPlayerCount === count
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-white border-black/15 text-black'
                    }`}
                  >
                    {count} PLAYERS
                  </button>
                ))}
              </div>
            </div>

            {/* Player Configurations */}
            <div className="flex flex-col gap-2 mb-5">
              {Array.from({ length: setupPlayerCount }).map((_, i) => {
                const p = setupPlayers[i];
                return (
                  <div
                    key={i}
                    className="p-2.5 rounded-2xl bg-white border border-black/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        style={{ backgroundColor: DEFAULT_PLAYER_COLORS[i] }}
                        className="w-3.5 h-3.5 rounded-full"
                      />
                      <span className="text-xs font-black text-gray-900">
                        {p.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const updated = [...setupPlayers];
                          updated[i].type = updated[i].type === 'human' ? 'ai' : 'human';
                          setSetupPlayers(updated);
                        }}
                        className={`px-2 py-1 rounded-full text-[10px] font-black border transition ${
                          p.type === 'human'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {p.type === 'human' ? 'HUMAN' : 'BOT'}
                      </button>

                      {p.type === 'ai' && (
                        <select
                          value={p.difficulty || 'medium'}
                          onChange={(e) => {
                            const updated = [...setupPlayers];
                            updated[i].difficulty = e.target.value as DotsAiDifficulty;
                            setSetupPlayers(updated);
                          }}
                          className="bg-gray-100 text-[10px] font-bold py-1 px-1.5 rounded-lg border border-gray-300"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                          <option value="master">Master (Double-Cross)</option>
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleStartConfiguredGame}
              className="w-full py-3 bg-black text-white text-xs font-black rounded-2xl hover:bg-gray-800 transition active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Play size={15} />
              <span>START MATCH</span>
            </button>
          </div>
        </div>
      )}

      {/* Theme Selector Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#FAF7EE] text-[#121212] rounded-[32px] p-6 border-4 border-black shadow-2xl relative">
            <button
              onClick={() => setShowThemeModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/5 hover:bg-black/10 transition"
            >
              <X size={16} />
            </button>

            <h2 className="text-2xl font-display text-black tracking-wide text-center">
              BOARD THEMES
            </h2>
            <p className="text-xs text-gray-500 text-center mb-4">
              Select visual aesthetics
            </p>

            <div className="flex flex-col gap-2 mb-4">
              {(Object.keys(THEME_STYLES) as DotsTheme[]).map((thm) => {
                const style = THEME_STYLES[thm];
                const isSelected = gameState.theme === thm;
                return (
                  <div
                    key={thm}
                    onClick={() => {
                      manager.setTheme(thm);
                      setShowThemeModal(false);
                    }}
                    className={`p-3 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? 'bg-black text-white border-black'
                        : 'bg-white border-black/10 hover:border-black/30 text-black'
                    }`}
                  >
                    <span className="text-xs font-extrabold">{style.label}</span>
                    {isSelected && <Check size={16} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* How to Play Rules Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#FAF7EE] text-[#121212] rounded-[32px] p-6 border-4 border-black shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowHowToPlay(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/5 hover:bg-black/10 transition"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 mb-1 justify-center">
              <Sparkles size={20} className="text-amber-500 fill-amber-400" />
              <h2 className="text-2xl font-display text-black tracking-wide text-center">
                HOW TO PLAY
              </h2>
            </div>
            <p className="text-xs text-gray-500 text-center mb-4">
              Classic Pen & Paper Dots and Boxes Rules
            </p>

            <div className="flex flex-col gap-3 text-xs text-gray-800 leading-relaxed">
              <div className="p-3 bg-white rounded-2xl border border-black/10 shadow-sm">
                <span className="font-extrabold text-blue-600 block mb-0.5">1. Drawing Lines</span>
                Each turn, tap or drag between two horizontally or vertically adjacent dots to draw a line.
              </div>

              <div className="p-3 bg-white rounded-2xl border border-black/10 shadow-sm">
                <span className="font-extrabold text-green-600 block mb-0.5">2. Claiming Boxes (Move Again!)</span>
                Drawing the 4th wall of a box wins it, earning you 1 point. <strong>When you close a box, you must move again!</strong>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-black/10 shadow-sm">
                <span className="font-extrabold text-purple-600 block mb-0.5">3. Game Over & Winning</span>
                Lines are drawn until all squares are claimed. The player with the most claimed squares wins!
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 shadow-sm">
                <span className="font-extrabold text-amber-700 block mb-0.5">4. The "Double-Cross" Strategy 😈</span>
                Be careful not to create long chains for your opponents! A master tactic is the <strong>Double-Cross</strong>: sacrificing the last 2 boxes in a chain to force the opponent to open the NEXT long chain for you to sweep the game!
              </div>
            </div>

            <button
              onClick={() => setShowHowToPlay(false)}
              className="w-full mt-4 py-3 bg-black text-white text-xs font-black rounded-2xl hover:bg-gray-800 transition active:scale-95"
            >
              GOT IT!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Render the interactive grid: dots, horizontal lines, vertical lines, and box surfaces
 */
function renderBoardGrid(
  state: DotsGameState,
  theme: any,
  hoveredLine: { type: 'h' | 'v'; r: number; c: number } | null,
  setHoveredLine: (line: { type: 'h' | 'v'; r: number; c: number } | null) => void,
  onLineClick: (lineType: 'h' | 'v', r: number, c: number) => void,
  isHumanTurn: boolean
) {
  const N = state.gridSize;
  const cellSize = Math.min(68, Math.floor(320 / N));
  const dotRadius = Math.max(5, Math.floor(10 - N));
  const lineThickness = Math.max(5, Math.floor(8 - N * 0.5));
  const boardDim = N * cellSize;

  return (
    <div
      style={{ width: boardDim + 24, height: boardDim + 24 }}
      className="relative flex items-center justify-center p-3 select-none"
    >
      {/* 1. Boxes (Squares claimed by players) */}
      {Array.from({ length: N }).map((_, r) =>
        Array.from({ length: N }).map((_, c) => {
          const ownerIdx = state.boxes[r][c];
          const owner = ownerIdx !== null ? state.players[ownerIdx] : null;

          return (
            <div
              key={`box-${r}-${c}`}
              style={{
                left: c * cellSize + 12,
                top: r * cellSize + 12,
                width: cellSize,
                height: cellSize,
                backgroundColor: owner ? `${owner.color}35` : 'transparent',
                borderColor: owner ? owner.color : 'transparent',
              }}
              className={`absolute flex items-center justify-center rounded-lg transition-all duration-300 ${
                owner ? 'scale-95 shadow-sm' : ''
              }`}
            >
              {owner && (
                <div className="flex flex-col items-center animate-in zoom-in-50 duration-200">
                  <div
                    style={{ borderColor: owner.color }}
                    className="w-7 h-7 rounded-full border-2 overflow-hidden bg-black/30 shadow-md"
                  >
                    <AvatarGraphic id={owner.avatar} size={24} />
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* 2. Horizontal Lines */}
      {Array.from({ length: N + 1 }).map((_, r) =>
        Array.from({ length: N }).map((_, c) => {
          const isDrawn = state.hLines[r][c];
          const isHovered = hoveredLine?.type === 'h' && hoveredLine.r === r && hoveredLine.c === c;

          return (
            <div
              key={`h-${r}-${c}`}
              style={{
                left: c * cellSize + 12 + dotRadius,
                top: r * cellSize + 12 - Math.floor(lineThickness / 2),
                width: cellSize - dotRadius * 2,
                height: Math.max(18, lineThickness * 3), // Touch hit box
              }}
              onClick={() => onLineClick('h', r, c)}
              onMouseEnter={() => !isDrawn && setHoveredLine({ type: 'h', r, c })}
              onMouseLeave={() => setHoveredLine(null)}
              className="absolute z-20 flex items-center justify-center cursor-pointer group"
            >
              <div
                style={{
                  height: isDrawn ? lineThickness + 1 : lineThickness,
                  backgroundColor: isDrawn
                    ? theme.lineActiveDefault
                    : isHovered && isHumanTurn
                    ? '#FBBF24'
                    : undefined,
                }}
                className={`w-full rounded-full transition-all duration-150 ${
                  isDrawn ? 'shadow-md' : theme.lineInactive
                }`}
              />
            </div>
          );
        })
      )}

      {/* 3. Vertical Lines */}
      {Array.from({ length: N }).map((_, r) =>
        Array.from({ length: N + 1 }).map((_, c) => {
          const isDrawn = state.vLines[r][c];
          const isHovered = hoveredLine?.type === 'v' && hoveredLine.r === r && hoveredLine.c === c;

          return (
            <div
              key={`v-${r}-${c}`}
              style={{
                left: c * cellSize + 12 - Math.floor(lineThickness / 2),
                top: r * cellSize + 12 + dotRadius,
                width: Math.max(18, lineThickness * 3), // Touch hit box
                height: cellSize - dotRadius * 2,
              }}
              onClick={() => onLineClick('v', r, c)}
              onMouseEnter={() => !isDrawn && setHoveredLine({ type: 'v', r, c })}
              onMouseLeave={() => setHoveredLine(null)}
              className="absolute z-20 flex items-center justify-center cursor-pointer group"
            >
              <div
                style={{
                  width: isDrawn ? lineThickness + 1 : lineThickness,
                  backgroundColor: isDrawn
                    ? theme.lineActiveDefault
                    : isHovered && isHumanTurn
                    ? '#FBBF24'
                    : undefined,
                }}
                className={`h-full rounded-full transition-all duration-150 ${
                  isDrawn ? 'shadow-md' : theme.lineInactive
                }`}
              />
            </div>
          );
        })
      )}

      {/* 4. Grid Dots (Vertices) */}
      {Array.from({ length: N + 1 }).map((_, r) =>
        Array.from({ length: N + 1 }).map((_, c) => (
          <div
            key={`dot-${r}-${c}`}
            style={{
              left: c * cellSize + 12 - dotRadius,
              top: r * cellSize + 12 - dotRadius,
              width: dotRadius * 2,
              height: dotRadius * 2,
              backgroundColor: theme.dotColor,
            }}
            className="absolute z-30 rounded-full shadow-md pointer-events-none ring-1 ring-black/20"
          />
        ))
      )}
    </div>
  );
}
