import { DotsGameState, DotsBoardSize, DotsPlayer, DotsTheme } from '../types/game';
import { createInitialDotsState, playLine, LineCoord } from './dotsAndBoxes';
import { getDotsAiMove } from './dotsAndBoxesAi';
import { sounds } from '../utils/audio';

const STORAGE_KEY = 'dots_boxes_autosave';

export class DotsAndBoxesManager {
  private state: DotsGameState;
  private listeners: ((state: DotsGameState) => void)[] = [];
  private aiTimeoutId: any = null;

  constructor(
    gridSize: DotsBoardSize = 3,
    players?: DotsPlayer[],
    theme: DotsTheme = 'streetwear'
  ) {
    const defaultPlayers: DotsPlayer[] = players || [
      {
        id: 'p1',
        name: 'Player 1',
        avatar: 'james',
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
    ];

    // Try restoring autosave if matching
    const saved = this.loadAutoSave();
    if (saved && saved.gamePhase === 'playing') {
      this.state = saved;
    } else {
      this.state = createInitialDotsState(gridSize, defaultPlayers, theme);
    }
  }

  public getState(): DotsGameState {
    return this.state;
  }

  public subscribe(listener: (state: DotsGameState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.saveAutoSave();
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public startNewGame(
    gridSize: DotsBoardSize,
    players: DotsPlayer[],
    theme: DotsTheme = 'streetwear',
    isTimerEnabled: boolean = true,
    timerSeconds: number = 30
  ) {
    if (this.aiTimeoutId) {
      clearTimeout(this.aiTimeoutId);
      this.aiTimeoutId = null;
    }
    this.state = createInitialDotsState(gridSize, players, theme, isTimerEnabled, timerSeconds);
    this.notify();
    this.checkTriggerAiTurn();
  }

  public makeMove(lineType: 'h' | 'v', r: number, c: number): boolean {
    if (this.state.winner !== null || this.state.gamePhase === 'gameover') return false;

    const currentPlayer = this.state.players[this.state.currentTurn];
    const prevTurn = this.state.currentTurn;
    const prevScore = currentPlayer.score;

    const nextState = playLine(this.state, lineType, r, c);
    if (nextState === this.state) return false; // Illegal move

    const newScore = nextState.players[prevTurn].score;
    const closedCount = newScore - prevScore;

    if (closedCount > 0) {
      sounds.playBoxClaim();
    } else {
      sounds.playLineDraw();
    }

    if (nextState.winner !== null) {
      sounds.playVictoryFanfare();
    }

    this.state = nextState;
    this.notify();

    // Trigger AI if it's AI's turn
    this.checkTriggerAiTurn();
    return true;
  }

  public checkTriggerAiTurn() {
    if (this.state.winner !== null || this.state.gamePhase !== 'playing') return;

    const currentP = this.state.players[this.state.currentTurn];
    if (currentP.type === 'ai') {
      if (this.aiTimeoutId) clearTimeout(this.aiTimeoutId);

      // Realistic thoughtful thinking pause: 500-750ms
      this.aiTimeoutId = setTimeout(() => {
        if (this.state.winner !== null) return;
        const currentAi = this.state.players[this.state.currentTurn];
        if (currentAi.type !== 'ai') return;

        const decision = getDotsAiMove(this.state, currentAi.difficulty || 'medium');
        if (decision.isDoubleCross) {
          sounds.playDoubleCross();
        }
        this.makeMove(decision.move.lineType, decision.move.r, decision.move.c);
      }, 550);
    }
  }

  public setTheme(theme: DotsTheme) {
    this.state = { ...this.state, theme };
    this.notify();
  }

  public toggleTimer() {
    this.state = {
      ...this.state,
      isTimerEnabled: !this.state.isTimerEnabled,
    };
    this.notify();
  }

  private saveAutoSave() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {}
  }

  private loadAutoSave(): DotsGameState | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as DotsGameState;
    } catch {
      return null;
    }
  }

  public clearAutoSave() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}
