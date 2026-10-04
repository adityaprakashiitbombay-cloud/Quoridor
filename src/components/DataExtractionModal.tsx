import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Download,
  Copy,
  Check,
  RefreshCw,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  UploadCloud,
  Layers,
  Users,
  Swords,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import {
  fetchAllDataBundle,
  fetchProfilesData,
  fetchGameRoomsData,
  fetchMatchHistoryData,
  fetchMatchMessagesData,
  downloadJson,
  downloadCsv,
  DataExportBundle
} from '../services/dataExtraction';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getUserProfile, getMatchHistory } from '../lib/progressionRpc';
import { sounds } from '../utils/audio';

interface DataExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'overview' | 'matches' | 'rooms' | 'profiles' | 'messages' | 'raw';

export const DataExtractionModal: React.FC<DataExtractionModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [bundle, setBundle] = useState<DataExportBundle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const loadTelemetry = async () => {
    setLoading(true);
    try {
      const data = await fetchAllDataBundle();
      setBundle(data);
    } catch (e) {
      console.error('Failed to load export telemetry:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTelemetry();
      setSyncStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyJson = (dataToCopy: any) => {
    sounds.playPawnHop();
    navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMasterJson = () => {
    sounds.playVictoryFanfare();
    if (!bundle) return;
    const filename = `adinomide_master_backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    downloadJson(filename, bundle);
  };

  const handleDownloadMatchHistoryCsv = async () => {
    sounds.playTurnChirp();
    const list = bundle?.matchHistory || (await fetchMatchHistoryData());
    const filename = `adinomide_match_history_${new Date().toISOString().slice(0, 10)}`;
    downloadCsv(filename, list);
  };

  const handleDownloadProfilesCsv = async () => {
    sounds.playTurnChirp();
    const list = bundle?.profiles || (await fetchProfilesData());
    const filename = `adinomide_profiles_${new Date().toISOString().slice(0, 10)}`;
    downloadCsv(filename, list);
  };

  const handleDownloadGameRoomsJson = async () => {
    sounds.playTurnChirp();
    const rooms = bundle?.gameRooms || (await fetchGameRoomsData());
    downloadJson(`adinomide_game_rooms_${Date.now()}`, rooms);
  };

  const handleDownloadMessagesCsv = async () => {
    sounds.playTurnChirp();
    const msgs = bundle?.matchMessages || (await fetchMatchMessagesData());
    downloadCsv(`adinomide_chat_messages_${Date.now()}`, msgs);
  };

  // Push local storage profile & match history directly to Supabase tables
  const handleForceSyncToSupabase = async () => {
    if (!isSupabaseConfigured) {
      alert('Supabase is not configured in this environment (missing URL/Anon Key).');
      return;
    }
    sounds.playTurnChirp();
    setSyncing(true);
    setSyncStatus('Synchronizing local profile & matches to Supabase tables...');

    try {
      const localProf = getUserProfile();
      const localMatches = getMatchHistory(50);
      const { data: sessionData } = await supabase.auth.getSession();
      const authUid = sessionData?.session?.user?.id;

      // 1. Sync Profile
      if (authUid) {
        await supabase.from('profiles').upsert({
          id: authUid,
          username: localProf.username,
          level: localProf.level,
          xp: localProf.xp,
          elo_rating: localProf.eloRating,
          matches_played: localProf.matchesPlayed,
          matches_won: localProf.matchesWon,
          walls_placed: localProf.wallsPlaced,
          detours_created: localProf.detoursCreated,
          total_turns: localProf.totalTurns,
        });
      }

      // 2. Sync Match History
      let insertedCount = 0;
      for (const m of localMatches) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m.id);
        const matchUuid = isUuid ? m.id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined);
        const { error } = await supabase.from('match_history').upsert({
          ...(matchUuid ? { id: matchUuid } : {}),
          game_mode: m.gameMode || '1v1_ranked',
          player1_id: authUid || null,
          player2_id: null,
          winner_id: m.isWin && authUid ? authUid : null,
          turns_count: m.turnsCount || 0,
          move_log: m.moveLog || [],
          created_at: m.createdAt || new Date().toISOString(),
        });
        if (!error) insertedCount++;
      }

      setSyncStatus(`Sync Complete! Profile and ${insertedCount} matches verified in Supabase.`);
      sounds.playVictoryFanfare();
      await loadTelemetry();
    } catch (err: any) {
      setSyncStatus(`Sync Notice: ${err?.message || 'Check network connection'}`);
    } finally {
      setSyncing(false);
    }
  };

  const getDisplayDataForTab = () => {
    if (!bundle) return {};
    switch (activeTab) {
      case 'matches':
        return bundle.matchHistory;
      case 'rooms':
        return bundle.gameRooms;
      case 'profiles':
        return bundle.profiles;
      case 'messages':
        return bundle.matchMessages;
      case 'raw':
      case 'overview':
      default:
        return bundle;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-700/80 text-white rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.7)] flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
              <Database size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide text-white">
                  Data Synchronization & Extraction Console
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                  isSupabaseConfigured
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {isSupabaseConfigured ? 'Supabase Live' : 'Local Storage Mode'}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Authoritative tables: profiles, game_rooms, match_history, and messages
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playPawnHop();
              onClose();
            }}
            className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-neutral-950/30 border-b border-neutral-800">
          <div className="p-3 bg-neutral-800/60 rounded-2xl border border-neutral-700/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">PROFILES</span>
              <span className="text-xl font-black text-cyan-400">{bundle?.counts.profiles ?? 0}</span>
            </div>
            <Users size={18} className="text-cyan-400/60" />
          </div>

          <div className="p-3 bg-neutral-800/60 rounded-2xl border border-neutral-700/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">LIVE ROOMS</span>
              <span className="text-xl font-black text-emerald-400">{bundle?.counts.gameRooms ?? 0}</span>
            </div>
            <Layers size={18} className="text-emerald-400/60" />
          </div>

          <div className="p-3 bg-neutral-800/60 rounded-2xl border border-neutral-700/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">MATCH HISTORY</span>
              <span className="text-xl font-black text-amber-400">{bundle?.counts.matchHistory ?? 0}</span>
            </div>
            <Swords size={18} className="text-amber-400/60" />
          </div>

          <div className="p-3 bg-neutral-800/60 rounded-2xl border border-neutral-700/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">CHAT LOGS</span>
              <span className="text-xl font-black text-purple-400">{bundle?.counts.matchMessages ?? 0}</span>
            </div>
            <MessageSquare size={18} className="text-purple-400/60" />
          </div>
        </div>

        {/* Quick Action Toolbar */}
        <div className="p-4 bg-neutral-900 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadMasterJson}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition"
            >
              <Download size={14} />
              <span>Full Backup (JSON)</span>
            </button>

            <button
              onClick={handleDownloadMatchHistoryCsv}
              className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition"
            >
              <FileSpreadsheet size={14} className="text-emerald-400" />
              <span>Matches (CSV)</span>
            </button>

            <button
              onClick={handleDownloadProfilesCsv}
              className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition"
            >
              <FileSpreadsheet size={14} className="text-cyan-400" />
              <span>Profiles (CSV)</span>
            </button>

            <button
              onClick={handleDownloadGameRoomsJson}
              className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition"
            >
              <FileCode size={14} className="text-amber-400" />
              <span>Rooms (JSON)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleForceSyncToSupabase}
              disabled={syncing}
              className={`px-3 py-2 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition active:scale-95 ${
                syncing
                  ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              <UploadCloud size={14} className={syncing ? 'animate-bounce' : ''} />
              <span>{syncing ? 'Syncing...' : 'Force Push to DB'}</span>
            </button>

            <button
              onClick={() => {
                sounds.playTurnChirp();
                loadTelemetry();
              }}
              disabled={loading}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition"
              title="Refresh Telemetry"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Sync Status Banner */}
        {syncStatus && (
          <div className="px-4 py-2 bg-emerald-950/50 border-b border-emerald-800/40 text-emerald-300 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} />
              <span>{syncStatus}</span>
            </div>
            <button
              onClick={() => setSyncStatus(null)}
              className="text-neutral-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-4 pt-2 border-b border-neutral-800 flex items-center gap-1 bg-neutral-950/40 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'matches', label: 'Match History' },
            { id: 'rooms', label: 'Active Rooms' },
            { id: 'profiles', label: 'User Profiles' },
            { id: 'messages', label: 'Chat Logs' },
            { id: 'raw', label: 'Master Raw JSON' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                sounds.playPawnHop();
                setActiveTab(tab.id as TabType);
              }}
              className={`px-3 py-2 text-xs font-bold rounded-t-xl transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-neutral-800 text-cyan-300 border-t-2 border-cyan-400'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content & JSON Inspector */}
        <div className="p-4 overflow-y-auto flex-1 bg-neutral-950/90 font-mono text-xs relative">
          <button
            onClick={() => handleCopyJson(getDisplayDataForTab())}
            className="absolute top-6 right-6 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-[11px] font-sans font-bold flex items-center gap-1 shadow-sm transition active:scale-95 z-10"
          >
            {copied ? (
              <>
                <Check size={12} className="text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy JSON</span>
              </>
            )}
          </button>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-400 gap-2">
              <RefreshCw size={24} className="animate-spin text-cyan-400" />
              <span>Fetching live database telemetry...</span>
            </div>
          ) : (
            <pre className="text-neutral-300 whitespace-pre-wrap break-words leading-relaxed select-text">
              {JSON.stringify(getDisplayDataForTab(), null, 2)}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between text-[11px] text-neutral-400">
          <span>Schema: `public.profiles`, `public.game_rooms`, `public.match_history`</span>
          <span className="text-neutral-500 font-bold">1-Click JSON & CSV Extraction</span>
        </div>

      </div>
    </div>
  );
};
