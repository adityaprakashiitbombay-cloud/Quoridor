import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface KeepaliveStatus {
  lastPingTime: number | null;
  pingCount: number;
  status: 'idle' | 'active' | 'error';
  lastError?: string;
}

class SupabaseKeepaliveService {
  private status: KeepaliveStatus = {
    lastPingTime: null,
    pingCount: 0,
    status: 'idle',
  };
  private intervalId: any = null;
  private isInitialized = false;

  // 10 minutes interval to stay far ahead of any inactivity timeouts
  private readonly PING_INTERVAL_MS = 10 * 60 * 1000;

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Ping immediately on start
    this.ping();

    // Setup recurring interval
    this.intervalId = setInterval(() => {
      this.ping();
    }, this.PING_INTERVAL_MS);

    // Ping whenever user returns to tab (waking from background)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const last = this.status.lastPingTime || 0;
        // If more than 5 minutes since last ping, ping immediately
        if (Date.now() - last > 5 * 60 * 1000) {
          this.ping();
        }
      }
    });

    window.addEventListener('focus', () => {
      const last = this.status.lastPingTime || 0;
      if (Date.now() - last > 5 * 60 * 1000) {
        this.ping();
      }
    });
  }

  public async ping(): Promise<boolean> {
    try {
      if (isSupabaseConfigured) {
        // Lightweight auth session check to keep PostgREST & Auth connection alive
        await supabase.auth.getSession();
      }
      this.status.lastPingTime = Date.now();
      this.status.pingCount++;
      this.status.status = 'active';

      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('supabase_last_keepalive', Date.now().toString());
          window.localStorage.setItem('supabase_keepalive_pings', this.status.pingCount.toString());
        } catch {
          // Ignore localStorage quota errors
        }
      }
      return true;
    } catch (err: any) {
      this.status.status = 'error';
      this.status.lastError = String(err?.message || err);
      return false;
    }
  }

  public getStatus(): KeepaliveStatus {
    return { ...this.status };
  }

  public destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isInitialized = false;
  }
}

export const supabaseKeepalive = new SupabaseKeepaliveService();
