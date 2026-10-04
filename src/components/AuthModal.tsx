import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { sounds } from '../utils/audio';
import { Lock, Mail, User, Sparkles, X, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { isGuest, signInWithPassword, signUp, signInAnonymously } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const { error } = await signInWithPassword(email, password);
        if (error) {
          setErrorMsg(error.message);
        } else {
          sounds.playPawnHop();
          onSuccess?.();
          onClose();
        }
      } else {
        if (!username.trim()) {
          setErrorMsg('Please enter a username.');
          setSubmitting(false);
          return;
        }
        const { error } = await signUp(email, password, username.trim());
        if (error) {
          setErrorMsg(error.message);
        } else {
          sounds.playVictoryFanfare();
          onSuccess?.();
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuestPlay = async () => {
    sounds.playPawnHop();
    await signInAnonymously();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-[390px] bg-white rounded-3xl p-6 border-4 border-[#121212] shadow-2xl flex flex-col relative overflow-hidden">
        
        {/* Top Header Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-black text-white text-[11px] font-display uppercase tracking-wider rounded-full">
            <Sparkles size={12} className="text-yellow-400" />
            <span>SUPABASE CLOUD AUTH</span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Title */}
        <div className="flex flex-col mb-4">
          <h2 className="text-xl font-display text-gray-950 uppercase tracking-tight">
            {mode === 'signup' ? 'CLAIM YOUR STREETWEAR TAG' : 'WELCOME BACK, PLAYER'}
          </h2>
          <p className="text-xs text-gray-500 font-bold mt-0.5">
            {mode === 'signup'
              ? 'Save your Elo rating, campaign stars, and sticker loot forever.'
              : 'Log in to sync your profile across all your devices.'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="w-full grid grid-cols-2 p-1 bg-gray-100 rounded-2xl mb-4 border border-gray-200">
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl text-xs font-black uppercase transition ${
              mode === 'signup'
                ? 'bg-white text-black shadow-sm border border-black/10'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            CREATE ACCOUNT
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl text-xs font-black uppercase transition ${
              mode === 'login'
                ? 'bg-white text-black shadow-sm border border-black/10'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            SIGN IN
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="w-full bg-red-50 text-red-700 text-xs font-bold p-2.5 rounded-xl border border-red-200 mb-3 animate-in shake">
            {errorMsg}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
          {mode === 'signup' && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-gray-50 border border-gray-300 focus-within:border-black focus-within:ring-2 focus-within:ring-black/10 transition">
              <User size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Rider Handle (e.g. NeonBlade)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-gray-900 outline-none placeholder:text-gray-400"
                required
              />
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-gray-50 border border-gray-300 focus-within:border-black focus-within:ring-2 focus-within:ring-black/10 transition">
            <Mail size={16} className="text-gray-400" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-gray-900 outline-none placeholder:text-gray-400"
              required
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-gray-50 border border-gray-300 focus-within:border-black focus-within:ring-2 focus-within:ring-black/10 transition">
            <Lock size={16} className="text-gray-400" />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-gray-900 outline-none placeholder:text-gray-400"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 px-4 rounded-2xl bg-black text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg hover:bg-gray-800 transition active:scale-95 disabled:opacity-50"
          >
            <span>{submitting ? 'CONNECTING...' : mode === 'signup' ? 'REGISTER PROFILE' : 'SIGN IN'}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        {/* Guest fallback button */}
        {isGuest && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col items-center">
            <button
              type="button"
              onClick={handleGuestPlay}
              className="text-[11px] font-bold text-gray-500 hover:text-gray-800 transition"
            >
              Continue Playing as Guest Rider
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
