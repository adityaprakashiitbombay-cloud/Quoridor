import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getMatchHistory, getUserProfile } from '../lib/progressionRpc';

export interface DataExportBundle {
  exportedAt: string;
  source: string;
  counts: {
    profiles: number;
    gameRooms: number;
    matchHistory: number;
    matchMessages: number;
  };
  profiles: any[];
  gameRooms: any[];
  matchHistory: any[];
  matchMessages: any[];
  localData: {
    profile: any;
    matchHistory: any[];
    dotsAutosave: any;
  };
}

/**
 * Fetch all profiles from Supabase (or fallback to local profile)
 */
export async function fetchProfilesData(): Promise<any[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (e) {
      console.warn('Could not fetch remote profiles:', e);
    }
  }
  // Local fallback
  return [getUserProfile()];
}

/**
 * Fetch all live game rooms and authoritative board states
 */
export async function fetchGameRoomsData(): Promise<any[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('game_rooms')
        .select('*')
        .order('updated_at', { ascending: false });
      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn('Could not fetch game_rooms:', e);
    }
  }
  return [];
}

/**
 * Fetch all match history records (remote + local)
 */
export async function fetchMatchHistoryData(): Promise<any[]> {
  const localHistory = getMatchHistory(50);
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('match_history')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (e) {
      console.warn('Could not fetch remote match_history:', e);
    }
  }
  return localHistory;
}

/**
 * Fetch match messages / quick chat logs
 */
export async function fetchMatchMessagesData(): Promise<any[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('match_messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn('Could not fetch match_messages:', e);
    }
  }
  return [];
}

/**
 * Compile a full master bundle of all tables and telemetry
 */
export async function fetchAllDataBundle(): Promise<DataExportBundle> {
  const [profiles, gameRooms, matchHistory, matchMessages] = await Promise.all([
    fetchProfilesData(),
    fetchGameRoomsData(),
    fetchMatchHistoryData(),
    fetchMatchMessagesData(),
  ]);

  let dotsAutosave: any = null;
  try {
    const raw = localStorage.getItem('dots_boxes_autosave');
    if (raw) dotsAutosave = JSON.parse(raw);
  } catch {}

  return {
    exportedAt: new Date().toISOString(),
    source: isSupabaseConfigured ? 'Supabase Live Cloud + Local Cache' : 'Local Storage Engine',
    counts: {
      profiles: profiles.length,
      gameRooms: gameRooms.length,
      matchHistory: matchHistory.length,
      matchMessages: matchMessages.length,
    },
    profiles,
    gameRooms,
    matchHistory,
    matchMessages,
    localData: {
      profile: getUserProfile(),
      matchHistory: getMatchHistory(50),
      dotsAutosave,
    },
  };
}

/**
 * Download arbitrary data as a JSON file in the browser
 */
export function downloadJson(filename: string, data: any) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert an array of objects to CSV format and download
 */
export function downloadCsv(filename: string, dataArray: any[]) {
  if (!dataArray || dataArray.length === 0) {
    alert('No records available to export.');
    return;
  }

  // Extract unique headers
  const headers = Array.from(
    new Set(
      dataArray.flatMap((item) =>
        typeof item === 'object' && item !== null ? Object.keys(item) : []
      )
    )
  );

  const csvRows: string[] = [];
  // Header row
  csvRows.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

  // Data rows
  for (const row of dataArray) {
    const values = headers.map((header) => {
      const val = row[header];
      if (val === undefined || val === null) return '""';
      if (typeof val === 'object') {
        return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      }
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
