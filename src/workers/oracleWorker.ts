import { calculateAlphaAdvice } from '../game/alphaOracle';
import { Player, Wall } from '../types/game';

self.onmessage = (e: MessageEvent<{ playerIndex: number; players: Player[]; walls: Wall[] }>) => {
  const { playerIndex, players, walls } = e.data;
  try {
    const advice = calculateAlphaAdvice(playerIndex, players, walls);
    self.postMessage({ success: true, advice });
  } catch (error) {
    self.postMessage({ success: false, error: String(error) });
  }
};
