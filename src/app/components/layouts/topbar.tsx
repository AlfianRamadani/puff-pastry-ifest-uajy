"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, CheckSquare, Users, BookOpen, Clock, Search, Bell, Sparkles, Settings, LogOut, ChevronDown, Zap } from 'lucide-react';

const PAGE_TITLES: Record<string, { label: string; color: string }> = {
  '/dashboard': { label: 'DASHBOARD', color: 'bg-[#FFC107]' },
  '/friends': { label: 'FRIENDS', color: 'bg-[#B3D4FF]' },
  '/tasks': { label: 'TASKS', color: 'bg-[#B3FFB3]' },
  '/testing': { label: 'TASKS', color: 'bg-[#B3FFB3]' },
  '/notes': { label: 'NOTES', color: 'bg-[#FFB3C1]' },
  '/settings': { label: 'SETTINGS', color: 'bg-[#E8D5FF]' },
};

function getPageInfo(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const [prefix, info] of Object.entries(PAGE_TITLES)) {
    if (prefix !== '/' && pathname.startsWith(prefix)) return info;
  }
  return PAGE_TITLES['/dashboard'];
}

const NOTIFICATIONS = [
  { id: "1", title: "Final Project deadline tomorrow!", time: "2 min ago", color: "bg-[#FFB3C1]", icon: Clock, read: false },
  { id: "2", title: "Rina started a study session", time: "15 min ago", color: "bg-[#B3D4FF]", icon: Users, read: false },
  { id: "3", title: "Neural Networks homework graded: A-", time: "1 hour ago", color: "bg-[#B3FFB3]", icon: BookOpen, read: false },
  { id: "4", title: "3 tasks overdue — check your list", time: "3 hours ago", color: "bg-[#FFC107]", icon: CheckSquare, read: true },
  { id: "5", title: "New friend request from Budi", time: "Yesterday", color: "bg-[#B3D4FF]", icon: Users, read: true },
];

const SEARCH_ITEMS = [
  { label: "My Tasks", href: "/tasks", category: "Pages", color: "bg-[#B3FFB3]" },
  { label: "Friends", href: "/friends", category: "Pages", color: "bg-[#B3D4FF]" },
  { label: "Academic Load", href: "/tasks", category: "Pages", color: "bg-[#FFC107]" },
  { label: "Final Project Documentation", href: "/tasks", category: "Tasks", color: "bg-[#FFB3C1]" },
  { label: "Neural Networks Homework", href: "/tasks", category: "Tasks", color: "bg-[#FFC107]" },
  { label: "Review Pull Requests", href: "/tasks", category: "Tasks", color: "bg-[#B3FFB3]" },
  { label: "Database ER Diagram", href: "/tasks", category: "Tasks", color: "bg-[#B3D4FF]" },
  { label: "Software Engineering", href: "/tasks", category: "Courses", color: "bg-[#B3D4FF]" },
  { label: "Database Systems", href: "/tasks", category: "Courses", color: "bg-[#FFC107]" },
];

