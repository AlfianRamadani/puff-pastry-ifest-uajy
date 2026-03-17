"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  university: string | null;
  major: string | null;
  daily_study_goal_hours: number | null;
  preferred_study_time: string | null;
  current_gpa: number | null;
  target_gpa: number | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  unreadNotifications: number;
  notificationToast: string | null;
  refreshUnreadNotifications: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const profileData = await fetchProfile(user.id);
    setProfile(profileData);
  }, [user]);

  const refreshUnreadNotifications = useCallback(async () => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (!error) {
      setUnreadNotifications(count ?? 0);
    }
  }, [user]);

  const reconcileAuth = useCallback(async () => {
    const [{ data: sessionData }, { data: userData }] = await Promise.all([
      supabase.auth.getSession(),
      supabase.auth.getUser(),
    ]);
    const reconciledSession = sessionData.session ?? null;
    const reconciledUser = userData.user ?? reconciledSession?.user ?? null;
    setSession(reconciledSession);
    setUser(reconciledUser);
    if (reconciledUser) {
      const profileData = await fetchProfile(reconciledUser.id);
      setProfile(profileData);
    }
    return { reconciledSession, reconciledUser };
  }, []);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const [{ data: sessionData, error: sessionError }, { data: userData }] = await Promise.all([supabase.auth.getSession(), supabase.auth.getUser()]);
        if (!mounted) {
          return;
        }

        const currentSession = sessionError ? null : sessionData.session;
        const currentUser = userData.user ?? currentSession?.user ?? null;

        setSession(currentSession);
        setUser(currentUser);
        setLoading(false);

        if (currentUser) {
          const profileData = await fetchProfile(currentUser.id);
          if (mounted) {
            setProfile(profileData);
          }
        } else {
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
        if (!mounted) return;

        let nextUser = nextSession?.user ?? null;
        if (!nextUser) {
          const { data: userData } = await supabase.auth.getUser();
          nextUser = userData.user ?? null;
        }
        setSession(nextSession);
        setUser(nextUser);
        setLoading(false);

        if (nextUser) {
          const profileData = await fetchProfile(nextUser.id);
          if (mounted) {
            setProfile(profileData);
          }
        }

        if (event === "SIGNED_OUT") {
          setProfile(null);
        }
      });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading || user) return;
    let cancelled = false;

    const run = async () => {
      const attempts = [0, 250, 700, 1500];
      for (const delay of attempts) {
        if (cancelled) return;
        if (delay > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, delay));
        }
        const { reconciledUser } = await reconcileAuth();
        if (cancelled) return;
        if (reconciledUser) return;
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [loading, reconcileAuth, user]);

  useEffect(() => {
    if (!user) return;

    const updatePresence = async (status: "online" | "offline" | "in_session") => {
      await supabase.from("user_presence").upsert({
        user_id: user.id,
        status,
        updated_at: new Date().toISOString(),
        last_seen: status === "offline" ? new Date().toISOString() : null,
      });
    };

    void updatePresence("online");

    const handleBeforeUnload = () => {
      void updatePresence("offline");
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        void updatePresence("offline");
      } else {
        void updatePresence("online");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    void refreshUnreadNotifications();

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const inserted = payload.new as { title?: string };
          setUnreadNotifications((prev) => prev + 1);
          setNotificationToast(inserted.title ?? "New notification");
          window.setTimeout(() => setNotificationToast(null), 2500);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshUnreadNotifications, user]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }

    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      loading,
      unreadNotifications,
      notificationToast,
      refreshUnreadNotifications,
      signOut,
      refreshProfile,
    }),
    [loading, notificationToast, profile, refreshProfile, refreshUnreadNotifications, session, signOut, unreadNotifications, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
