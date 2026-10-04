import React, { useState, useMemo } from 'react';
import { Player, Wall, Orientation, Position, WallMaterial } from '../types/game';
import { Board } from '../components/Board';
import { BOARD_SIZE, getShortestPath, isValidWallPlacement } from '../game/quoridor';
import { sounds } from '../utils/audio';
import {
  Undo2,
  Share2,
  Check,
  AlertTriangle,
  Play,
  Trash2,
  RotateCcw,
  Sparkles,
  Download,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

interface SandboxScreenProps {
  onBack: () => void;
  onPlayCustomGame?: (customPlayers: Player[], customWalls: Wall[]) => void;
  wallMaterial?: WallMaterial;
  userAvatar?: string;
  userName?: string;
}

type SandboxTool = 'p1' | 'p2' | 'wallH' | 'wallV' | 'eraser';

export const SandboxScreen: React.FC<SandboxScreenProps> = ({
  onBack,
  onPlayCustomGame,
  wallMaterial = 'caution',
  userAvatar = 'james',
  userName = 'James',
}) => {
  const [players, setPlayers] = useState<Player[]>([
    {
      id: 'p1',
      name: userName,
      avatar: userAvatar,
      x: 4,
      y: 0,
      targetRow: 8,
      wallsLeft: 10,
      color: '#2563EB',
      accentColor: '#60A7FF',
    },
    {
      id: 'p2',
      name: 'Nemesis',
      avatar: 'blaze',
      x: 4,
      y: 8,
      targetRow: 0,
      wallsLeft: 10,
      color: '#DC2626',
      accentColor: '#F87171',
    },
  ]);

  const [walls, setWalls] = useState<Wall[]>([]);
  const [activeTool, setActiveTool] = useState<SandboxTool>('wallH');
  const [shareCode, setShareCode] = useState<string>('Q-8F39A');
  const [copied, setCopied] = useState<boolean>(false);
  const [importInput, setImportInput] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);

  // Validate solvability for both players using BFS
  const solvability = useMemo(() => {
    const p1Path = getShortestPath({ x: players[0].x, y: players[0].y }, players[0].targetRow, walls);
    const p2Path = getShortestPath({ x: players[1].x, y: players[1].y }, players[1].targetRow, walls);

    const isP1Solvable = p1Path !== null && p1Path.path.length > 0;
    const isP2Solvable = p2Path !== null && p2Path.path.length > 0;

    return {
      solvable: isP1Solvable && isP2Solvable,
      p1Steps: p1Path ? p1Path.length : 0,
      p2Steps: p2Path ? p2Path.length : 0,
      isP1Solvable,
      isP2Solvable,
    };
  }, [players, walls]);

  // Generate 6-character share code and persist in local puzzle registry
  const generateShareCode = (currentPlayers: Player[], currentWalls: Wall[]) => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const formatted = `Q-${code.slice(0, 3)}${code.slice(3, 5)}`;

    // Store in localStorage registry
    try {
      const registry = JSON.parse(localStorage.getItem('quoridor_custom_puzzles') || '{}');
      registry[formatted] = {
        players: currentPlayers,
        walls: currentWalls,
        timestamp: Date.now(),
      };
      localStorage.setItem('quoridor_custom_puzzles', JSON.stringify(registry));
    } catch {
      // ignore
    }

    setShareCode(formatted);
    return formatted;
  };

  const handleCopyCode = () => {
    sounds.playTurnChirp();
    const code = generateShareCode(players, walls);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportPuzzle = () => {
    const target = importInput.trim().toUpperCase();
    try {
      const registry = JSON.parse(localStorage.getItem('quoridor_custom_puzzles') || '{}');
      if (registry[target]) {
        sounds.playVictoryFanfare();
        setPlayers(registry[target].players);
        setWalls(registry[target].walls);
        setShareCode(target);
        setIsImportOpen(false);
        setImportError(null);
        return;
      }
    } catch {
      // ignore
    }

    setImportError('Puzzle code not found in registry. Check and try again.');
    sounds.playInvalidAction();
  };

  // Click on tile to position pawn if tool is p1 or p2
  const handleTileClick = (pos: Position) => {
    if (activeTool === 'p1') {
      sounds.playPawnHop();
      setPlayers((prev) => [{ ...prev[0], x: pos.x, y: pos.y }, prev[1]]);
    } else if (activeTool === 'p2') {
      sounds.playPawnHop();
      setPlayers((prev) => [prev[0], { ...prev[1], x: pos.x, y: pos.y }]);
    }
  };

  // Click on groove to place wall or remove wall
  const handlePlaceWallSlot = (slot: { x: number; y: number; orientation: Orientation }) => {
    if (activeTool === 'eraser') {
      // Find matching wall to erase
      const existing = walls.find(
        (w) => w.x === slot.x && w.y === slot.y && w.orientation === slot.orientation
      );
      if (existing) {
        sounds.playWallSnap();
        setWalls((prev) => prev.filter((w) => w.id !== existing.id));
      } else {
        sounds.playInvalidAction();
      }
      return;
    }

    const orientation: Orientation = activeTool === 'wallV' ? 'V' : 'H';
    const check = isValidWallPlacement({ x: slot.x, y: slot.y, orientation }, walls, players);

    if (check.valid) {
      sounds.playWallSnap();
      const newWall: Wall = {
        id: `wall-custom-${Date.now()}`,
        x: slot.x,
        y: slot.y,
        orientation,
        placedBy: 0,
      };
      setWalls((prev) => [...prev, newWall]);
    } else {
      sounds.playInvalidAction();
    }
  };

  const handleClearBoard = () => {
    sounds.playWallSnap();
    setWalls([]);
  };

  const handleResetDefaults = () => {
    sounds.playTurnChirp();
    setPlayers([
      { ...players[0], x: 4, y: 0 },
      { ...players[1], x: 4, y: 8 },
    ]);
    setWalls([]);
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#ECE5D3] px-3 pt-3 pb-24 flex flex-col items-center select-none overflow-y-auto">
      <div className="w-full max-w-[430px] flex flex-col items-center gap-2">
        
        {/* Top Header */}
        <div className="w-full flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-black text-xs font-extrabold hover:bg-gray-100 transition active:scale-95 shadow-sm"
          >
            <Undo2 size={15} />
            <span>EXIT</span>
          </button>

          <div className="flex flex-col items-center">
            <h1 className="font-display text-lg tracking-wider text-black">LABYRINTH SANDBOX</h1>
            <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider -mt-1">
              CUSTOM PUZZLE BUILDER
            </span>
          </div>

          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black text-[#ACF234] text-xs font-extrabold shadow-sm active:scale-95"
            title="Import 6-char puzzle code"
          >
            <Download size={13} />
            <span>LOAD</span>
          </button>
        </div>

        {/* Live BFS Solvability Banner */}
        <div
          className={`w-full p-2.5 rounded-2xl border-2 flex items-center justify-between shadow-sm transition-all ${
            solvability.solvable
              ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
              : 'bg-red-50 border-red-400 text-red-950'
          }`}
        >
          <div className="flex items-center gap-2">
            {solvability.solvable ? (
              <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle size={20} className="text-red-600 shrink-0" />
            )}
            <div className="flex flex-col">
              <span className="font-display text-xs tracking-wider">
                {solvability.solvable ? 'SOLVABLE LABYRINTH' : 'UNSOLVABLE! PATH BLOCKED'}
              </span>
              <span className="text-[10px] font-bold text-gray-600">
                {solvability.solvable
                  ? `P1 Shortest: ${solvability.p1Steps} steps • P2 Shortest: ${solvability.p2Steps} steps`
                  : 'At least one pawn is boxed in with zero escape corridors.'}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="font-mono text-xs font-black">
              {walls.length} Walls
            </span>
          </div>
        </div>

        {/* Toolbox Toolbar */}
        <div className="w-full bg-white rounded-2xl p-2 border-2 border-black/15 shadow-sm flex items-center justify-between gap-1">
          <button
            onClick={() => setActiveTool('wallH')}
            className={`flex-1 py-1.5 rounded-xl font-extrabold text-xs transition flex flex-col items-center ${
              activeTool === 'wallH'
                ? 'bg-black text-white shadow-sm ring-2 ring-black'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
            }`}
          >
            <span>━ Wall H</span>
          </button>

          <button
            onClick={() => setActiveTool('wallV')}
            className={`flex-1 py-1.5 rounded-xl font-extrabold text-xs transition flex flex-col items-center ${
              activeTool === 'wallV'
                ? 'bg-black text-white shadow-sm ring-2 ring-black'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
            }`}
          >
            <span>┃ Wall V</span>
          </button>

          <button
            onClick={() => setActiveTool('p1')}
            className={`flex-1 py-1.5 rounded-xl font-extrabold text-xs transition flex flex-col items-center ${
              activeTool === 'p1'
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
            }`}
          >
            <span>👤 Move P1</span>
          </button>

          <button
            onClick={() => setActiveTool('p2')}
            className={`flex-1 py-1.5 rounded-xl font-extrabold text-xs transition flex flex-col items-center ${
              activeTool === 'p2'
                ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-600'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
            }`}
          >
            <span>👤 Move P2</span>
          </button>

          <button
            onClick={() => setActiveTool('eraser')}
            className={`px-2.5 py-1.5 rounded-xl font-extrabold text-xs transition flex flex-col items-center ${
              activeTool === 'eraser'
                ? 'bg-amber-500 text-black shadow-sm ring-2 ring-amber-500'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
            }`}
            title="Eraser tool"
          >
            <Trash2 size={15} />
          </button>
        </div>

        {/* Freeform Board Surface */}
        <div className="w-full mt-1">
          <Board
            players={players}
            walls={walls}
            currentTurn={0}
            myPlayerIndex={0}
            isMyTurn={true}
            onMakeMove={handleTileClick}
            onPlaceWall={handlePlaceWallSlot}
            wallMaterial={wallMaterial}
          />
        </div>

        {/* Action Controls & Share Code Generator */}
        <div className="w-full bg-white rounded-3xl p-3 border-2 border-black shadow-md flex flex-col gap-2 mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <KeyRound size={16} className="text-amber-500" />
              <span className="text-xs font-extrabold text-gray-900">PUZZLE SHARE CODE</span>
            </div>
            <span className="font-mono text-sm font-black bg-gray-100 px-2.5 py-0.5 rounded-lg border border-black/10 text-black">
              {shareCode}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Copy 6-Char Code Button */}
            <button
              onClick={handleCopyCode}
              className="py-2.5 rounded-2xl bg-black text-white font-display text-xs tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:bg-gray-800 transition active:scale-95"
            >
              {copied ? <Check size={15} className="text-[#ACF234]" /> : <Share2 size={15} />}
              <span>{copied ? 'CODE COPIED!' : 'SHARE 6-CHAR CODE'}</span>
            </button>

            {/* Test Play Button */}
            <button
              onClick={() => onPlayCustomGame?.(players, walls)}
              disabled={!solvability.solvable}
              className="py-2.5 rounded-2xl bg-[#ACF234] hover:bg-[#9BE322] text-[#121212] font-display text-xs tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-40"
            >
              <Play size={15} fill="#121212" />
              <span>TEST PLAY PUZZLE</span>
            </button>
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-gray-100 text-xs font-bold text-gray-500">
            <button
              onClick={handleClearBoard}
              className="flex items-center gap-1 text-red-600 hover:text-red-700 transition"
            >
              <Trash2 size={13} />
              <span>Clear All Walls</span>
            </button>

            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition"
            >
              <RotateCcw size={13} />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* Load / Import Code Modal */}
        {isImportOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl p-5 border-4 border-black shadow-2xl flex flex-col gap-3 text-center">
              <h3 className="font-display text-lg tracking-wider text-black">IMPORT 6-CHAR PUZZLE</h3>
              <p className="text-xs font-bold text-gray-600 -mt-1">
                Enter a 6-character code (e.g. Q-8F39A) to load a friend's custom labyrinth.
              </p>

              <input
                type="text"
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                placeholder="e.g. Q-8F39A"
                className="w-full px-4 py-3 rounded-2xl border-2 border-black font-mono font-black text-center text-lg uppercase focus:outline-none focus:ring-4 focus:ring-[#ACF234]"
              />

              {importError && (
                <span className="text-xs font-extrabold text-red-600">{importError}</span>
              )}

              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setIsImportOpen(false)}
                  className="flex-1 py-2.5 rounded-full bg-gray-200 text-black font-display text-xs tracking-wider hover:bg-gray-300"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleImportPuzzle}
                  className="flex-1 py-2.5 rounded-full bg-black text-white font-display text-xs tracking-wider hover:bg-gray-800"
                >
                  LOAD PUZZLE
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
