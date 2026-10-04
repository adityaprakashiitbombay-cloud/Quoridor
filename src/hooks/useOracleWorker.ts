import { useState, useEffect, useRef } from 'react';
import { Player, Wall, OracleAdvice } from '../types/game';
import { calculateAlphaAdvice } from '../game/alphaOracle';

export function useOracleWorker(
  isMaster: boolean,
  playerIndex: number,
  players: Player[],
  walls: Wall[],
  winner: number | null
): OracleAdvice | null {
  const [advice, setAdvice] = useState<OracleAdvice | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!isMaster || winner !== null) {
      setAdvice(null);
      return;
    }

    // Try using Web Worker if available, with synchronous fallback
    try {
      if (!workerRef.current && typeof Worker !== 'undefined') {
        workerRef.current = new Worker(
          new URL('../workers/oracleWorker.ts', import.meta.url),
          { type: 'module' }
        );
      }

      if (workerRef.current) {
        workerRef.current.onmessage = (e: MessageEvent<{ success: boolean; advice: OracleAdvice }>) => {
          if (e.data.success && e.data.advice) {
            setAdvice(e.data.advice);
          }
        };

        workerRef.current.postMessage({ playerIndex, players, walls });
        return;
      }
    } catch {
      // Fallback to synchronous calculation if Worker is restricted
    }

    const directAdvice = calculateAlphaAdvice(playerIndex, players, walls);
    setAdvice(directAdvice);
  }, [isMaster, playerIndex, players, walls, winner]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  return advice;
}
