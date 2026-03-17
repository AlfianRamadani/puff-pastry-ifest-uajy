"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Plus, X, Search, Zap, Clock, Square, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type FriendOption = {
  id: string;
  name: string;
};

type FriendshipRow = {
  requester_id: string;
  addressee_id: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

const AVATAR_COLORS = [
  "bg-[#FFD1B3]",
  "bg-[#8FFFE1]",
  "bg-[#FFC107]",
  "bg-[#B8D4FF]",
  "bg-[#FFB3D9]",
  "bg-[#C4B5FD]",
];

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const StartStudySession: React.FC = () => {
  const { user, profile } = useAuth();
  const [allFriends, setAllFriends] = useState<FriendOption[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<FriendOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startingSession, setStartingSession] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [sessionActive, setSessionActive] = useState(false);
  const [sessionSubject, setSessionSubject] = useState("");
  const [sessionParticipants, setSessionParticipants] = useState<FriendOption[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const loadFriends = async () => {
      const { data: friendshipRows, error: friendshipError } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (friendshipError) {
        setErrorMessage(friendshipError.message);
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
        setAllFriends([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", friendIds);

      if (profilesError) {
        setErrorMessage(profilesError.message);
        return;
      }

      setAllFriends(
        (((profiles as ProfileRow[] | null) ?? []) as ProfileRow[]).map((entry) => ({
          id: entry.id,
          name: entry.full_name ?? "Unknown Friend",
        })),
      );
    };
    void loadFriends();
  }, [user]);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    return allFriends.filter(
      (f) =>
        f.name.toLowerCase().includes(query.toLowerCase()) &&
        !selected.some((s) => s.id === f.id),
    );
  }, [query, allFriends, selected]);

  const addFriend = useCallback((friend: FriendOption) => {
    setSelected((prev) => [...prev, friend]);
    setQuery("");
    setShowDropdown(false);
    inputRef.current?.focus();
  }, []);

  const removeFriend = useCallback((id: string) => {
    setSelected((prev) => prev.filter((f) => f.id !== id));
  }, []);

  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showDropdown]);

  useEffect(() => {
    if (!sessionActive) return;
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [sessionActive]);

  useEffect(() => {
    if (!sessionActive || !activeSessionId || !user) return;
    const timeout = window.setTimeout(async () => {
      await supabase.from("study_sessions").update({ title: sessionSubject }).eq("id", activeSessionId);
      await supabase
        .from("user_presence")
        .upsert({
          user_id: user.id,
          status: "in_session",
          current_activity: sessionSubject || null,
          updated_at: new Date().toISOString(),
        });
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [activeSessionId, sessionActive, sessionSubject, user]);

  const startSession = useCallback(async () => {
    if (!user || selected.length === 0 || startingSession) return;
    setStartingSession(true);
    setErrorMessage(null);

    const startedAt = new Date();
    const { data: sessionRow, error: sessionError } = await supabase
      .from("study_sessions")
      .insert({
        host_id: user.id,
        status: "active",
        started_at: startedAt.toISOString(),
        title: sessionSubject || null,
      })
      .select("id")
      .single();

    if (sessionError) {
      setStartingSession(false);
      setErrorMessage(sessionError.message);
      return;
    }

    const sessionId = (sessionRow as { id: string }).id;

    const participantRows = [{ session_id: sessionId, user_id: user.id }].concat(
      selected.map((friend) => ({ session_id: sessionId, user_id: friend.id })),
    );
    const { error: participantsError } = await supabase
      .from("study_session_participants")
      .insert(participantRows);

    if (participantsError) {
      setStartingSession(false);
      setErrorMessage(participantsError.message);
      return;
    }

    const hostName = profile?.full_name ?? user.email ?? "A friend";
    const notificationRows = selected.map((friend) => ({
      user_id: friend.id,
      type: "session_invite",
      title: `${hostName} started a session`,
      body: "You were invited to study together",
      reference_id: sessionId,
      reference_type: "session",
    }));
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert(notificationRows);

    if (notificationError) {
      setStartingSession(false);
      setErrorMessage(notificationError.message);
      return;
    }

    const { error: presenceError } = await supabase
      .from("user_presence")
      .upsert({
        user_id: user.id,
        status: "in_session",
        current_activity: sessionSubject || null,
        updated_at: startedAt.toISOString(),
      });

    setStartingSession(false);
    if (presenceError) {
      setErrorMessage(presenceError.message);
      return;
    }

    setActiveSessionId(sessionId);
    setSessionParticipants([...selected]);
    setSessionActive(true);
    setElapsed(0);
  }, [profile?.full_name, selected, sessionSubject, startingSession, user]);

  const endSession = useCallback(async () => {
    if (!user || !activeSessionId || endingSession) return;
    setEndingSession(true);

    const endedAt = new Date();
    const durationMinutes = Math.max(1, Math.round(elapsed / 60));
    const participantIds = [user.id, ...sessionParticipants.map((entry) => entry.id)];

    const { error: sessionError } = await supabase
      .from("study_sessions")
      .update({ status: "ended", ended_at: endedAt.toISOString() })
      .eq("id", activeSessionId);

    if (sessionError) {
      setErrorMessage(sessionError.message);
      setEndingSession(false);
      return;
    }

    const { error: logsError } = await supabase.from("study_logs").insert(
      participantIds.map((participantId) => ({
        user_id: participantId,
        session_id: activeSessionId,
        duration_minutes: durationMinutes,
        logged_date: endedAt.toISOString().slice(0, 10),
      })),
    );

    if (logsError) {
      setErrorMessage(logsError.message);
      setEndingSession(false);
      return;
    }

    await supabase
      .from("user_presence")
      .upsert({
        user_id: user.id,
        status: "online",
        current_activity: null,
        updated_at: endedAt.toISOString(),
      });

    setSessionActive(false);
    setSessionSubject("");
    setElapsed(0);
    setActiveSessionId(null);
    setSessionParticipants([]);
    setEndingSession(false);
  }, [activeSessionId, elapsed, endingSession, sessionParticipants, user]);

  const isOpen = showDropdown && filtered.length > 0;
  const listboxId = "friend-search-listbox";

  if (sessionActive) {
    return (
      <section className="bg-[#FFC107] border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 md:p-7">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black border-2 border-black flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#FFC107]" strokeWidth={3} />
            </div>
            <div>
              <h2 className="font-black text-base md:text-lg text-black uppercase tracking-wider">Session Active</h2>
              <p className="font-bold text-xs text-black/60 uppercase tracking-wide">
                {sessionParticipants.length + 1} participant{sessionParticipants.length + 1 !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => void endSession()}
            disabled={endingSession}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FF4444] border-[3px] border-black font-black text-xs text-white uppercase tracking-wide shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50"
          >
            <Square className="w-3 h-3" strokeWidth={3} />
            {endingSession ? "Ending..." : "End"}
          </button>
        </div>

        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-black" strokeWidth={2.5} />
            <span className="font-black text-2xl md:text-3xl text-black tracking-widest font-mono">
              {formatTime(elapsed)}
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <BookOpen className="w-4 h-4 text-black/60 shrink-0" strokeWidth={2.5} />
            <label htmlFor="session-subject" className="sr-only">Study subject</label>
            <input
              id="session-subject"
              type="text"
              value={sessionSubject}
              onChange={(e) => setSessionSubject(e.target.value)}
              placeholder="What are you studying?"
              className="bg-transparent outline-none font-bold text-sm text-black placeholder:text-black/30 w-full sm:w-60"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="bg-[#B3FFB3] border-2 border-black px-3 py-1.5 font-black text-xs text-black uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            You
          </span>
          {sessionParticipants.map((f) => {
            const avatarColor = AVATAR_COLORS[f.id.charCodeAt(0) % AVATAR_COLORS.length];
            return (
              <span
                key={f.id}
                className={`${avatarColor} border-2 border-black px-3 py-1.5 font-black text-xs text-black uppercase tracking-wide flex items-center gap-1.5`}
              >
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {f.name}
              </span>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 md:p-7">
      <h2 className="font-black text-base md:text-lg text-black uppercase tracking-wide mb-4">
        Start a Study Session
      </h2>

      {errorMessage && (
        <div className="mb-4 border-[3px] border-black bg-[#FFB3C1] p-3 font-bold text-xs text-black">
          {errorMessage}
        </div>
      )}

      <div className="relative mb-4" ref={containerRef}>
        <div className="flex items-center border-[3px] border-black bg-[#F4F8FA] px-3 py-2.5">
          <Search className="w-4 h-4 text-black mr-2 shrink-0" strokeWidth={2.5} />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            placeholder="Search friends..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => query && setShowDropdown(true)}
            className="bg-transparent outline-none w-full font-bold text-sm text-black placeholder:text-black/40 tracking-wide"
          />
          <button
            onClick={() => query && setShowDropdown(!showDropdown)}
            className="ml-2 w-10 h-10 bg-black text-white flex items-center justify-center shrink-0 border-2 border-black outline-none focus-visible:ring-2 focus-visible:ring-[#FFC107] focus-visible:ring-offset-1"
            aria-label="Search friends"
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
          </button>
        </div>

        {isOpen && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Search results"
            className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-40 overflow-y-auto"
          >
            {filtered.map((f) => (
              <li key={f.id} role="option" aria-selected={false}>
                <button
                  onClick={() => addFriend(f)}
                  className="w-full text-left px-4 py-2.5 font-bold text-sm text-black uppercase tracking-wide hover:bg-[#FFC107] transition-colors duration-150 border-b-2 border-black last:border-b-0 outline-none focus-visible:bg-[#FFC107]"
                >
                  {f.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4" role="list" aria-label="Selected friends">
          {selected.map((f) => (
            <span
              key={f.id}
              role="listitem"
              className="flex items-center gap-1.5 bg-[#F4F8FA] border-2 border-black px-3 py-1.5 font-black text-xs text-black uppercase tracking-wide"
            >
              {f.name}
              <button
                onClick={() => removeFriend(f.id)}
                aria-label={`Remove ${f.name}`}
                className="ml-1 p-1 hover:text-red-600 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm"
              >
                <X className="w-3.5 h-3.5" strokeWidth={3} />
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => void startSession()}
        disabled={selected.length === 0 || startingSession}
        className="w-full bg-[#FFC107] border-[3px] border-black py-3 font-black text-sm md:text-base text-black uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
      >
        {startingSession
          ? "Starting Session..."
          : selected.length > 0
            ? `Start Session with ${selected.length} Friend${selected.length > 1 ? "s" : ""}`
            : "Select Friends to Start"}
      </button>
    </section>
  );
};

export default StartStudySession;
