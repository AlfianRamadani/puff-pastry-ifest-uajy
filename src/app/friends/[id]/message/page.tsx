"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, User } from "lucide-react";
import { getFriendById } from "@/app/components/friends/friendsData";

interface Message {
  id: string;
  from: "me" | "friend";
  text: string;
  time: string;
}

const MSG_STORAGE_PREFIX = "puff-pastry-messages-";

function loadMessages(friendId: string): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MSG_STORAGE_PREFIX + friendId);
    if (raw) return JSON.parse(raw);
  } catch { /* fallback */ }
  return [];
}

function saveMessages(friendId: string, msgs: Message[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MSG_STORAGE_PREFIX + friendId, JSON.stringify(msgs));
}

const SEED_MESSAGES: Record<string, Message[]> = {
  "1": [
    { id: "s1", from: "friend", text: "Hey! Want to study UI Design together?", time: "10:30 AM" },
    { id: "s2", from: "me", text: "Sure! Let me finish this chapter first", time: "10:32 AM" },
    { id: "s3", from: "friend", text: "Cool, I'll set up a session 👍", time: "10:33 AM" },
  ],
  "2": [
    { id: "s1", from: "friend", text: "Are you joining the maths study group?", time: "9:00 AM" },
    { id: "s2", from: "me", text: "Yeah I'll be there at 2pm", time: "9:15 AM" },
  ],
  "3": [
    { id: "s1", from: "me", text: "How's the thermo assignment going?", time: "Yesterday" },
    { id: "s2", from: "friend", text: "Almost done! Want to compare answers?", time: "Yesterday" },
  ],
};

const AVATAR_COLORS = [
  "bg-[#FFD1B3]", "bg-[#8FFFE1]", "bg-[#FFC107]",
  "bg-[#B8D4FF]", "bg-[#FFB3D9]", "bg-[#C4B5FD]",
];

export default function FriendMessagePage() {
  const params = useParams();
  const router = useRouter();
  const friendId = params.id as string;
  const friend = useMemo(() => getFriendById(friendId), [friendId]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = loadMessages(friendId);
    if (stored.length > 0) {
      setMessages(stored);
    } else if (SEED_MESSAGES[friendId]) {
      setMessages(SEED_MESSAGES[friendId]);
      saveMessages(friendId, SEED_MESSAGES[friendId]);
    }
  }, [friendId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newMsg: Message = { id: `m-${Date.now()}`, from: "me", text, time };

    setMessages((prev) => {
      const updated = [...prev, newMsg];
      saveMessages(friendId, updated);
      return updated;
    });
    setInput("");
    inputRef.current?.focus();
  }, [input, friendId]);

  if (!friend) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="font-black text-lg text-black uppercase tracking-wider">Friend not found</p>
        <Link
          href="/friends"
          className="px-5 py-3 bg-[#FFC107] border-[3px] border-black font-black text-sm uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          Back to Friends
        </Link>
      </div>
    );
  }

  const avatarColor = AVATAR_COLORS[parseInt(friend.id) % AVATAR_COLORS.length];

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-20px)] py-4 px-4 md:px-0">
      {/* Header */}
      <div className="bg-[#B3D4FF] border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 flex items-center gap-4 mb-4 shrink-0">
        <button
          onClick={() => router.push("/friends")}
          className="p-2 bg-white border-2 border-black active:translate-x-[1px] active:translate-y-[1px] transition-all outline-none focus-visible:ring-2 focus-visible:ring-black"
          aria-label="Back to friends"
        >
          <ArrowLeft className="w-4 h-4 text-black" strokeWidth={3} />
        </button>
        <div className={`${avatarColor} w-10 h-10 border-2 border-black flex items-center justify-center shrink-0`}>
          <span className="font-black text-sm text-black">{friend.avatar}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-sm text-black uppercase tracking-wider truncate">{friend.name}</h2>
          <p className="font-bold text-xs text-black/60 uppercase tracking-wide">
            {friend.status === "online" ? "Online" : friend.status === "in-session" ? "In Session" : "Offline"}
          </p>
        </div>
        <Link
          href={`/friends/${friend.id}/profile`}
          className="p-2 bg-white border-2 border-black hover:bg-[#FFC107]/20 active:translate-x-[1px] active:translate-y-[1px] transition-all outline-none focus-visible:ring-2 focus-visible:ring-black"
          aria-label="View profile"
        >
          <User className="w-4 h-4 text-black" strokeWidth={2.5} />
        </Link>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 pb-4 min-h-0"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className={`${avatarColor} w-16 h-16 border-[3px] border-black flex items-center justify-center mb-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}>
              <span className="font-black text-xl text-black">{friend.avatar}</span>
            </div>
            <p className="font-black text-sm text-black uppercase tracking-wider">No messages yet</p>
            <p className="font-bold text-xs text-black/50 mt-1">Say hi to {friend.name}!</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] border-[3px] border-black p-3 ${
                msg.from === "me"
                  ? "bg-[#FFC107] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              }`}
            >
              <p className="font-bold text-sm text-black">{msg.text}</p>
              <p className="font-bold text-[10px] text-black/60 mt-1 text-right uppercase">{msg.time}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
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
              onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
              placeholder="Type a message..."
              className="bg-transparent outline-none w-full font-bold text-sm text-black placeholder:text-black/30"
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="px-5 py-3 bg-[#FFC107] border-[3px] border-black font-black text-sm text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-black"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
