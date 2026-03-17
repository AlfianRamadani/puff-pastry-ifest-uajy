"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { X, CheckSquare, Users, BookOpen, Clock, Search, Bell, Sparkles, Settings, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const PAGE_TITLES: Record<string, { label: string; color: string }> = {
  "/dashboard": { label: "DASHBOARD", color: "bg-[#FFC107]" },
  "/friends": { label: "FRIENDS", color: "bg-[#B3D4FF]" },
  "/tasks": { label: "TASKS", color: "bg-[#B3FFB3]" },
  "/testing": { label: "TASKS", color: "bg-[#B3FFB3]" },
  "/notes": { label: "NOTES", color: "bg-[#FFB3C1]" },
  "/settings": { label: "SETTINGS", color: "bg-[#E8D5FF]" },
};

function getPageInfo(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const [prefix, info] of Object.entries(PAGE_TITLES)) {
    if (prefix !== "/" && pathname.startsWith(prefix)) return info;
  }
  return PAGE_TITLES["/dashboard"];
}

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
};

type SearchItem = {
  label: string;
  href: string;
  category: "Tasks" | "Notes" | "Courses" | "Friends";
  color: string;
};

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour ago`;
  return `${Math.floor(diffHour / 24)} day ago`;
}

function routeForNotification(item: NotificationItem): string {
  if (item.reference_type === "friendship") return "/friends/add";
  if (item.reference_type === "message") return "/friends";
  if (item.reference_type === "session") return item.reference_id ? `/session/${item.reference_id}` : "/friends";
  return "/tasks";
}

const TopBar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const page = getPageInfo(pathname);
  const { user, profile, signOut, unreadNotifications, refreshUnreadNotifications, notificationToast } = useAuth();

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const displayName = profile?.full_name || profile?.email || "Student";
  const avatarChar = displayName.charAt(0).toUpperCase();

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error) {
      setNotifications((data as NotificationItem[] | null) ?? []);
    }
  }, [user]);

  useEffect(() => {
    if (notifOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadNotifications();
    }
  }, [loadNotifications, notifOpen]);

  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(async () => {
      const q = searchQuery.trim();
      if (q.length < 2) {
        setSearchResults([]);
        return;
      }

      const [tasksResult, notesResult, coursesResult, friendshipsResult] = await Promise.all([
        supabase.from("tasks").select("id, title").eq("user_id", user.id).ilike("title", `%${q}%`).limit(5),
        supabase.from("notes").select("id, title, slug, folder").eq("user_id", user.id).ilike("title", `%${q}%`).limit(5),
        supabase.from("courses").select("id, name").eq("user_id", user.id).ilike("name", `%${q}%`).limit(5),
        supabase
          .from("friendships")
          .select("requester_id, addressee_id")
          .eq("status", "accepted")
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
      ]);

      const friendIds = Array.from(
        new Set(
          (((friendshipsResult.data as Array<{ requester_id: string; addressee_id: string }> | null) ?? []).map((row) =>
            row.requester_id === user.id ? row.addressee_id : row.requester_id,
          )),
        ),
      );
      let friendItems: SearchItem[] = [];
      if (friendIds.length > 0) {
        const { data: friendsData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", friendIds)
          .ilike("full_name", `%${q}%`)
          .limit(5);
        friendItems = (((friendsData as Array<{ id: string; full_name: string | null }> | null) ?? []).map((item) => ({
          label: item.full_name ?? "Friend",
          href: `/friends/${item.id}/profile`,
          category: "Friends",
          color: "bg-[#B3D4FF]",
        })));
      }

      const merged: SearchItem[] = [
        ...(((tasksResult.data as Array<{ id: string; title: string }> | null) ?? []).map((item) => ({
          label: item.title,
          href: "/tasks",
          category: "Tasks",
          color: "bg-[#B3FFB3]",
        }))),
        ...(((notesResult.data as Array<{ id: string; title: string; slug: string; folder: string | null }> | null) ?? []).map((item) => ({
          label: item.title,
          href: `/notes/${item.folder ?? "study-space"}/${item.slug}`,
          category: "Notes",
          color: "bg-[#FFB3C1]",
        }))),
        ...(((coursesResult.data as Array<{ id: string; name: string }> | null) ?? []).map((item) => ({
          label: item.name,
          href: "/tasks?tab=academic-load",
          category: "Courses",
          color: "bg-[#FFC107]",
        }))),
        ...friendItems,
      ];
      setSearchResults(merged);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchQuery, user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    await refreshUnreadNotifications();
    await loadNotifications();
  }, [loadNotifications, refreshUnreadNotifications, user]);

  const openNotification = useCallback(async (item: NotificationItem) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", item.id);
    await refreshUnreadNotifications();
    setNotifOpen(false);
    router.push(routeForNotification(item));
  }, [refreshUnreadNotifications, router]);

  return (
    <nav className="w-full font-sans antialiased">
      {notificationToast && (
        <div className="fixed top-4 right-4 z-[100] border-[3px] border-black bg-[#FFC107] px-3 py-2 text-xs font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          {notificationToast}
        </div>
      )}

      <header className="hidden md:flex w-full bg-white border-b-[3px] border-black px-6 py-0 items-stretch">
        <div className={`flex items-center gap-3 px-6 py-4 ${page.color} border-r-[3px] border-black -ml-6 mr-6`}>
          <Sparkles className="w-5 h-5 text-black" strokeWidth={2.5} />
          <h1 className="font-black text-base text-black tracking-wider">{page.label}</h1>
        </div>

        <div className="flex-1 flex items-center relative" ref={searchRef}>
          <div className="flex items-center w-full max-w-xl bg-[#FFFDF7] border-[3px] border-black px-4 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <Search className="w-4 h-4 text-black mr-3 shrink-0" strokeWidth={3} />
            <input
              type="text"
              placeholder="Search anything..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(e.target.value.trim().length >= 2); }}
              onFocus={() => searchQuery.trim().length >= 2 && setSearchOpen(true)}
              className="bg-transparent outline-none w-full font-bold text-sm text-black placeholder:text-black/30 tracking-wide"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSearchOpen(false); }} className="p-1 hover:bg-black/5">
                <X className="w-3 h-3 text-black" strokeWidth={3} />
              </button>
            )}
          </div>
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-full max-w-xl bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-50 max-h-80 overflow-y-auto">
              {searchResults.map((item, idx) => (
                <Link key={`${item.label}-${idx}`} href={item.href} onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="flex items-center gap-3 px-4 py-3 hover:bg-[#FFC107]/20 border-b border-black/10 last:border-b-0">
                  <div className={`w-2.5 h-2.5 ${item.color} border-2 border-black shrink-0`} />
                  <div>
                    <p className="font-bold text-sm text-black">{item.label}</p>
                    <p className="font-black text-[10px] text-black/50 uppercase">{item.category}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 ml-6">
          <div className="relative" ref={notifRef}>
            <button onClick={() => setNotifOpen((v) => !v)} className={`relative p-2.5 border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${notifOpen ? "bg-[#FFC107]" : "bg-[#B3D4FF]"}`}>
              <Bell className="w-5 h-5 text-black" strokeWidth={2.5} />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#FF4444] border-2 border-black flex items-center justify-center">
                  <span className="font-black text-[8px] text-white">{unreadNotifications}</span>
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-50">
                <div className="flex items-center justify-between px-4 py-3 bg-[#B3D4FF] border-b-[3px] border-black">
                  <span className="font-black text-xs text-black uppercase tracking-wider">Notifications</span>
                  <button onClick={() => void markAllRead()} className="font-black text-xs text-black/70 uppercase">Mark all read</button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <button key={n.id} onClick={() => void openNotification(n)} className={`flex items-start gap-3 w-full text-left px-4 py-3 border-b-2 border-black/10 last:border-b-0 hover:bg-[#FFC107]/10 ${n.is_read ? "opacity-70" : "bg-[#FFF9C4]"}`}>
                      <div className="w-8 h-8 bg-[#B3D4FF] border-2 border-black flex items-center justify-center shrink-0 mt-0.5">
                        {n.type === "session_invite" ? <Users className="w-4 h-4" /> : n.type === "friend_request" ? <Users className="w-4 h-4" /> : n.type === "message" ? <BookOpen className="w-4 h-4" /> : n.type === "task_due" ? <CheckSquare className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-black leading-snug">{n.title}</p>
                        <p className="font-bold text-xs text-black/60 line-clamp-2">{(n.body ?? "").slice(0, 80)}</p>
                        <p className="font-bold text-[10px] text-black/40 mt-0.5">{relativeTime(n.created_at)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={userMenuRef}>
            <button type="button" onClick={() => setUserMenuOpen((prev) => !prev)} className="flex items-center gap-2 px-3 py-2 bg-[#FFB3C1] border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-7 h-7 bg-[#FFC107] border-2 border-black flex items-center justify-center">
                <span className="font-black text-xs text-black">{avatarChar}</span>
              </div>
              <span className="font-black text-xs text-black uppercase tracking-wide max-w-[120px] truncate">{displayName}</span>
              <ChevronDown className="w-4 h-4 text-black" strokeWidth={2.5} />
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-50">
                <Link href="/settings/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 border-b-2 border-black/10 font-black text-xs uppercase tracking-wide text-black hover:bg-[#E8D5FF]">
                  <Settings className="w-3.5 h-3.5" strokeWidth={2.5} />Profile Settings
                </Link>
                <button type="button" onClick={() => { setUserMenuOpen(false); void signOut(); }} className="w-full flex items-center gap-2 px-3 py-2 font-black text-xs uppercase tracking-wide text-black hover:bg-[#FFB3C1]">
                  <LogOut className="w-3.5 h-3.5" strokeWidth={2.5} />Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="md:hidden w-full">
        <div className={`${page.color} border-b-[3px] border-black px-4 py-4`}>
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-black text-xl text-black tracking-wider">{page.label}</h1>
            <button className="w-9 h-9 bg-[#FFB3C1] border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <span className="font-black text-sm text-black">{avatarChar}</span>
            </button>
          </div>
          <div className="relative">
            <div className="flex items-center bg-white border-[3px] border-black px-3 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <Search className="w-4 h-4 text-black mr-2 shrink-0" strokeWidth={3} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(e.target.value.trim().length >= 2); }}
                className="bg-transparent outline-none w-full font-bold text-sm text-black placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TopBar;