const TopBar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const page = getPageInfo(pathname);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const searchResults = searchQuery.trim()
    ? SEARCH_ITEMS.filter((item) => item.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const groupedResults = searchResults.reduce<Record<string, typeof SEARCH_ITEMS>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <nav className="w-full font-sans antialiased">
      {/* Desktop TopBar */}
      <header className="hidden md:flex w-full bg-white border-b-[3px] border-t-0 border-black px-6 py-0 items-stretch">
        {/* Page Title */}
        <div className={`flex items-center gap-3 px-6 py-4 ${page.color} border-r-[3px] border-black -ml-6 mr-6`}>
          <Sparkles className="w-5 h-5 text-black" strokeWidth={2.5} />
          <h1 className="font-black text-base text-black tracking-wider">{page.label}</h1>
        </div>

        {/* Search with dropdown */}
        <div className="flex-1 flex items-center relative" ref={searchRef}>
          <div className="flex items-center w-full max-w-xl bg-[#FFFDF7] border-[3px] border-black px-4 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus-within:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus-within:translate-x-[1px] focus-within:translate-y-[1px] transition-all">
            <Search className="w-4 h-4 text-black mr-3 shrink-0" strokeWidth={3} />
            <label htmlFor="topbar-search" className="sr-only">Search</label>
            <input
              id="topbar-search"
              type="text"
              placeholder="Search anything..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => searchQuery && setSearchOpen(true)}
              className="bg-transparent outline-none w-full font-bold text-sm text-black placeholder:text-black/30 tracking-wide"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSearchOpen(false); }} aria-label="Clear search" className="p-1 hover:bg-black/5 transition-colors">
                <X className="w-3 h-3 text-black" strokeWidth={3} />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchOpen && searchQuery.trim() && (
            <div className="absolute top-full left-0 mt-2 w-full max-w-xl bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-50 max-h-80 overflow-y-auto">
              {Object.keys(groupedResults).length > 0 ? (
                Object.entries(groupedResults).map(([category, items]) => (
                  <div key={category}>
                    <div className="px-4 py-2 bg-[#FFFDF7] border-b-2 border-black">
                      <span className="font-black text-xs text-black/50 uppercase tracking-wider">{category}</span>
                    </div>
                    {items.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[#FFC107]/20 border-b border-black/10 last:border-b-0 transition-colors"
                      >
                        <div className={`w-2.5 h-2.5 ${item.color} border-2 border-black shrink-0`} />
                        <span className="font-bold text-sm text-black">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center">
                  <p className="font-black text-xs text-black/40 uppercase tracking-wide">No results for &ldquo;{searchQuery}&rdquo;</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div data-tour="topbar-actions" className="flex items-center gap-3 ml-6">
          {/* Notification Bell with Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((v) => !v)}
              aria-label="Notifications"
              aria-expanded={notifOpen}
              className={`relative p-2.5 border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all outline-none focus-visible:ring-2 focus-visible:ring-black ${notifOpen ? 'bg-[#FFC107]' : 'bg-[#B3D4FF]'}`}
            >
              <Bell className="w-5 h-5 text-black" strokeWidth={2.5} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#FF4444] border-2 border-black flex items-center justify-center">
                  <span className="font-black text-[8px] text-white">{unreadCount}</span>
                </span>
              )}
            </button>

            {/* Notification Panel */}
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-50">
                <div className="flex items-center justify-between px-4 py-3 bg-[#B3D4FF] border-b-[3px] border-black">
                  <span className="font-black text-xs text-black uppercase tracking-wider">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="font-black text-xs text-black/60 uppercase tracking-wide hover:text-black transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`flex items-start gap-3 w-full text-left px-4 py-3 border-b-2 border-black/10 last:border-b-0 transition-colors hover:bg-[#FFC107]/10 ${n.read ? 'opacity-50' : ''}`}
                    >
                      <div className={`w-8 h-8 ${n.color} border-2 border-black flex items-center justify-center shrink-0 mt-0.5`}>
                        <n.icon className="w-4 h-4 text-black" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-black leading-snug">{n.title}</p>
                        <p className="font-bold text-xs text-black/40 mt-0.5">{n.time}</p>
                      </div>
                      {!n.read && <div className="w-2 h-2 bg-[#FF4444] border border-black rounded-full shrink-0 mt-2" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#FFB3C1] border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all">
            <div className="w-7 h-7 bg-[#FFC107] border-2 border-black flex items-center justify-center">
              <span className="font-black text-xs text-black">A</span>
            </div>
            <span className="font-black text-xs text-black uppercase tracking-wide">Alfian</span>
          </div>
        </div>
      </header>

      {/* Mobile TopBar */}
      <div className="md:hidden w-full">
        <div className={`${page.color} border-b-[3px] border-black px-4 py-4`}>
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-black text-xl text-black tracking-wider">{page.label}</h1>
            <div className="flex items-center gap-2">
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen((v) => !v)}
                  aria-label="Notifications"
                  aria-expanded={notifOpen}
                  className="relative p-2 bg-white border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  <Bell className="w-4 h-4 text-black" strokeWidth={2.5} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#FF4444] border border-black rounded-full" />
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-50">
                    <div className="flex items-center justify-between px-4 py-3 bg-[#B3D4FF] border-b-[3px] border-black">
                      <span className="font-black text-xs text-black uppercase tracking-wider">Notifications</span>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="font-black text-xs text-black/60 uppercase hover:text-black">
                          Read all
                        </button>
                      )}
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => markRead(n.id)}
                          className={`flex items-start gap-3 w-full text-left px-3 py-3 border-b border-black/10 last:border-b-0 hover:bg-[#FFC107]/10 ${n.read ? 'opacity-50' : ''}`}
                        >
                          <div className={`w-7 h-7 ${n.color} border-2 border-black flex items-center justify-center shrink-0`}>
                            <n.icon className="w-3.5 h-3.5 text-black" strokeWidth={2.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs text-black leading-snug">{n.title}</p>
                            <p className="font-bold text-xs text-black/40 mt-0.5">{n.time}</p>
                          </div>
                          {!n.read && <div className="w-2 h-2 bg-[#FF4444] rounded-full shrink-0 mt-1" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button className="w-9 h-9 bg-[#FFB3C1] border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <span className="font-black text-sm text-black">A</span>
              </button>
            </div>
          </div>

          {/* Brand */}
          <div className="flex items-center gap-3 bg-[#FFC107] border-[3px] border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all mb-3">
            <div className="bg-[#FFB3C1] border-2 border-black w-10 h-10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-black" strokeWidth={3} />
            </div>
            <div className="flex flex-col leading-tight flex-1">
              <span className="font-black text-sm text-black tracking-wide">GRIT</span>
              <span className="font-bold text-xs text-black/60">STUDY HUB</span>
            </div>
            <ChevronDown className="w-5 h-5 text-black" strokeWidth={3} />
          </div>

          {/* Mobile Search */}
          <div className="relative">
            <div className="flex items-center bg-white border-[3px] border-black px-3 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <Search className="w-4 h-4 text-black mr-2 shrink-0" strokeWidth={3} />
              <label htmlFor="mobile-topbar-search" className="sr-only">Search</label>
              <input
                id="mobile-topbar-search"
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => searchQuery && setSearchOpen(true)}
                className="bg-transparent outline-none w-full font-bold text-sm text-black placeholder:text-gray-400"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setSearchOpen(false); }} aria-label="Clear search" className="p-1">
                  <X className="w-3 h-3 text-black" strokeWidth={3} />
                </button>
              )}
            </div>
            {searchOpen && searchQuery.trim() && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-50 max-h-60 overflow-y-auto">
                {Object.keys(groupedResults).length > 0 ? (
                  Object.entries(groupedResults).map(([category, items]) => (
                    <div key={category}>
                      <div className="px-3 py-2 bg-[#FFFDF7] border-b-2 border-black">
                        <span className="font-black text-xs text-black/50 uppercase tracking-wider">{category}</span>
                      </div>
                      {items.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                          className="flex items-center gap-3 px-3 py-3 hover:bg-[#FFC107]/20 border-b border-black/10 last:border-b-0"
                        >
                          <div className={`w-2.5 h-2.5 ${item.color} border-2 border-black shrink-0`} />
                          <span className="font-bold text-sm text-black">{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center">
                    <p className="font-black text-xs text-black/40 uppercase">No results</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TopBar;