"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Inbox, Send } from "lucide-react";
import ProtectedRoute from "@/app/components/auth/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

type ProfileSearchRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  university: string | null;
  major: string | null;
  avatar_url: string | null;
};

type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
};

export default function AddFriendPage() {
  const { user, profile } = useAuth();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileSearchRow[]>([]);
  const [outgoingPending, setOutgoingPending] = useState<FriendshipRow[]>([]);
  const [incomingPending, setIncomingPending] = useState<FriendshipRow[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileSearchRow>>({});
  const [requestSentIds, setRequestSentIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadPending = useCallback(async () => {
    if (!user) return;

    const [outgoingResult, incomingResult] = await Promise.all([
      supabase
        .from("friendships")
        .select("id, requester_id, addressee_id, status")
        .eq("requester_id", user.id)
        .eq("status", "pending"),
      supabase
        .from("friendships")
        .select("id, requester_id, addressee_id, status")
        .eq("addressee_id", user.id)
        .eq("status", "pending"),
    ]);

    if (outgoingResult.error || incomingResult.error) {
      setErrorMessage(outgoingResult.error?.message ?? incomingResult.error?.message ?? "Failed to load requests.");
      return;
    }

    const outgoingRows = (outgoingResult.data as FriendshipRow[] | null) ?? [];
    const incomingRows = (incomingResult.data as FriendshipRow[] | null) ?? [];
    setOutgoingPending(outgoingRows);
    setIncomingPending(incomingRows);
    setRequestSentIds(new Set(outgoingRows.map((row) => row.addressee_id)));

    const allProfileIds = Array.from(
      new Set([
        ...outgoingRows.map((row) => row.addressee_id),
        ...incomingRows.map((row) => row.requester_id),
      ]),
    );

    if (allProfileIds.length === 0) {
      setProfilesMap({});
      return;
    }

    const { data: profileRows, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email, university, major, avatar_url")
      .in("id", allProfileIds);

    if (profilesError) {
      setErrorMessage(profilesError.message);
      return;
    }

    const map: Record<string, ProfileSearchRow> = {};
    ((profileRows as ProfileSearchRow[] | null) ?? []).forEach((entry) => {
      map[entry.id] = entry;
    });
    setProfilesMap(map);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPending();
  }, [loadPending]);

  useEffect(() => {
    if (!user || debouncedQuery.length < 2) return;

    const run = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, university, major, avatar_url")
        .ilike("full_name", `%${debouncedQuery}%`)
        .neq("id", user.id)
        .limit(10);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSearchResults((data as ProfileSearchRow[] | null) ?? []);
    };
    void run();
  }, [debouncedQuery, user]);

  const sendRequest = useCallback(async (target: ProfileSearchRow) => {
    if (!user) return;

    const { data: existingRows, error: existingError } = await supabase
      .from("friendships")
      .select("id")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${user.id})`)
      .limit(1);

    if (existingError) {
      setErrorMessage(existingError.message);
      return;
    }

    if ((existingRows ?? []).length > 0) {
      setRequestSentIds((prev) => new Set(prev).add(target.id));
      return;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("friendships")
      .insert({
        requester_id: user.id,
        addressee_id: target.id,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      setErrorMessage(insertError.message);
      return;
    }

    const requesterName = profile?.full_name ?? user.email ?? "Someone";
    await supabase.from("notifications").insert({
      user_id: target.id,
      type: "friend_request",
      title: `${requesterName} sent you a friend request`,
      body: "Open Add Friend page to accept or reject.",
      reference_id: (inserted as { id: string }).id,
      reference_type: "friendship",
    });

    setRequestSentIds((prev) => new Set(prev).add(target.id));
    await loadPending();
  }, [loadPending, profile?.full_name, user]);

  const updateIncoming = useCallback(async (row: FriendshipRow, nextStatus: "accepted" | "rejected") => {
    if (!user) return;
    const { error } = await supabase
      .from("friendships")
      .update({ status: nextStatus })
      .eq("id", row.id)
      .eq("addressee_id", user.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (nextStatus === "accepted") {
      const accepterName = profile?.full_name ?? user.email ?? "A friend";
      await supabase.from("notifications").insert({
        user_id: row.requester_id,
        type: "friend_request",
        title: `Your friend request was accepted by ${accepterName}`,
        body: "You are now connected.",
        reference_id: row.id,
        reference_type: "friendship",
      });
    }

    await loadPending();
  }, [loadPending, profile?.full_name, user]);

  const outgoingProfiles = useMemo(
    () => outgoingPending.map((row) => profilesMap[row.addressee_id]).filter(Boolean),
    [outgoingPending, profilesMap],
  );
  const incomingProfiles = useMemo(
    () => incomingPending.map((row) => ({ row, profile: profilesMap[row.requester_id] })).filter((entry) => Boolean(entry.profile)),
    [incomingPending, profilesMap],
  );

  const quickStats = [
    { label: "Search Results", value: searchResults.length, bg: "bg-[#B3D4FF]" },
    { label: "Requests Sent", value: outgoingProfiles.length, bg: "bg-[#FFC107]" },
    { label: "Incoming", value: incomingProfiles.length, bg: "bg-[#B3FFB3]" },
  ];

  return (
    <ProtectedRoute>
      <section className="space-y-4 sm:space-y-6 pb-20 md:pb-10">
        <div className="bg-[#FFC107] border-[3px] border-black p-5 sm:p-6 lg:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Link href="/friends" className="inline-flex items-center gap-2 font-black text-[10px] sm:text-xs uppercase hover:underline">
                <ArrowLeft className="w-4 h-4" /> Back to Friends
              </Link>
              <h1 className="mt-2 font-black text-xl sm:text-2xl lg:text-3xl text-black uppercase tracking-wide leading-tight">
                Add New Friends
              </h1>
              <p className="font-bold text-xs sm:text-sm text-black/70 mt-1 sm:mt-2">
                Search profiles, send requests, and manage incoming invitations.
              </p>
            </div>
            <div className="flex gap-2 shrink-0 self-start sm:self-auto">
              {quickStats.map((item) => (
                <div key={item.label} className={`${item.bg} border-[3px] border-black px-3 py-2 min-w-[92px] text-center`}>
                  <p className="font-black text-lg leading-none">{item.value}</p>
                  <p className="font-black text-[10px] uppercase tracking-wide text-black/70">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="border-[3px] border-black bg-[#FFB3C1] p-3 font-bold text-xs">{errorMessage}</div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
          <div className="xl:col-span-7 space-y-4 sm:space-y-6">
            <div className="border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b-[3px] border-black bg-[#B3D4FF]">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" strokeWidth={2.5} />
                <h2 className="font-black text-xs sm:text-sm uppercase tracking-wide">Search People</h2>
              </div>
              <div className="p-4 sm:p-5">
                <input
                  value={query}
                  onChange={(event) => {
                    const next = event.target.value;
                    setQuery(next);
                    if (next.trim().length < 2) setSearchResults([]);
                  }}
                  placeholder="Type a name..."
                  className="w-full border-[3px] border-black px-3 py-2.5 font-bold text-sm bg-[#FFFDF7]"
                />
                <div className="mt-3 space-y-2">
                  {searchResults.map((person) => (
                    <div key={person.id} className="border-2 border-black p-3 flex items-center justify-between gap-3 bg-white">
                      <div className="min-w-0">
                        <p className="font-black text-xs uppercase truncate">{person.full_name ?? "Unknown"}</p>
                        <p className="font-bold text-xs text-black/60 truncate">{person.university ?? "Unknown University"}</p>
                      </div>
                      <button
                        disabled={requestSentIds.has(person.id)}
                        onClick={() => void sendRequest(person)}
                        className="shrink-0 px-3 py-2 border-2 border-black bg-[#FFC107] font-black text-[10px] uppercase disabled:opacity-50"
                      >
                        {requestSentIds.has(person.id) ? "Request Sent ✓" : "Add Friend"}
                      </button>
                    </div>
                  ))}
                  {debouncedQuery.length >= 2 && searchResults.length === 0 && (
                    <p className="font-bold text-xs text-black/60">No people found.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b-[3px] border-black bg-[#FFC107]">
                <Send className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" strokeWidth={2.5} />
                <h3 className="font-black text-xs sm:text-sm uppercase tracking-wide">Pending Requests Sent</h3>
              </div>
              <div className="p-4 sm:p-5 space-y-2">
                {outgoingProfiles.map((person) => (
                  <div key={person.id} className="border-2 border-black p-3 bg-white">
                    <p className="font-black text-xs uppercase">{person.full_name ?? "Unknown"}</p>
                    <p className="font-bold text-xs text-black/60">{person.university ?? "Unknown University"}</p>
                  </div>
                ))}
                {outgoingProfiles.length === 0 && <p className="font-bold text-xs text-black/60">No outgoing pending requests.</p>}
              </div>
            </div>
          </div>

          <div className="xl:col-span-5">
            <div className="border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-full">
              <div className="flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b-[3px] border-black bg-[#B3FFB3]">
                <Inbox className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" strokeWidth={2.5} />
                <h3 className="font-black text-xs sm:text-sm uppercase tracking-wide">Incoming Requests</h3>
              </div>
              <div className="p-4 sm:p-5 space-y-2">
                {incomingProfiles.map(({ row, profile: requester }) => (
                  <div key={row.id} className="border-2 border-black p-3 flex items-center justify-between gap-3 bg-white">
                    <div className="min-w-0">
                      <p className="font-black text-xs uppercase truncate">{requester?.full_name ?? "Unknown"}</p>
                      <p className="font-bold text-xs text-black/60 truncate">{requester?.university ?? "Unknown University"}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => void updateIncoming(row, "accepted")}
                        className="px-3 py-2 border-2 border-black bg-[#B3FFB3] font-black text-[10px] uppercase"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => void updateIncoming(row, "rejected")}
                        className="px-3 py-2 border-2 border-black bg-[#FFB3C1] font-black text-[10px] uppercase"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {incomingProfiles.length === 0 && <p className="font-bold text-xs text-black/60">No incoming requests.</p>}
                <div className="pt-2">
                  <p className="font-black text-[10px] uppercase tracking-wide text-black/50">
                    Tip: Accepting will instantly connect you in `/friends`.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </ProtectedRoute>
  );
}
