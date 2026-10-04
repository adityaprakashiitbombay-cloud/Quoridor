import React, { useState, useRef, useEffect } from 'react';
import { UserStickerPlacement, StickerItem } from '../types/game';
import {
  getUserStickerPlacements,
  saveUserStickerPlacements,
  MASTER_STICKERS,
} from '../lib/progressionRpc';
import { sounds } from '../utils/audio';
import { RotateCw, RotateCcw, ZoomIn, ZoomOut, Trash2, Plus, Sparkles, Move } from 'lucide-react';

interface InteractiveStickerDeckProps {
  onStickerCountChange?: (count: number) => void;
}

export const InteractiveStickerDeck: React.FC<InteractiveStickerDeckProps> = ({
  onStickerCountChange,
}) => {
  const [placements, setPlacements] = useState<UserStickerPlacement[]>(() =>
    getUserStickerPlacements()
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const deckRef = useRef<HTMLDivElement>(null);

  // 3D Perspective Tilt Physics State
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Dragging state
  const draggingRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    initialCanvasX: number;
    initialCanvasY: number;
  } | null>(null);

  useEffect(() => {
    onStickerCountChange?.(placements.length);
  }, [placements.length, onStickerCountChange]);

  // Mouse Move for 3D Perspective Tilt on Skateboard Deck
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!deckRef.current || draggingRef.current) return;
    const rect = deckRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    // Rotate up to 10 degrees
    setTilt({
      x: -py * 12,
      y: px * 12,
    });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    sounds.playPawnHop();

    const placement = placements.find((p) => p.id === id);
    if (!placement || !deckRef.current) return;

    draggingRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialCanvasX: placement.canvasX,
      initialCanvasY: placement.canvasY,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current || !deckRef.current) return;
    const rect = deckRef.current.getBoundingClientRect();
    const dx = ((e.clientX - draggingRef.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - draggingRef.current.startY) / rect.height) * 100;

    const newX = Math.max(5, Math.min(95, draggingRef.current.initialCanvasX + dx));
    const newY = Math.max(5, Math.min(95, draggingRef.current.initialCanvasY + dy));

    setPlacements((prev) =>
      prev.map((p) =>
        p.id === draggingRef.current!.id
          ? { ...p, canvasX: Math.round(newX), canvasY: Math.round(newY) }
          : p
      )
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingRef.current) {
      saveUserStickerPlacements(placements);
      sounds.playWallSnap();
      draggingRef.current = null;
    }
  };

  // Sticker Transformation Controls
  const rotateSticker = (deltaDegrees: number) => {
    if (!selectedId) return;
    sounds.playPawnHop();
    const updated = placements.map((p) =>
      p.id === selectedId
        ? { ...p, canvasRotation: ((p.canvasRotation + deltaDegrees + 180) % 360) - 180 }
        : p
    );
    setPlacements(updated);
    saveUserStickerPlacements(updated);
  };

  const scaleSticker = (deltaScale: number) => {
    if (!selectedId) return;
    sounds.playPawnHop();
    const updated = placements.map((p) =>
      p.id === selectedId
        ? { ...p, scale: Math.max(0.6, Math.min(1.8, Math.round((p.scale + deltaScale) * 10) / 10)) }
        : p
    );
    setPlacements(updated);
    saveUserStickerPlacements(updated);
  };

  const removeSticker = () => {
    if (!selectedId) return;
    sounds.playInvalidAction();
    const updated = placements.filter((p) => p.id !== selectedId);
    setPlacements(updated);
    setSelectedId(null);
    saveUserStickerPlacements(updated);
  };

  const addStickerToDeck = (sticker: StickerItem) => {
    sounds.playVictoryFanfare();
    const newPlacement: UserStickerPlacement = {
      id: `plm-${sticker.slug}-${Date.now()}`,
      userId: 'usr-local-player-1',
      stickerId: sticker.id,
      sticker,
      canvasX: Math.round(30 + Math.random() * 40),
      canvasY: Math.round(30 + Math.random() * 40),
      canvasRotation: Math.round(-20 + Math.random() * 40),
      scale: 1.0,
      isPinned: true,
      unlockedAt: new Date().toISOString(),
    };
    const updated = [...placements, newPlacement];
    setPlacements(updated);
    setSelectedId(newPlacement.id);
    saveUserStickerPlacements(updated);
  };

  // Visual sticker rendering with 3D claymorphic assets, SVG graphics & CSS Dynamic Sticker Shader
  const renderStickerGraphic = (sticker: StickerItem, scale: number) => {
    const isRare = sticker.rarity === 'rare';
    const isEpic = sticker.rarity === 'epic';
    const isLegendary = sticker.rarity === 'legendary';
    const hasRasterAsset = sticker.imageUrl.endsWith('.jpg') || sticker.imageUrl.endsWith('.png');

    if (hasRasterAsset) {
      return (
        <div
          className="relative select-none pointer-events-none transition-transform"
          style={{ width: `${68 * scale}px`, height: `${68 * scale}px` }}
        >
          <img
            src={sticker.imageUrl}
            alt={sticker.name}
            className={`w-full h-full object-contain rounded-2xl streetwear-sticker drop-shadow-xl ${
              isLegendary ? 'sticker-foil-gold' : isRare ? 'sticker-holo-prism' : ''
            }`}
            draggable={false}
          />
          {/* Subtle 3D toy tactile gloss overlay */}
          <div className="absolute inset-0 rounded-2xl pointer-events-none bg-gradient-to-b from-white/20 to-transparent opacity-60" />
        </div>
      );
    }

    return (
      <div
        className={`relative rounded-2xl p-2 flex flex-col items-center justify-center transition-transform select-none shadow-md streetwear-sticker ${
          isLegendary
            ? 'bg-gradient-to-br from-amber-300 via-yellow-100 to-amber-500 border-2 border-amber-600 text-amber-950 ring-2 ring-yellow-400 sticker-foil-gold'
            : isEpic
            ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-600 border-2 border-purple-200 text-white shadow-purple-500/50'
            : isRare
            ? 'bg-gradient-to-br from-cyan-400 via-teal-300 to-blue-500 border-2 border-white text-gray-900 sticker-holo-prism'
            : 'bg-white border-2 border-black text-black'
        }`}
        style={{ width: `${64 * scale}px`, height: `${64 * scale}px` }}
      >
        {/* Die-cut vinyl white border */}
        <div className="absolute inset-0 rounded-2xl border-2 border-white/60 pointer-events-none" />

        {/* Emoji / Graphic Icon */}
        <span style={{ fontSize: `${28 * scale}px` }} className="drop-shadow">
          {sticker.badgeEmoji || '🏷️'}
        </span>

        {/* Mini Label */}
        <span
          className="font-extrabold uppercase truncate tracking-tight text-center mt-0.5 leading-none px-1"
          style={{ fontSize: `${8 * scale}px` }}
        >
          {sticker.name.split(' ')[0]}
        </span>

        {/* Animated Shimmer / Glint on Epic & Legendary */}
        {(isEpic || isLegendary) && (
          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white animate-ping pointer-events-none" />
        )}
      </div>
    );
  };

  const selectedPlacement = placements.find((p) => p.id === selectedId);

  return (
    <div className="w-full flex flex-col items-center mt-3 select-none">
      
      {/* Section Header */}
      <div className="w-full flex items-center justify-between px-1 mb-1.5">
        <div className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-amber-500 fill-amber-400" />
          <span className="text-xs font-extrabold text-[#121212] tracking-wide">
            TROPHY STICKER DECK
          </span>
          <span className="text-[10px] font-bold px-2 py-0.2 bg-black/10 text-black rounded-full">
            {placements.length} PLACED
          </span>
        </div>

        <button
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="text-[11px] font-extrabold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
        >
          <Plus size={13} strokeWidth={3} />
          <span>{isDrawerOpen ? 'Close Stash' : 'Add Sticker'}</span>
        </button>
      </div>

      {/* Skateboard Deck / Laptop Lid Physical Canvas Container */}
      <div
        className="w-full relative"
        style={{ perspective: '1000px' }}
      >
        <div
          ref={deckRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={() => setSelectedId(null)}
          className="w-full h-56 rounded-3xl relative overflow-hidden transition-transform duration-150 ease-out cursor-crosshair border-4 border-[#121212] shadow-[0_16px_36px_rgba(0,0,0,0.18)]"
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            background: 'linear-gradient(135deg, #1E1B18 0%, #2D2721 50%, #151311 100%)',
          }}
        >
          {/* Deck Surface Texture: Skateboard grip tape or carbon weave */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)',
              backgroundSize: '12px 12px',
            }}
          />

          {/* Skateboard Deck Center Racing Stripe */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 bg-gradient-to-r from-amber-500/20 via-yellow-400/30 to-amber-500/20 border-y border-amber-500/30 pointer-events-none flex items-center justify-center">
            <span className="text-[9px] font-mono uppercase tracking-[0.4em] text-white/30 font-bold">
              ADINOMIDE // PRO DECK EDITION
            </span>
          </div>

          {/* Placed Vinyl Stickers */}
          {placements.map((p) => {
            const isSelected = selectedId === p.id;
            return (
              <div
                key={p.id}
                onPointerDown={(e) => handlePointerDown(e, p.id)}
                className={`absolute cursor-grab active:cursor-grabbing transition-shadow duration-100 ${
                  isSelected ? 'z-30 ring-2 ring-amber-400 rounded-2xl' : 'z-10 hover:z-20'
                }`}
                style={{
                  left: `${p.canvasX}%`,
                  top: `${p.canvasY}%`,
                  transform: `translate(-50%, -50%) rotate(${p.canvasRotation}deg)`,
                }}
              >
                {renderStickerGraphic(p.sticker, p.scale)}
              </div>
            );
          })}

          {/* Empty State Prompt */}
          {placements.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 text-xs font-bold pointer-events-none">
              <Move size={20} className="mb-1" />
              <span>Deck is empty. Open Stash to stick badges!</span>
            </div>
          )}
        </div>
      </div>

      {/* Floating Micro-Toolbar for Selected Sticker */}
      {selectedPlacement && (
        <div className="w-full mt-2 bg-white/95 backdrop-blur-md rounded-2xl px-3 py-1.5 border border-black/10 shadow-sm flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-1.5 font-extrabold text-gray-800">
            <span>{selectedPlacement.sticker.badgeEmoji}</span>
            <span className="truncate max-w-[120px]">{selectedPlacement.sticker.name}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => rotateSticker(-15)}
              className="p-1 hover:bg-gray-100 rounded-lg text-gray-700 transition active:scale-95"
              title="Rotate Left (-15°)"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => rotateSticker(15)}
              className="p-1 hover:bg-gray-100 rounded-lg text-gray-700 transition active:scale-95"
              title="Rotate Right (+15°)"
            >
              <RotateCw size={14} />
            </button>
            <button
              onClick={() => scaleSticker(0.1)}
              className="p-1 hover:bg-gray-100 rounded-lg text-gray-700 transition active:scale-95"
              title="Scale Up"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => scaleSticker(-0.1)}
              className="p-1 hover:bg-gray-100 rounded-lg text-gray-700 transition active:scale-95"
              title="Scale Down"
            >
              <ZoomOut size={14} />
            </button>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <button
              onClick={removeSticker}
              className="p-1 hover:bg-red-50 text-red-600 rounded-lg transition active:scale-95"
              title="Remove from Deck"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Unlocked Sticker Stash Drawer */}
      {isDrawerOpen && (
        <div className="w-full mt-2 bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-black/10 shadow-md flex flex-col gap-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs font-extrabold text-gray-700">
            <span>UNLOCKED STICKER STASH</span>
            <span className="text-[10px] text-gray-400">Click to place onto deck</span>
          </div>

          <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
            {MASTER_STICKERS.map((stk) => {
              const alreadyPlaced = placements.some((p) => p.stickerId === stk.id);
              const hasRaster = stk.imageUrl.endsWith('.jpg') || stk.imageUrl.endsWith('.png');
              return (
                <button
                  key={stk.id}
                  onClick={() => addStickerToDeck(stk)}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition ${
                    alreadyPlaced
                      ? 'bg-gray-50 border-gray-200 opacity-60'
                      : 'bg-white hover:bg-blue-50 border-black/10 hover:border-blue-500 shadow-sm active:scale-95'
                  }`}
                >
                  {hasRaster ? (
                    <img
                      src={stk.imageUrl}
                      alt={stk.name}
                      className="w-8 h-8 object-contain rounded-lg streetwear-sticker"
                    />
                  ) : (
                    <span className="text-2xl">{stk.badgeEmoji}</span>
                  )}
                  <span className="text-[9px] font-extrabold text-gray-800 truncate w-full text-center">
                    {stk.name.split(' ')[0]}
                  </span>
                  <span
                    className={`text-[8px] font-bold uppercase px-1 rounded ${
                      stk.rarity === 'legendary'
                        ? 'bg-amber-100 text-amber-800'
                        : stk.rarity === 'epic'
                        ? 'bg-purple-100 text-purple-800'
                        : stk.rarity === 'rare'
                        ? 'bg-cyan-100 text-cyan-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {stk.rarity}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
