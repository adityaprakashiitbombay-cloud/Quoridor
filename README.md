# 🏆 Quoridor Online & Dots & Boxes Arena

An esports-grade web board game suite featuring **Quoridor Online** with advanced AI engines and **Dots & Boxes Arena** with mathematical game theory strategies, built with React, TypeScript, Tailwind CSS, and Supabase.

---

## ✨ Features

### 1. 🏁 Quoridor Online
- **Modes**: 1v1 Ranked Duel, Custom Private Room (pass-and-play & remote room codes), Solo Campaign, and Headless AI Benchmark Arena.
- **4 AI Difficulties**:
  - **Apprentice**: Heuristic greedy advance.
  - **Tactician**: Dynamic shortest-path defense and reactive wall placement.
  - **Grandmaster**: 2-ply Minimax engine with alpha-beta pruning and Zobrist LRU transposition caching.
  - **AlphaQuoridor (MCTS)**: Victor Glendenning's Monte Carlo Tree Search engine featuring PUCT selection, shortest-path progressive bias, and aggressive path-intersection wall move pruning.
- **Game Engine**:
  - 64-bit Bitboard Bi-directional BFS pathfinding.
  - Threefold repetition and 50-move draw detection.
  - Primary Turn Timer toggle (ON / OFF) with real-time pressure indicators.
- **Esports & Analysis**:
  - Post-match Chess.com-style game review with turn-by-turn CAPS accuracy evaluation.
  - Critical turning point identification and win probability graph.
- **Solo Campaign ("The Gauntlet")**:
  - 20 handcrafted levels across 3 chapters (*The Basics*, *Tactical Puzzles*, *Master Trials*).
  - Strict 15-second blitz turn clock for master trials.
  - 3-star rating system, XP progression, and collectible streetwear stickers.

### 2. ✏️ Dots & Boxes Arena
- **Multiplayer**: 2 to 4 players with arbitrary mix of Human and AI opponents.
- **4 AI Difficulties**:
  - **Easy**: Random legal lines.
  - **Medium**: Safe moves avoiding 3rd wall sacrifices.
  - **Hard**: 2-ply Minimax capture maximization.
  - **Master (Double-Cross)**: Implements Arjun-G's game theory chain strategy, executing tactical 2-box sacrifices in long chains ($\ge 3$) to force opponents into surrendering the remainder of the board.
- **Grids**: 2×2, 3×3, 4×4, and 5×5 boards.
- **5 Custom Themes**: Acid Streetwear, Cyber Blueprint, Chalkboard, Aurora Glow, and Woodcraft.
- **Controls**: Touch/drag and direct tap line selection.
- **Continuity**: Turn continuation loop (closing a box awards an immediate extra turn) and automatic local storage session persistence (`dots_boxes_autosave`).

### 3. ⚙️ Platform & Infrastructure
- **Mobile-First UX**: Responsive mobile shell with safe-area padding and sleek floating glass navigation dock.
- **Audio Synthesizer**: Web Audio API sound generator for tactile wall placements, line draws, and celebration fanfares.
- **Supabase Keep-Alive**: Background heartbeat service running 10-minute pings to keep cloud projects active.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation
```bash
git clone https://github.com/adityaprakashiitbombay-cloud/Quoridor.git
cd Quoridor
npm install
```

### Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```
Update `.env` with your Supabase credentials (optional for offline play).

### Run Locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Run Verification Test Suite
```bash
npx tsx verify-game-logic.ts
```

### Production Build
```bash
npm run build
```

---

## 🏛️ Architecture & Project Structure

```
src/
├── components/          # Reusable UI widgets (Board, HUD, BottomDock, Modals, Stickers)
├── game/
│   ├── aiBot.ts                 # Quoridor AI bot orchestrator
│   ├── analysisEngine.ts        # Chess.com-style game review engine
│   ├── bitboard.ts              # 64-bit Bitboard bi-directional BFS pathfinder
│   ├── dotsAndBoxes.ts          # Core Dots & Boxes board & turn logic
│   ├── dotsAndBoxesAi.ts        # 4 AI tiers (including Double-Cross Master)
│   ├── dotsAndBoxesFramework.ts # Dots & Boxes state machine & auto-save
│   ├── glendenningMctsBot.ts    # Victor Glendenning's MCTS engine
│   ├── oracleWorker.ts          # Web Worker for non-blocking Minimax search
│   └── quoridor.ts              # Core Quoridor rules & draw detection
├── hooks/               # Custom React hooks (useAuth, useOracleWorker)
├── lib/                 # Supabase client & RPC synchronization
├── screens/             # Top-level screen components
│   ├── MatchHubScreen.tsx       # Main lobby & mode selector
│   ├── GameScreen.tsx           # Full Quoridor match arena
│   ├── DotsAndBoxesScreen.tsx   # Dots & Boxes game arena
│   ├── CampaignScreen.tsx       # The Gauntlet solo levels
│   └── ProfileScreen.tsx        # Player stats, stickers & skins
├── services/            # Keep-alive heartbeat & multiplayer services
└── utils/               # Web Audio API synthesizers
```

---

## 📄 License
MIT License. Open for educational and competitive gameplay use.
