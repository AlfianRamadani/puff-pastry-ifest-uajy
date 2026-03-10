"use client";

import React, { memo } from "react";
import Link from "next/link";
import { MessageSquare, UserPlus, Zap, Send } from "lucide-react";
import type { Friend } from "./friendsData";

const STATUS_CONFIG = {
  online: {
    label: "ONLINE",
    dotColor: "bg-green-500",
  },
  "in-session": {
    label: "IN SESSION",
    dotColor: "bg-[#FFC107]",
  },
  offline: {
    label: "OFFLINE",
    dotColor: "bg-gray-400",
  },
} as const;

const AVATAR_COLORS = [
  "bg-[#FFD1B3]",
  "bg-[#8FFFE1]",
  "bg-[#FFC107]",
  "bg-[#B8D4FF]",
  "bg-[#FFB3D9]",
  "bg-[#C4B5FD]",
];

interface FriendCardProps {
  friend: Friend;
}

// Desktop card
export const FriendCardDesktop: React.FC<FriendCardProps> = memo(({ friend }) => {
  const status = STATUS_CONFIG[friend.status];
  const isActive = friend.status !== "offline";
  const avatarColor = AVATAR_COLORS[parseInt(friend.id) % AVATAR_COLORS.length];

  return (
    <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5 flex flex-col gap-4">
      {/* Avatar + Info */}
      <div className="flex items-start gap-3">
        <div
          className={`${avatarColor} w-12 h-12 border-2 border-black flex items-center justify-center font-black text-sm text-black shrink-0`}
        >
          {friend.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-sm text-black uppercase tracking-wide truncate">
            {friend.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`w-2 h-2 rounded-full ${status.dotColor} shrink-0`}
            />
            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-600">
              {status.label}
            </span>
          </div>
          {friend.activity && (
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1 truncate">
              {friend.activity}
            </p>
          )}
          {friend.lastSeen && (
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-1">
              {friend.lastSeen}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {isActive ? (
          <Link
            href={`/friends/${friend.id}/message`}
            className="flex-1 py-2 border-2 border-black font-black text-xs uppercase tracking-wide text-center bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#FFC107] focus-visible:ring-offset-1"
          >
            Message
          </Link>
        ) : (
          <span className="flex-1 py-2 border-2 border-black font-black text-xs uppercase tracking-wide text-center bg-gray-200 text-gray-400 cursor-not-allowed">
            Message
          </span>
        )}
        <Link
          href={`/friends/${friend.id}/profile`}
          className="flex-1 py-2 border-2 border-black font-black text-xs uppercase tracking-wide text-center bg-white text-black hover:bg-gray-100 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1"
        >
          View Profile
        </Link>
      </div>
    </div>
  );
});
FriendCardDesktop.displayName = "FriendCardDesktop";

// Mobile list item
export const FriendCardMobile: React.FC<FriendCardProps> = memo(({ friend }) => {
  const status = STATUS_CONFIG[friend.status];
  const isActive = friend.status !== "offline";
  const avatarColor = AVATAR_COLORS[parseInt(friend.id) % AVATAR_COLORS.length];

  const statusText =
    friend.status === "online"
      ? `Online · ${friend.sessionDuration ?? ""}`
      : friend.status === "in-session"
        ? `In Session · ${friend.activity ?? ""}`
        : `Offline · ${friend.lastSeen ?? ""}`;

  return (
    <div className="flex items-center gap-3 bg-white border-[3px] border-black p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
      <Link href={`/friends/${friend.id}/profile`} className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={`${avatarColor} w-10 h-10 border-2 border-black flex items-center justify-center font-black text-xs text-black shrink-0`}
        >
          {friend.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-xs text-black uppercase tracking-wide truncate">
            {friend.name}
          </h3>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${status.dotColor} shrink-0`}
            />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide truncate">
              {statusText}
            </span>
          </div>
        </div>
      </Link>
      <div className="flex gap-1.5 shrink-0">
        <button
          disabled={!isActive}
          aria-label={`Send invite to ${friend.name}`}
          className={`p-2 border-2 border-black outline-none focus-visible:ring-2 focus-visible:ring-black ${isActive ? "bg-[#FFC107] active:translate-x-[1px] active:translate-y-[1px]" : "bg-gray-200 cursor-not-allowed"} transition-all duration-150`}
        >
          <Send className="w-4 h-4 text-black" strokeWidth={2.5} />
        </button>
        {friend.status === "in-session" && (
          <button
            aria-label={`Join ${friend.name}'s session`}
            className="p-2 border-2 border-black bg-[#FFC107] active:translate-x-[1px] active:translate-y-[1px] transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <Zap className="w-4 h-4 text-black" strokeWidth={2.5} />
          </button>
        )}
        <Link
          href={`/friends/${friend.id}/message`}
          aria-label={`Message ${friend.name}`}
          className="p-2 border-2 border-black bg-white hover:bg-gray-100 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          <MessageSquare className="w-4 h-4 text-black" strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  );
});
FriendCardMobile.displayName = "FriendCardMobile";

// Add new friend placeholder (desktop)
export const AddFriendCard: React.FC = () => (
  <button className="w-full h-full min-h-[160px] border-[3px] border-dashed border-black bg-white flex flex-col items-center justify-center gap-2 hover:bg-[#F4F8FA] transition-colors duration-150 cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2">
    <div className="w-12 h-12 border-[3px] border-dashed border-black rounded-full flex items-center justify-center group-hover:border-solid group-hover:bg-[#FFC107] transition-all duration-150">
      <UserPlus className="w-5 h-5 text-black" strokeWidth={2.5} />
    </div>
    <span className="font-black text-xs text-black uppercase tracking-wide">
      Add New Friend
    </span>
  </button>
);

// Add new friend (mobile)
export const AddFriendMobile: React.FC = () => (
  <button className="flex items-center gap-3 bg-white border-[3px] border-dashed border-black p-3 w-full hover:bg-[#F4F8FA] transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black">
    <div className="w-10 h-10 border-2 border-dashed border-black rounded-full flex items-center justify-center shrink-0">
      <UserPlus className="w-4 h-4 text-black" strokeWidth={2.5} />
    </div>
    <span className="font-black text-xs text-black uppercase tracking-wide">
      Add New Friend
    </span>
  </button>
);
