import React, { useState } from 'react';
import { isMasterUser, MASTER_USERNAME, MASTER_PASSCODE } from '../game/alphaOracle';
import { ShieldCheck, Lock, X, Zap } from 'lucide-react';
import { sounds } from '../utils/audio';

interface MasterLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMaster: boolean;
  onLoginSuccess: (master: boolean) => void;
}

export const MasterLoginModal: React.FC<MasterLoginModalProps> = ({
  isOpen,
  onClose,
  isMaster,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isMasterUser(username, passcode)) {
      sounds.playVictoryFanfare();
      onLoginSuccess(true);
      setError('');
      onClose();
    } else {
      sounds.playInvalidAction();
      setError('Invalid master credentials. Use ALPHA / 1845.');
    }
  };

  const handleDisableMaster = () => {
    onLoginSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-sm bg-gradient-to-b from-gray-900 to-black text-white rounded-[32px] p-6 border-4 border-amber-400 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center mb-3">
            <Zap size={30} className="text-amber-400 fill-amber-400 animate-pulse" />
          </div>

          <h2 className="text-2xl font-display tracking-wider text-amber-400">
            {isMaster ? 'MASTER MODE ACTIVE' : 'ALPHA ACCESS'}
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-[240px]">
            {isMaster
              ? 'Tactical AI Oracle and in-game ghost predictions are currently active.'
              : 'Enter master credentials to unlock calculated decision advice and god-view overlays.'}
          </p>
        </div>

        {isMaster ? (
          <div className="mt-6 flex flex-col gap-3">
            <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
              <ShieldCheck className="text-amber-400 shrink-0" size={18} />
              <span>Session authenticated as <strong>ALPHA</strong>. Detour maximization and live path delta enabled.</span>
            </div>

            <button
              onClick={handleDisableMaster}
              className="w-full py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs tracking-wider transition active:scale-95"
            >
              DISABLE MASTER MODE
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="mt-5 flex flex-col gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-300 block mb-1">
                MASTER USERNAME
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. ALPHA"
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-300 block mb-1">
                PASSCODE
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="e.g. 1845"
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 font-medium text-center">{error}</p>
            )}

            <button
              type="submit"
              className="mt-2 w-full py-3 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-display text-sm tracking-wider shadow-lg transition active:scale-95"
            >
              UNLOCK ALPHA ORACLE
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
