"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  FriendCardDesktop,
  FriendCardMobile,
  AddFriendCard,
  AddFriendMobile,
  type FriendListItem,
} from "./FriendCard";

type FriendshipRow = {
  requester_id: string;
  addressee_id: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  university: string | null;
};

type PresenceRow = {
  user_id: string;
  status: string | null;
  current_activity: string | null;
  last_seen: string | null;
};

function mapStatus(value: string | null): FriendListItem["status"] {
  const status = (value ?? "offline").toLowerCase();
  if (status === "online") return "online";
  if (status === "in_session") return "in_session";
  return "offline";
}

function formatLastSeen(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `Last seen ${date.toLocaleString()}`;
}

export default function FriendsList() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingIncomingCount, setPendingIncomingCount] = useState(0);

  const loadFriends = useCallback(async () => {
    if (!user) {
      setFriends([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const [friendshipResult, pendingResult] = await Promise.all([
      supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
      supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("addressee_id", user.id)
        .eq("status", "pending"),
    ]);

    const friendshipRows = friendshipResult.data;
    const friendshipError = friendshipResult.error;
    const pendingError = pendingResult.error;
    setPendingIncomingCount(pendingResult.count ?? 0);

    if (friendshipError || pendingError) {
      setLoading(false);
      setErrorMessage(friendshipError?.message ?? pendingError?.message ?? "Failed to load friends.");
      return;
    }

    const friendIds = Array.from(
      new Set(
        ((friendshipRows as FriendshipRow[] | null) ?? []).map((row) =>
          row.requester_id === user.id ? row.addressee_id : row.requester_id,
        ),
      ),
    );

    if (friendIds.length === 0) {
      setFriends([]);
      setLoading(false);
      return;
    }

    const [profilesResult, presenceResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url, university")
        .in("id", friendIds),
      supabase
        .from("user_presence")
        .select("user_id, status, current_activity, last_seen")
        .in("user_id", friendIds),
    ]);

    if (profilesResult.error || presenceResult.error) {
      setLoading(false);
      setErrorMessage(profilesResult.error?.message ?? presenceResult.error?.message ?? "Failed to load friends.");
      return;
    }

    const presenceMap = new Map(
      (((presenceResult.data as PresenceRow[] | null) ?? []).map((row) => [row.user_id, row])),
    );

    const mapped = (((profilesResult.data as ProfileRow[] | null) ?? []) as ProfileRow[]).map((profile) => {
      const presence = presenceMap.get(profile.id);
      return {
        id: profile.id,
        name: profile.full_name ?? "Unknown Friend",
        avatarUrl: profile.avatar_url,
        status: mapStatus(presence?.status ?? "offline"),
        activity: presence?.current_activity,
        lastSeen: formatLastSeen(presence?.last_seen ?? null),
      } satisfies FriendListItem;
    });

    setFriends(mapped);
    setLoading(false);
  }, [user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void loadFriends(), [loadFriends]);

  useEffect(() => {
    if (!user || friends.length === 0) return;
    const friendIdSet = new Set(friends.map((friend) => friend.id));
    const channel = supabase
      .channel(`presence-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_presence" },
        (payload) => {
          const next = payload.new as PresenceRow;
          if (!friendIdSet.has(next.user_id)) return;

          setFriends((prev) =>
            prev.map((friend) =>
              friend.id === next.user_id
                ? {
                    ...friend,
                    status: mapStatus(next.status),
                    activity: next.current_activity,
                    lastSeen: formatLastSeen(next.last_seen),
                  }
                : friend,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [friends, user]);

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-black text-base md:text-lg text-black uppercase tracking-wide">
          Your Friends
        </h2>
        <span className="bg-black text-white font-black text-xs px-2.5 py-1 tracking-wide">
          {loading ? "..." : friends.length} Total
        </span>
      </div>

      {errorMessage && (
        <div className="mb-4 border-[3px] border-black bg-[#FFB3C1] p-3 font-bold text-xs text-black">
          {errorMessage}
        </div>
      )}

      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-4">
        {friends.map((f) => (
          <FriendCardDesktop key={f.id} friend={f} />
        ))}
        <AddFriendCard pendingCount={pendingIncomingCount} />
      </div>

      <div className="sm:hidden flex flex-col gap-3">
        {friends.map((f) => (
          <FriendCardMobile key={f.id} friend={f} />
        ))}
        <AddFriendMobile pendingCount={pendingIncomingCount} />
      </div>
    </section>
  );
}
