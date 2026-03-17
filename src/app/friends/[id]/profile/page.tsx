"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GraduationCap, Clock, MessageSquare, UserMinus } from "lucide-react";
import ProtectedRoute from "@/app/components/auth/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type ProfileRow = {
  id: string;
  full_name: string | null;
  bio: string | null;
  university: string | null;
  major: string | null;
  avatar_url: string | null;
};

type PresenceRow = {
  status: string | null;
  current_activity: string | null;
  last_seen: string | null;
};

type StreakRow = {
  current_streak: number | null;
  longest_streak: number | null;
};

type FriendshipRow = {
  id: string;
};

const STATUS_CONFIG = {
  online: { label: "ONLINE", color: "bg-green-500", bg: "bg-[#B3FFB3]" },
  in_session: { label: "IN SESSION", color: "bg-[#FFC107]", bg: "bg-[#FFC107]" },
  offline: { label: "OFFLINE", color: "bg-gray-400", bg: "bg-gray-200" },
} as const;

export default function FriendProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const friendId = params.id as string;

  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileRow | null>(null);
  const [presence, setPresence] = useState<PresenceRow | null>(null);
  const [streak, setStreak] = useState<StreakRow | null>(null);
  const [sessionsCount, setSessionsCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;

    const { data: friendshipRows, error: friendshipError } = await supabase
      .from("friendships")
      .select("id")
      .eq("status", "accepted")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`)
      .limit(1);

    if (friendshipError) {
      setErrorMessage(friendshipError.message);
      return;
    }

    const friendship = ((friendshipRows as FriendshipRow[] | null) ?? [])[0];
    if (!friendship) {
      router.push("/friends");
      return;
    }
    setFriendshipId(friendship.id);

    const [profileResult, presenceResult, streakResult, sessionsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, bio, university, major, avatar_url")
        .eq("id", friendId)
        .maybeSingle(),
      supabase
        .from("user_presence")
        .select("status, current_activity, last_seen")
        .eq("user_id", friendId)
        .maybeSingle(),
      supabase
        .from("streaks")
        .select("current_streak, longest_streak")
        .eq("user_id", friendId)
        .maybeSingle(),
      supabase
        .from("study_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", friendId),
    ]);

    if (profileResult.error || presenceResult.error || streakResult.error || sessionsResult.error) {
      setErrorMessage(
        profileResult.error?.message ??
          presenceResult.error?.message ??
          streakResult.error?.message ??
          sessionsResult.error?.message ??
          "Failed to load friend profile.",
      );
      return;
    }

    setProfileData((profileResult.data as ProfileRow | null) ?? null);
    setPresence((presenceResult.data as PresenceRow | null) ?? null);
    setStreak((streakResult.data as StreakRow | null) ?? null);
    setSessionsCount(sessionsResult.count ?? 0);
  }, [friendId, router, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const removeFriend = useCallback(async () => {
    if (!friendshipId) return;
    const confirmed = window.confirm("Remove this friend connection?");
    if (!confirmed) return;

    const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push("/friends");
  }, [friendshipId, router]);

  const statusKey = ((presence?.status ?? "offline").toLowerCase() as keyof typeof STATUS_CONFIG);
  const status = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.offline;
  const initials = useMemo(
    () =>
      (profileData?.full_name ?? "Friend")
        .split(" ")
        .map((part) => part[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [profileData?.full_name],
  );

  return (
    <ProtectedRoute>
      <div className="w-full max-w-3xl mx-auto py-6 px-4 md:px-0 space-y-6">
        <button
          onClick={() => router.push("/friends")}
          className="flex items-center gap-2 font-black text-sm text-black uppercase tracking-wide hover:text-black/60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={3} />
          Friends
        </button>

        {errorMessage && (
          <div className="border-[3px] border-black bg-[#FFB3C1] p-3 font-bold text-xs">{errorMessage}</div>
        )}

        <div className="bg-[#FFB3C1] border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 md:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="bg-[#FFD1B3] w-24 h-24 border-[3px] border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="font-black text-3xl text-black">{initials}</span>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="font-black text-2xl text-black uppercase tracking-wider">{profileData?.full_name ?? "Friend"}</h2>
              <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                <span className={`${status.bg} border-2 border-black px-3 py-1 font-black text-xs text-black uppercase tracking-wide flex items-center gap-1.5`}>
                  <span className={`w-2 h-2 rounded-full ${status.color}`} />
                  {status.label}
                </span>
              </div>
              <p className="font-bold text-sm text-black/70 mt-3">{profileData?.bio ?? "No bio provided."}</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Link
              href={`/friends/${friendId}/message`}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border-[3px] border-black font-black text-sm text-black uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <MessageSquare className="w-4 h-4" strokeWidth={2.5} />
              Message
            </Link>
            <button
              onClick={() => void removeFriend()}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#FFB3C1] border-[3px] border-black font-black text-sm text-black uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <UserMinus className="w-4 h-4" strokeWidth={2.5} />
              Remove Friend
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
            <h3 className="font-black text-lg text-black uppercase tracking-wider flex items-center gap-2">
              <GraduationCap className="w-5 h-5" strokeWidth={2.5} />
              Info
            </h3>
            <div className="space-y-3">
              <div>
                <p className="font-black text-xs text-black/60 uppercase tracking-wider">University</p>
                <p className="font-bold text-sm text-black mt-1">{profileData?.university ?? "-"}</p>
              </div>
              <div>
                <p className="font-black text-xs text-black/60 uppercase tracking-wider">Major</p>
                <p className="font-bold text-sm text-black mt-1">{profileData?.major ?? "-"}</p>
              </div>
              <div>
                <p className="font-black text-xs text-black/60 uppercase tracking-wider">Current Activity</p>
                <p className="font-bold text-sm text-black mt-1">{presence?.current_activity ?? "N/A"}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
            <h3 className="font-black text-lg text-black uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-5 h-5" strokeWidth={2.5} />
              Study Stats
            </h3>
            <div className="space-y-3">
              <p className="font-black text-sm">Current Streak: {streak?.current_streak ?? 0} days</p>
              <p className="font-black text-sm">Longest Streak: {streak?.longest_streak ?? 0} days</p>
              <p className="font-black text-sm">Total Sessions: {sessionsCount}</p>
              <p className="font-bold text-xs text-black/60">
                Last Seen: {presence?.last_seen ? new Date(presence.last_seen).toLocaleString() : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
