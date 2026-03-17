"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, User } from "lucide-react";
import ProtectedRoute from "@/app/components/auth/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type MessageRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

const AVATAR_COLORS = [
  "bg-[#FFD1B3]", "bg-[#8FFFE1]", "bg-[#FFC107]",
  "bg-[#B8D4FF]", "bg-[#FFB3D9]", "bg-[#C4B5FD]",
];

export default function FriendMessagePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const friendId = params.id as string;

  const [friendName, setFriendName] = useState("Friend");
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadChat = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErrorMessage(null);

    const [profileResult, messagesResult] = await Promise.all([
      supabase.from("profiles").select("id, full_name").eq("id", friendId).maybeSingle(),
      supabase
        .from("messages")
        .select("id, sender_id, receiver_id, content, created_at")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true }),
    ]);

    if (profileResult.error || messagesResult.error) {
      setLoading(false);
      setErrorMessage(profileResult.error?.message ?? messagesResult.error?.message ?? "Failed to load chat.");
      return;
    }

    const profile = profileResult.data as ProfileRow | null;
    setFriendName(profile?.full_name ?? "Friend");
    setMessages((messagesResult.data as MessageRow[] | null) ?? []);
    setLoading(false);
  }, [friendId, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadChat();
  }, [loadChat]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`messages-${user.id}-${friendId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const next = payload.new as MessageRow;
          const match =
            (next.sender_id === user.id && next.receiver_id === friendId) ||
            (next.sender_id === friendId && next.receiver_id === user.id);
          if (!match) return;
          setMessages((prev) => [...prev, next]);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [friendId, user]);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("messages")
      .update({ is_read: true })
      .eq("sender_id", friendId)
      .eq("receiver_id", user.id)
      .eq("is_read", false);
  }, [friendId, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !user) return;

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: friendId,
      content: text,
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setInput("");
    inputRef.current?.focus();
  }, [friendId, input, user]);

  const avatarInitials = useMemo(
    () =>
      friendName
        .split(" ")
        .map((part) => part[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [friendName],
  );

  const avatarColor = AVATAR_COLORS[(friendId?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];

  return (
    <ProtectedRoute>
      <div className="w-full max-w-3xl mx-auto flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-20px)] py-4 px-4 md:px-0">
        <div className="bg-[#B3D4FF] border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 flex items-center gap-4 mb-4 shrink-0">
          <button
            onClick={() => router.push("/friends")}
            className="p-2 bg-white border-2 border-black active:translate-x-[1px] active:translate-y-[1px] transition-all outline-none focus-visible:ring-2 focus-visible:ring-black"
            aria-label="Back to friends"
          >
            <ArrowLeft className="w-4 h-4 text-black" strokeWidth={3} />
          </button>
          <div className={`${avatarColor} w-10 h-10 border-2 border-black flex items-center justify-center shrink-0`}>
            <span className="font-black text-sm text-black">{avatarInitials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-sm text-black uppercase tracking-wider truncate">{friendName}</h2>
            <p className="font-bold text-xs text-black/60 uppercase tracking-wide">{loading ? "Loading..." : "Chat"}</p>
          </div>
          <Link
            href={`/friends/${friendId}/profile`}
            className="p-2 bg-white border-2 border-black hover:bg-[#FFC107]/20 active:translate-x-[1px] active:translate-y-[1px] transition-all outline-none focus-visible:ring-2 focus-visible:ring-black"
            aria-label="View profile"
          >
            <User className="w-4 h-4 text-black" strokeWidth={2.5} />
          </Link>
        </div>

        {errorMessage && (
          <div className="mb-3 border-[3px] border-black bg-[#FFB3C1] p-3 font-bold text-xs text-black">
            {errorMessage}
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-4 min-h-0">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className={`${avatarColor} w-16 h-16 border-[3px] border-black flex items-center justify-center mb-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}>
                <span className="font-black text-xl text-black">{avatarInitials}</span>
              </div>
              <p className="font-black text-sm text-black uppercase tracking-wider">No messages yet</p>
              <p className="font-bold text-xs text-black/50 mt-1">Say hi to {friendName}!</p>
            </div>
          )}

          {messages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] border-[3px] border-black p-3 ${
                    isMine
                      ? "bg-[#FFC107] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                      : "bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  }`}
                >
                  <p className="font-bold text-sm text-black">{msg.content}</p>
                  <p className="font-bold text-[10px] text-black/60 mt-1 text-right uppercase">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="shrink-0 pt-2">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center bg-white border-[3px] border-black px-4 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus-within:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] focus-within:translate-x-[1px] focus-within:translate-y-[1px] transition-all">
              <label htmlFor="msg-input" className="sr-only">Type a message</label>
              <input
                ref={inputRef}
                id="msg-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void sendMessage(); }}
                placeholder="Type a message..."
                className="bg-transparent outline-none w-full font-bold text-sm text-black placeholder:text-black/30"
              />
            </div>
            <button
              onClick={() => void sendMessage()}
              disabled={!input.trim()}
              className="px-5 py-3 bg-[#FFC107] border-[3px] border-black font-black text-sm text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-black"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
