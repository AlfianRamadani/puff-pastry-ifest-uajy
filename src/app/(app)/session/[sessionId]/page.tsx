"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Clock, Users, SquareCheckBig } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type SessionRow = {
  id: string;
  host_id: string;
  title: string | null;
  status: string | null;
  started_at: string | null;
  ended_at: string | null;
};

type ParticipantRow = {
  user_id: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type PresenceRow = {
  user_id: string;
  status: string | null;
  current_activity: string | null;
};

type ParticipantCard = {
  id: string;
  name: string;
  status: string;
  activity: string | null;
};

function formatElapsed(startedAt: string | null) {
  if (!startedAt) return "00:00:00";
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const hh = String(Math.floor(diffSec / 3600)).padStart(2, "0");
  const mm = String(Math.floor((diffSec % 3600) / 60)).padStart(2, "0");
  const ss = String(diffSec % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function SessionPage() {
  const { user } = useAuth();
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params?.sessionId;

  const [session, setSession] = useState<SessionRow | null>(null);
  const [participants, setParticipants] = useState<ParticipantCard[]>([]);
  const [subject, setSubject] = useState("");
  const [elapsed, setElapsed] = useState("00:00:00");
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setErrorMessage(null);

    const { data: sessionData, error: sessionError } = await supabase
      .from("study_sessions")
      .select("id, host_id, title, status, started_at, ended_at")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError || !sessionData) {
      setErrorMessage(sessionError?.message ?? "Session not found");
      setLoading(false);
      return;
    }

    const currentSession = sessionData as SessionRow;
    setSession(currentSession);
    setSubject(currentSession.title ?? "");

    const { data: participantRows, error: participantsError } = await supabase
      .from("study_session_participants")
      .select("user_id")
      .eq("session_id", sessionId);

    if (participantsError) {
      setErrorMessage(participantsError.message);
      setLoading(false);
      return;
    }

    const ids = (((participantRows as ParticipantRow[] | null) ?? []).map((row) => row.user_id));
    if (ids.length === 0) {
      setParticipants([]);
      setLoading(false);
      return;
    }

    const [{ data: profilesData, error: profilesError }, { data: presenceData, error: presenceError }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", ids),
      supabase.from("user_presence").select("user_id, status, current_activity").in("user_id", ids),
    ]);

    if (profilesError || presenceError) {
      setErrorMessage(profilesError?.message ?? presenceError?.message ?? "Failed to load participants");
      setLoading(false);
      return;
    }

    const profileMap = new Map(
      (((profilesData as ProfileRow[] | null) ?? []).map((entry) => [entry.id, entry])),
    );
    const presenceMap = new Map(
      (((presenceData as PresenceRow[] | null) ?? []).map((entry) => [entry.user_id, entry])),
    );

    setParticipants(
      ids.map((id) => ({
        id,
        name: profileMap.get(id)?.full_name ?? "Participant",
        status: presenceMap.get(id)?.status ?? "offline",
        activity: presenceMap.get(id)?.current_activity ?? null,
      })),
    );
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSession();
  }, [loadSession, sessionId]);

  useEffect(() => {
    if (!session?.started_at || session.status === "ended") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setElapsed(formatElapsed(session.started_at));
    const timer = window.setInterval(() => setElapsed(formatElapsed(session.started_at)), 1000);
    return () => window.clearInterval(timer);
  }, [session?.started_at, session?.status]);

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "study_session_participants", filter: `session_id=eq.${sessionId}` }, () => {
        void loadSession();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, () => {
        void loadSession();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "study_sessions", filter: `id=eq.${sessionId}` }, () => {
        void loadSession();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadSession, sessionId]);

  const isHost = user?.id === session?.host_id;

  useEffect(() => {
    if (!isHost || !sessionId) return;
    const timeout = window.setTimeout(async () => {
      await supabase.from("study_sessions").update({ title: subject }).eq("id", sessionId);
      if (user) {
        await supabase
          .from("user_presence")
          .upsert({ user_id: user.id, status: "in_session", current_activity: subject || null, updated_at: new Date().toISOString() });
      }
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [isHost, sessionId, subject, user]);

  const endSession = useCallback(async () => {
    if (!session || !user || !isHost || ending) return;
    setEnding(true);

    const endedAt = new Date();
    const startedAt = session.started_at ? new Date(session.started_at) : endedAt;
    const durationMinutes = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));
    const participantIds = participants.map((item) => item.id);

    const { error: sessionError } = await supabase
      .from("study_sessions")
      .update({ status: "ended", ended_at: endedAt.toISOString() })
      .eq("id", session.id);
    if (sessionError) {
      setErrorMessage(sessionError.message);
      setEnding(false);
      return;
    }

    if (participantIds.length > 0) {
      const { error: logError } = await supabase.from("study_logs").insert(
        participantIds.map((participantId) => ({
          user_id: participantId,
          session_id: session.id,
          duration_minutes: durationMinutes,
          logged_date: endedAt.toISOString().slice(0, 10),
        })),
      );
      if (logError) {
        setErrorMessage(logError.message);
      }
    }

    await supabase
      .from("user_presence")
      .upsert({ user_id: user.id, status: "online", current_activity: null, updated_at: new Date().toISOString() });

    setEnding(false);
    router.push("/friends");
  }, [ending, isHost, participants, router, session, user]);

  const sessionStatus = useMemo(() => (session?.status ?? "active").toUpperCase(), [session?.status]);

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="border-[3px] border-black bg-[#FFB3C1] px-4 py-3 font-black text-xs uppercase">
          {errorMessage}
        </div>
      )}

      <div className="border-[3px] border-black bg-[#FFC107] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-black text-xs uppercase tracking-wide text-black/60">Study Session</p>
            <p className="font-black text-2xl uppercase tracking-wide">{subject || "Untitled Session"}</p>
          </div>
          <div className="flex items-center gap-2 border-[3px] border-black bg-white px-3 py-2">
            <Clock className="w-4 h-4" strokeWidth={2.5} />
            <span className="font-black text-lg">{loading ? "..." : elapsed}</span>
            <span className="font-black text-[10px] uppercase text-black/60">{sessionStatus}</span>
          </div>
        </div>
      </div>

      {isHost && (
        <div className="border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="font-black text-xs uppercase mb-2">Session Subject</p>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="What are you studying now?"
            className="w-full border-[3px] border-black px-3 py-2 font-bold text-sm"
          />
        </div>
      )}

      <div className="border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-2 px-4 py-3 border-b-[3px] border-black bg-[#B3D4FF]">
          <Users className="w-4 h-4" strokeWidth={2.5} />
          <p className="font-black text-xs uppercase tracking-wide">Participants</p>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {participants.map((participant) => (
            <div key={participant.id} className="border-[3px] border-black bg-[#F4F8FA] p-3">
              <p className="font-black text-sm uppercase">{participant.name}</p>
              <p className="font-bold text-xs uppercase text-black/60 mt-1">{participant.status}</p>
              {participant.activity && <p className="font-bold text-xs mt-1">{participant.activity}</p>}
            </div>
          ))}
          {!loading && participants.length === 0 && (
            <p className="font-black text-xs uppercase text-black/50">No participants found.</p>
          )}
        </div>
      </div>

      {isHost && session?.status !== "ended" && (
        <button
          type="button"
          onClick={() => void endSession()}
          disabled={ending}
          className="w-full border-[3px] border-black bg-[#FFB3C1] py-3 font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
        >
          <span className="inline-flex items-center gap-2">
            <SquareCheckBig className="w-4 h-4" />
            {ending ? "Ending..." : "End Session"}
          </span>
        </button>
      )}
    </div>
  );
}
