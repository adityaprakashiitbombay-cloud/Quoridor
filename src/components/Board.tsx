import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, Wall, Orientation, Position, OracleAdvice, WallMaterial, BoardStickerStamp } from '../types/game';
import { BOARD_SIZE, getLegalPawnMoves, isValidWallPlacement } from '../game/quoridor';
import { AvatarGraphic } from './Avatars';
import { RotateCw, Check, X } from 'lucide-react';
import { sounds } from '../utils/audio';

interface BoardProps {
  players: Player[];
  walls: Wall[];
  currentTurn: number;
  myPlayerIndex: number;
  isMyTurn: boolean;
  onMakeMove: (to: Position) => void;
  onPlaceWall: (wall: { x: number; y: number; orientation: Orientation }) => void;
  oracleAdvice?: OracleAdvice | null;
  showOracleHud?: boolean;
  onToggleStealthMaster?: () => void;
  wallMaterial?: WallMaterial;
  pawnBadge?: string;
  boardStickers?: BoardStickerStamp[];
}

export const Board: React.FC<BoardProps> = ({
  players,
  walls,
  currentTurn,
  myPlayerIndex,
  isMyTurn,
  onMakeMove,
  onPlaceWall,
  oracleAdvice,
  showOracleHud = false,
  onToggleStealthMaster,
  wallMaterial = 'caution',
  pawnBadge = 'cap',
  boardStickers = [],
}) => {
  const [selectedSlot, setSelectedSlot] = useState<{ x: number; y: number; orientation: Orientation } | null>(null);
  const [isBoardSettling, setIsBoardSettling] = useState<boolean>(false);

  // Stealth Master 5-Tap Gesture Tracker on Coordinate (0, 0)
  const a1TapCount = useRef<number>(0);
  const a1LastTapTime = useRef<number>(0);

  const activePlayer = players[currentTurn];
  const canInteract = isMyTurn && !activePlayer.isAi;
  const legalMoves = canInteract ? getLegalPawnMoves(currentTurn, players, walls) : [];

  const isMoveValid = (x: number, y: number) => {
    return legalMoves.some((m) => m.x === x && m.y === y);
  };

  // Stealth 5-tap gesture on (0, 0)
  const handleA1Tap = () => {
    const now = Date.now();
    if (now - a1LastTapTime.current > 1500) {
      a1TapCount.current = 0; // Reset if too slow
    }
    a1LastTapTime.current = now;
    a1TapCount.current += 1;

    if (a1TapCount.current >= 5) {
      a1TapCount.current = 0;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([20, 30, 20]);
      }
      onToggleStealthMaster?.();
    }
  };

  const handleTileClick = (x: number, y: number) => {
    // Secret 5-tap trigger check
    if (x === 0 && y === 0) {
      handleA1Tap();
    }

    if (!canInteract) return;
    if (isMoveValid(x, y)) {
      setSelectedSlot(null);
      sounds.playPawnHop();
      onMakeMove({ x, y });
    } else {
      sounds.playInvalidAction();
    }
  };

  // Step 1 of Two-Step "Deploy & Confirm": Tap gutter to drop tentative ghost wall
  const handleGrooveClick = (gx: number, gy: number) => {
    if (!canInteract || activePlayer.wallsLeft <= 0) {
      sounds.playInvalidAction();
      return;
    }

    // Toggle orientation if already selected
    if (selectedSlot && selectedSlot.x === gx && selectedSlot.y === gy) {
      const nextOrientation: Orientation = selectedSlot.orientation === 'H' ? 'V' : 'H';
      const check = isValidWallPlacement({ x: gx, y: gy, orientation: nextOrientation }, walls, players);
      if (check.valid) {
        setSelectedSlot({ x: gx, y: gy, orientation: nextOrientation });
        sounds.playTurnChirp();
      } else {
        sounds.playInvalidAction();
      }
      return;
    }

    let orientation: Orientation = 'H';
    let check = isValidWallPlacement({ x: gx, y: gy, orientation: 'H' }, walls, players);
    if (!check.valid) {
      orientation = 'V';
      check = isValidWallPlacement({ x: gx, y: gy, orientation: 'V' }, walls, players);
    }

    if (check.valid) {
      setSelectedSlot({ x: gx, y: gy, orientation });
      sounds.playTurnChirp();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    } else {
      sounds.playInvalidAction();
    }
  };

  // Step 2: Confirm wall placement with kinetic micro-haptic settle
  const handleConfirmWall = () => {
    if (!selectedSlot) return;
    const check = isValidWallPlacement(selectedSlot, walls, players);
    if (check.valid) {
      sounds.playWallSnap();

      // Kinetic micro-haptic screen shake
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([15, 30, 10]);
      }
      setIsBoardSettling(true);
      setTimeout(() => setIsBoardSettling(false), 240);

      onPlaceWall(selectedSlot);
      setSelectedSlot(null);
    } else {
      sounds.playInvalidAction();
    }
  };

  const handleToggleOrientation = () => {
    if (!selectedSlot) return;
    const nextOrientation: Orientation = selectedSlot.orientation === 'H' ? 'V' : 'H';
    const check = isValidWallPlacement(
      { x: selectedSlot.x, y: selectedSlot.y, orientation: nextOrientation },
      walls,
      players
    );
    if (check.valid) {
      setSelectedSlot({ ...selectedSlot, orientation: nextOrientation });
      sounds.playTurnChirp();
    } else {
      sounds.playInvalidAction();
    }
  };

  // Drag & drop handlers for dragging wall reserve onto board
  const handleDragOverGroove = (e: React.DragEvent, gx: number, gy: number) => {
    e.preventDefault();
    if (!selectedSlot || selectedSlot.x !== gx || selectedSlot.y !== gy) {
      const check = isValidWallPlacement({ x: gx, y: gy, orientation: 'H' }, walls, players);
      if (check.valid) {
        setSelectedSlot({ x: gx, y: gy, orientation: 'H' });
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(10);
        }
      }
    }
  };

  const ghostMove = showOracleHud && oracleAdvice?.recommendedAction === 'move' ? oracleAdvice.targetPosition : null;
  const ghostWall = showOracleHud && oracleAdvice?.recommendedAction === 'wall' ? oracleAdvice.targetWall : null;

  const getWallMaterialClass = (mat: WallMaterial, placedBy: number) => {
    switch (mat) {
      case 'caution':
        return 'wall-mat-caution';
      case 'concrete':
        return 'wall-mat-concrete';
      case 'neon':
        return placedBy === 0
          ? 'bg-gradient-to-r from-[#06B6D4] to-[#3B82F6] border border-[#A5F3FC] shadow-[0_0_14px_#06B6D4]'
          : 'bg-gradient-to-r from-[#EC4899] to-[#EF4444] border border-[#FBCFE8] shadow-[0_0_14px_#EC4899]';
      case 'carbon':
        return 'wall-mat-carbon';
      case 'wood':
      default:
        return placedBy === 0
          ? 'bg-gradient-to-b from-[#3B82F6] to-[#1D4ED8] border border-[#93C5FD]'
          : 'bg-gradient-to-b from-[#EF4444] to-[#B91C1C] border border-[#FCA5A5]';
    }
  };

  return (
    <div className="relative flex flex-col items-center w-full max-w-[430px] mx-auto select-none px-2">
      
      {/* SVG Multi-stop Bevel and Specular Light Filter Pipeline for Walls and Pawns */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id="clay-bevel" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blur" />
            <feSpecularLighting in="blur" surfaceScale="2" specularConstant="0.9" specularExponent="16" result="specOut" lightingColor="#FFFFFF">
              <fePointLight x="-100" y="-100" z="200" />
            </feSpecularLighting>
            <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specIn" />
            <feComposite in="SourceGraphic" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="0.5" k4="0" />
          </filter>
        </defs>
      </svg>

      {/* Tactile Board Stage with Settle Impact */}
      <div
        className={`relative w-full aspect-square bg-[#EAE2CA] rounded-[32px] p-2.5 sm:p-3 shadow-[0_16px_36px_rgba(0,0,0,0.18)] border-4 border-[#C9B995] flex flex-col justify-between transition-transform ${
          isBoardSettling ? 'animate-board-settle' : ''
        }`}
      >
        {/* Coordinate labels (A..I) */}
        <div className="absolute -top-6 left-4 right-4 flex justify-between text-[11px] font-bold text-gray-500">
          {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map((col) => (
            <span key={col} className="w-8 text-center">{col}</span>
          ))}
        </div>

        {/* 9x9 Board Surface Grid Container */}
        <div className="w-full h-full relative rounded-2xl overflow-hidden bg-[#ECE5D3]">
          
          {/* 81 Vector Tiles (Clean #FCF9F2 flat surfaces) */}
          {Array.from({ length: BOARD_SIZE }).map((_, y) =>
            Array.from({ length: BOARD_SIZE }).map((_, x) => {
              const isP1 = players[0].x === x && players[0].y === y;
              const isP2 = players[1].x === x && players[1].y === y;
              const isDestValid = isMoveValid(x, y);
              const isGhostTarget =
                showOracleHud &&
                oracleAdvice?.recommendedAction === 'move' &&
                oracleAdvice.targetPosition?.x === x &&
                oracleAdvice.targetPosition?.y === y;

              const cellWidth = 100 / BOARD_SIZE;

              return (
                <div
                  key={`cell-${x}-${y}`}
                  onClick={() => handleTileClick(x, y)}
                  style={{
                    left: `${x * cellWidth}%`,
                    top: `${y * cellWidth}%`,
                    width: `${cellWidth}%`,
                    height: `${cellWidth}%`,
                  }}
                  className={`absolute p-1 flex items-center justify-center cursor-pointer transition-colors duration-150 ${
                    isDestValid ? 'bg-[#ACF234]/30 hover:bg-[#ACF234]/50' : ''
                  }`}
                >
                  {/* Flat Vector Tile Body */}
                  <div
                    className={`w-full h-full rounded-xl transition-all duration-200 flex items-center justify-center relative ${
                      isDestValid
                        ? 'bg-[#EBF7CE] border-2 border-[#ACF234] shadow-sm'
                        : 'bg-[#FCF9F2] hover:bg-[#FFF]'
                    }`}
                  >
                    {/* Goal Row Guidance Badges */}
                    {y === 8 && (
                      <span className="absolute bottom-0.5 text-[8px] font-extrabold text-blue-400/80 pointer-events-none">
                        P1 GOAL
                      </span>
                    )}
                    {y === 0 && (
                      <span className="absolute top-0.5 text-[8px] font-extrabold text-red-400/80 pointer-events-none">
                        P2 GOAL
                      </span>
                    )}
                  </div>

                  {/* Player 0 Pawn: Parabolic Squash-and-Stretch */}
                  <AnimatePresence>
                    {isP1 && (
                      <motion.div
                        layoutId="pawn-p1"
                        initial={{ scaleX: 1.15, scaleY: 0.85, y: -6 }}
                        animate={{ scaleX: 1, scaleY: 1, y: 0 }}
                        exit={{ scaleX: 0.9, scaleY: 1.15, y: -10 }}
                        transition={{
                          type: 'spring',
                          stiffness: 420,
                          damping: 22,
                          mass: 0.8,
                        }}
                        className="relative z-20"
                      >
                        <div className="sticker-diecut">
                          <AvatarGraphic
                            id={players[0].avatar}
                            size={38}
                            badge={myPlayerIndex === 0 ? pawnBadge : undefined}
                          />
                        </div>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-1.5 bg-black/40 rounded-full blur-[1px]" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Player 1 Pawn: Parabolic Squash-and-Stretch */}
                  <AnimatePresence>
                    {isP2 && (
                      <motion.div
                        layoutId="pawn-p2"
                        initial={{ scaleX: 1.15, scaleY: 0.85, y: -6 }}
                        animate={{ scaleX: 1, scaleY: 1, y: 0 }}
                        exit={{ scaleX: 0.9, scaleY: 1.15, y: -10 }}
                        transition={{
                          type: 'spring',
                          stiffness: 420,
                          damping: 22,
                          mass: 0.8,
                        }}
                        className="relative z-20"
                      >
                        <div className="sticker-diecut">
                          <AvatarGraphic
                            id={players[1].avatar}
                            size={38}
                            badge={myPlayerIndex === 1 ? pawnBadge : 'crown'}
                          />
                        </div>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-1.5 bg-black/40 rounded-full blur-[1px]" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Holographic Ghost Pawn */}
                  {isGhostTarget && !isP1 && !isP2 && (
                    <div className="absolute z-15 opacity-70 animate-bounce">
                      <div className="p-1 rounded-full bg-[#FACC15]/40 border-2 border-dashed border-[#FACC15]">
                        <AvatarGraphic id={players[myPlayerIndex].avatar} size={28} showStickerBorder={false} />
                      </div>
                    </div>
                  )}

                  {/* Pulsing Move Dot */}
                  {isDestValid && !isP1 && !isP2 && !isGhostTarget && (
                    <div className="w-3 h-3 rounded-full bg-[#8FD418] shadow-sm animate-ping opacity-80" />
                  )}
                </div>
              );
            })
          )}

          {/* Non-overlapping Gutter Hitboxes (Strictly bounded to avoid overlap misclicks) */}
          {Array.from({ length: BOARD_SIZE - 1 }).map((_, gy) =>
            Array.from({ length: BOARD_SIZE - 1 }).map((_, gx) => {
              const leftPercent = ((gx + 1) / BOARD_SIZE) * 100;
              const topPercent = ((gy + 1) / BOARD_SIZE) * 100;

              return (
                <div
                  key={`groove-${gx}-${gy}`}
                  onClick={() => handleGrooveClick(gx, gy)}
                  onDragOver={(e) => handleDragOverGroove(e, gx, gy)}
                  style={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full cursor-pointer z-25 flex items-center justify-center group"
                >
                  {/* Recessed cavity slot indicator */}
                  <div className="w-2 h-2 rounded-full bg-[#151821]/20 group-hover:bg-[#151821]/60 transition-colors shadow-inner" />
                </div>
              );
            })
          )}

          {/* Placed Walls with Selected Material Shader */}
          {walls.map((wall) => {
            const isH = wall.orientation === 'H';
            const cellWidthPercent = 100 / BOARD_SIZE;

            return (
              <React.Fragment key={wall.id}>
                {/* 50% Opacity Directional Contact Shadow */}
                <div
                  style={{
                    left: isH ? `${wall.x * cellWidthPercent}%` : `${(wall.x + 1) * cellWidthPercent - 2}%`,
                    top: isH ? `${(wall.y + 1) * cellWidthPercent - 0.5}%` : `${wall.y * cellWidthPercent}%`,
                    width: isH ? `${cellWidthPercent * 2}%` : '10px',
                    height: isH ? '10px' : `${cellWidthPercent * 2}%`,
                  }}
                  className="absolute z-29 rounded-full bg-black/50 blur-[1px]"
                />

                {/* Tactile Wall Body with Selected Material (Caution Tape, Concrete, Neon Acrylic, Carbon Fiber, Wood) */}
                <div
                  style={{
                    left: isH ? `${wall.x * cellWidthPercent}%` : `${(wall.x + 1) * cellWidthPercent - 1.2}%`,
                    top: isH ? `${(wall.y + 1) * cellWidthPercent - 1.2}%` : `${wall.y * cellWidthPercent}%`,
                    width: isH ? `${cellWidthPercent * 2}%` : '8px',
                    height: isH ? '8px' : `${cellWidthPercent * 2}%`,
                    filter: 'url(#clay-bevel)',
                  }}
                  className={`absolute z-30 rounded-full wall-contact-shadow transition-all ${getWallMaterialClass(
                    wallMaterial,
                    wall.placedBy
                  )}`}
                >
                  <div className="w-full h-[1.5px] bg-white/70 rounded-t-full" />
                </div>
              </React.Fragment>
            );
          })}

          {/* Board Surface Slap Reaction Stickers */}
          {boardStickers.map((sticker) => (
            <div
              key={sticker.id}
              style={{
                left: `${sticker.x}%`,
                top: `${sticker.y}%`,
                transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`,
              }}
              className="absolute z-40 pointer-events-none animate-sticker-slap flex flex-col items-center"
            >
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-3 py-1.5 border-3 border-black shadow-[0_10px_20px_rgba(0,0,0,0.4)] flex items-center gap-1.5 select-none">
                <span className="text-2xl drop-shadow-sm">{sticker.emoji}</span>
                <span className="font-display text-sm tracking-wider text-black">{sticker.text}</span>
              </div>
            </div>
          ))}

          {/* Step 1 Tentative Ghost Wall Preview with Elastic Snapping */}
          {selectedSlot && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              style={{
                left: selectedSlot.orientation === 'H'
                  ? `${selectedSlot.x * (100 / BOARD_SIZE)}%`
                  : `${(selectedSlot.x + 1) * (100 / BOARD_SIZE) - 1.2}%`,
                top: selectedSlot.orientation === 'H'
                  ? `${(selectedSlot.y + 1) * (100 / BOARD_SIZE) - 1.2}%`
                  : `${selectedSlot.y * (100 / BOARD_SIZE)}%`,
                width: selectedSlot.orientation === 'H' ? `${(100 / BOARD_SIZE) * 2}%` : '8px',
                height: selectedSlot.orientation === 'H' ? '8px' : `${(100 / BOARD_SIZE) * 2}%`,
              }}
              className="absolute z-35 rounded-full bg-[#ACF234] border-2 border-white shadow-[0_0_16px_#ACF234]"
            />
          )}

          {/* Holographic Ghost Wall (Master Oracle Recommendation) */}
          {ghostWall && !selectedSlot && (
            <div
              style={{
                left: ghostWall.orientation === 'H'
                  ? `${ghostWall.x * (100 / BOARD_SIZE)}%`
                  : `${(ghostWall.x + 1) * (100 / BOARD_SIZE) - 1.2}%`,
                top: ghostWall.orientation === 'H'
                  ? `${(ghostWall.y + 1) * (100 / BOARD_SIZE) - 1.2}%`
                  : `${ghostWall.y * (100 / BOARD_SIZE)}%`,
                width: ghostWall.orientation === 'H' ? `${(100 / BOARD_SIZE) * 2}%` : '8px',
                height: ghostWall.orientation === 'H' ? '8px' : `${(100 / BOARD_SIZE) * 2}%`,
              }}
              className="absolute z-28 rounded-full bg-[#FACC15]/80 border-2 border-dashed border-[#F59E0B] shadow-[0_0_16px_#FACC15] animate-pulse"
            >
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                ⚡ ALPHA WALL
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Step 2: Floating Thumb-Zone Action Pill (Deploy & Confirm Control) */}
      {selectedSlot && (
        <div className="mt-3 flex items-center justify-center gap-3 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.2)] border-2 border-[#121212] animate-in fade-in slide-in-from-bottom-2 z-40">
          <button
            onClick={handleToggleOrientation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition active:scale-95"
          >
            <RotateCw size={14} />
            <span>{selectedSlot.orientation === 'H' ? 'Rotate 90°' : 'Rotate 90°'}</span>
          </button>

          <button
            onClick={handleConfirmWall}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#ACF234] hover:bg-[#9BE322] text-[#121212] text-xs font-extrabold shadow-sm transition active:scale-95"
          >
            <Check size={16} strokeWidth={3} />
            <span>CONFIRM</span>
          </button>

          <button
            onClick={() => setSelectedSlot(null)}
            className="p-1.5 rounded-full bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 transition active:scale-95"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};
