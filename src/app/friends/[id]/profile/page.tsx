"use client";

import React, { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GraduationCap, Clock, MessageSquare, Zap } from "lucide-react";
import { getFriendById } from "@/app/components/friends/friendsData";

const AVATAR_COLORS = [
  "bg-[#FFD1B3]", "bg-[#8FFFE1]", "bg-[#FFC107]",
  "bg-[#B8D4FF]", "bg-[#FFB3D9]", "bg-[#C4B5FD]",
];

const STATUS_CONFIG = {
  online: { label: "ONLINE", color: "bg-green-500", bg: "bg-[#B3FFB3]" },
  "in-session": { label: "IN SESSION", color: "bg-[#FFC107]", bg: "bg-[#FFC107]" },
  offline: { label: "OFFLINE", color: "bg-gray-400", bg: "bg-gray-200" },
} as const;

const SKILL_COLORS = [
  "bg-[#FFC107]", "bg-[#B3D4FF]", "bg-[#FFB3C1]",
  "bg-[#B3FFB3]", "bg-[#E8D5FF]", "bg-[#FFD1B3]",
];

export default function FriendProfilePage() {
  const params = useParams();
  const router = useRouter();
  const friend = useMemo(() => getFriendById(params.id as string), [params.id]);

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
  const status = STATUS_CONFIG[friend.status];

  return (
    <div className="w-full max-w-3xl mx-auto py-6 px-4 md:px-0 space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push("/friends")}
        className="flex items-center gap-2 font-black text-sm text-black uppercase tracking-wide hover:text-black/60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-black"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={3} />
        Friends
      </button>

      {/* Hero Card */}
      <div className="bg-[#FFB3C1] border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className={`${avatarColor} w-24 h-24 border-[3px] border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
            <span className="font-black text-3xl text-black">{friend.avatar}</span>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="font-black text-2xl text-black uppercase tracking-wider">{friend.name}</h2>
            <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
              <span className={`${status.bg} border-2 border-black px-3 py-1 font-black text-xs text-black uppercase tracking-wide flex items-center gap-1.5`}>
                <span className={`w-2 h-2 rounded-full ${status.color}`} />
                {status.label}
              </span>
            </div>
            <p className="font-bold text-sm text-black/70 mt-3">{friend.bio}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <Link
            href={`/friends/${friend.id}/message`}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border-[3px] border-black font-black text-sm text-black uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <MessageSquare className="w-4 h-4" strokeWidth={2.5} />
            Message
          </Link>
          {friend.status === "in-session" && (
            <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#FFC107] border-[3px] border-black font-black text-sm text-black uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all outline-none focus-visible:ring-2 focus-visible:ring-black">
              <Zap className="w-4 h-4" strokeWidth={2.5} />
              Join Session
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Info Card */}
        <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
          <h3 className="font-black text-lg text-black uppercase tracking-wider flex items-center gap-2">
            <GraduationCap className="w-5 h-5" strokeWidth={2.5} />
            Info
          </h3>
          <div className="space-y-3">
            <div>
              <p className="font-black text-xs text-black/50 uppercase tracking-wider">Email</p>
              <p className="font-bold text-sm text-black mt-1">{friend.email}</p>
            </div>
            <div>
              <p className="font-black text-xs text-black/50 uppercase tracking-wider">University</p>
              <p className="font-bold text-sm text-black mt-1">{friend.university}</p>
            </div>
            <div>
              <p className="font-black text-xs text-black/50 uppercase tracking-wider">Major</p>
              <p className="font-bold text-sm text-black mt-1">{friend.major}</p>
            </div>
          </div>
        </div>

        {/* Study Stats */}
        <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
          <h3 className="font-black text-lg text-black uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-5 h-5" strokeWidth={2.5} />
            Study Stats
          </h3>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-[#FFC107] border-[3px] border-black flex flex-col items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <span className="font-black text-2xl text-black">{friend.studyHours}</span>
              <span className="font-bold text-[10px] text-black/60 uppercase">Hours</span>
            </div>
            {friend.activity && (
              <p className="font-bold text-sm text-black/70">
                Currently: {friend.activity}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6">
        <h3 className="font-black text-lg text-black uppercase tracking-wider mb-4">Skills</h3>
        <div className="flex flex-wrap gap-2">
          {friend.skills.map((skill, i) => (
            <span
              key={skill}
              className={`${SKILL_COLORS[i % SKILL_COLORS.length]} border-[3px] border-black px-4 py-2 font-black text-xs text-black uppercase tracking-wide shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
