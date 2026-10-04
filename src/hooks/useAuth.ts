import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile } from '../types/game';

const GUEST_STORAGE_KEY = 'quoridor_guest_session';

export function useAuth() {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch or construct profile
  const fetchProfile = useCallback(async (userId: string, usernameFallback?: string) => {
    if (!isSupabaseConfigured) {
      const fallback: UserProfile = {
        id: userId,
        username: usernameFallback || 'Player 1',
        level: 1,
        xp: 0,
        eloRating: 1200,
        campaignLevel: 1,
        matchesPlayed: 0,
        matchesWon: 0,
        wallsPlaced: 0,
        detoursCreated: 0,
        totalTurns: 0,
        createdAt: new Date().toISOString(),
      };
      setProfile(fallback);
      return fallback;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data && !error) {
        const loadedProfile: UserProfile = {
          id: data.id,
          username: data.username,
          level: data.level || 1,
          xp: data.xp || 0,
          eloRating: data.elo_rating || 1200,
          campaignLevel: data.campaign_level || 1,
          matchesPlayed: data.matches_played || 0,
          matchesWon: data.matches_won || 0,
          wallsPlaced: data.walls_placed || 0,
          detoursCreated: data.detours_created || 0,
          totalTurns: data.total_turns || 0,
          createdAt: data.created_at || new Date().toISOString(),
        };
        setProfile(loadedProfile);
        return loadedProfile;
      } else {
        // Create profile row if absent
        const uname = usernameFallback || `Player_${userId.substring(0, 6)}`;
        await supabase.from('profiles').insert({
          id: userId,
          username: uname,
        });
        const newProf: UserProfile = {
          id: userId,
          username: uname,
          level: 1,
          xp: 0,
          eloRating: 1200,
          campaignLevel: 1,
          matchesPlayed: 0,
          matchesWon: 0,
          wallsPlaced: 0,
          detoursCreated: 0,
          totalTurns: 0,
          createdAt: new Date().toISOString(),
        };
        setProfile(newProf);
        return newProf;
      }
    } catch (err) {
      console.warn('Error fetching Supabase profile:', err);
      return null;
    }
  }, []);

  // Initialize session
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      if (!isSupabaseConfigured) {
        // Local guest session
        let localGuest = null;
        try {
          const stored = localStorage.getItem(GUEST_STORAGE_KEY);
          if (stored) localGuest = JSON.parse(stored);
        } catch {
          // ignore
        }

        if (!localGuest) {
          localGuest = {
            id: 'usr-local-player-1',
            username: 'StreetMaster',
            isGuest: true,
          };
          try {
            localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(localGuest));
          } catch {
            // ignore
          }
        }

        if (mounted) {
          setUser(localGuest);
          setIsGuest(true);
          await fetchProfile(localGuest.id, localGuest.username);
          setLoading(false);
        }
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          if (mounted) {
            setUser(session.user);
            setIsGuest(Boolean(session.user.is_anonymous));
            await fetchProfile(session.user.id, session.user.user_metadata?.username);
            setLoading(false);
          }
        } else {
          // Auto-sign-in as anonymous guest
          try {
            const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
            if (anonData?.user && !anonError && mounted) {
              setUser(anonData.user);
              setIsGuest(true);
              await fetchProfile(anonData.user.id);
            }
          } catch (e) {
            console.warn('Anonymous sign-in unavailable, fallback local:', e);
          }
          if (mounted) setLoading(false);
        }
      } catch (err) {
        console.warn('Auth session check error:', err);
        if (mounted) setLoading(false);
      }
    }

    initSession();

    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (mounted) {
          if (session?.user) {
            setUser(session.user);
            setIsGuest(Boolean(session.user.is_anonymous));
            await fetchProfile(session.user.id, session.user.user_metadata?.username);
          } else {
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, [fetchProfile]);

  // Actions
  const signInAnonymously = async (username?: string) => {
    setLoading(true);
    if (!isSupabaseConfigured) {
      const guestId = `guest_${Math.random().toString(36).substring(2, 9)}`;
      const guestUser = { id: guestId, username: username || `Rider_${guestId.substring(6)}`, isGuest: true };
      setUser(guestUser);
      setIsGuest(true);
      await fetchProfile(guestId, guestUser.username);
      setLoading(false);
      return { data: { user: guestUser }, error: null };
    }

    try {
      const result = await supabase.auth.signInAnonymously({
        options: {
          data: { username: username || `Rider_${Math.floor(Math.random() * 9000 + 1000)}` },
        },
      });
      if (result.data?.user) {
        setUser(result.data.user);
        setIsGuest(true);
        await fetchProfile(result.data.user.id, username);
      }
      setLoading(false);
      return result;
    } catch (err: any) {
      setLoading(false);
      return { data: null, error: err };
    }
  };

  const signInWithPassword = async (email: string, pass: string) => {
    setLoading(true);
    if (!isSupabaseConfigured) {
      setLoading(false);
      return { data: null, error: new Error('Supabase not configured') };
    }
    const res = await supabase.auth.signInWithPassword({ email, password: pass });
    setLoading(false);
    return res;
  };

  const signUp = async (email: string, pass: string, username: string) => {
    setLoading(true);
    if (!isSupabaseConfigured) {
      setLoading(false);
      return { data: null, error: new Error('Supabase not configured') };
    }
    const res = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { username },
      },
    });
    setLoading(false);
    return res;
  };

  const signOut = async () => {
    setLoading(true);
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setIsGuest(true);
    setLoading(false);
  };

  return {
    user,
    profile,
    isGuest,
    loading,
    signInAnonymously,
    signInWithPassword,
    signUp,
    signOut,
    refreshProfile: () => user ? fetchProfile(user.id) : Promise.resolve(null),
  };
}
