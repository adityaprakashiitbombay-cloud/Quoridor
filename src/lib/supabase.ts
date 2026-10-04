import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[key];
  }
  const proc = typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined;
  if (proc && proc.env) {
    return proc.env[key];
  }
  return undefined;
};

const DEFAULT_SUPABASE_URL = 'https://yflbgnrliqbkbkwbrrbp.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbGJnbnJsaXFia2Jrd2JycmJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMjgzMjEsImV4cCI6MjEwNjcwNDMyMX0.zf6MG-MF11-9LovzNlxEh_7UiCnAEl7Cx8CcH1YdxXg';

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  (getEnvVar('VITE_SUPABASE_URL') || DEFAULT_SUPABASE_URL) &&
  (getEnvVar('VITE_SUPABASE_ANON_KEY') || DEFAULT_SUPABASE_ANON_KEY)
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
