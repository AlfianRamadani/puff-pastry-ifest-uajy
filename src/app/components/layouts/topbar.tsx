"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { Search, Bell, Sparkles } from 'lucide-react';

const PAGE_TITLES: Record<string, { label: string; color: string }> = {
  '/': { label: 'DASHBOARD', color: 'bg-[#FFC107]' },
  '/friends': { label: 'FRIENDS', color: 'bg-[#B3D4FF]' },
  '/tasks': { label: 'TASKS', color: 'bg-[#B3FFB3]' },
  '/testing': { label: 'TASKS', color: 'bg-[#B3FFB3]' },
  '/notes': { label: 'NOTES', color: 'bg-[#FFB3C1]' },
};

function getPageInfo(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const [prefix, info] of Object.entries(PAGE_TITLES)) {
    if (prefix !== '/' && pathname.startsWith(prefix)) return info;
  }
  return PAGE_TITLES['/'];
}

const TopBar = () => {
  const pathname = usePathname();
  const page = getPageInfo(pathname);

  return (
    <nav className="w-full font-sans antialiased">
      {/* Desktop TopBar */}
      <header className="hidden md:flex w-full bg-white border-b-[3px] border-black px-6 py-0 items-stretch">
        {/* Page Title with color accent */}
        <div className={`flex items-center gap-3 px-6 py-4 ${page.color} border-r-[3px] border-black -ml-6 mr-6`}>
          <Sparkles className="w-5 h-5 text-black" strokeWidth={2.5} />
          <h1 className="font-black text-base text-black tracking-wider">{page.label}</h1>
        </div>

        {/* Search */}
        <div className="flex-1 flex items-center max-w-lg">
          <div className="flex items-center w-full bg-[#FFFDF7] border-[3px] border-black px-4 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus-within:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus-within:translate-x-[1px] focus-within:translate-y-[1px] transition-all">
            <Search className="w-4 h-4 text-black mr-3 shrink-0" strokeWidth={3} />
            <label htmlFor="topbar-search" className="sr-only">Search</label>
            <input
              id="topbar-search"
              type="text"
              placeholder="Search anything..."
              className="bg-transparent outline-none w-full font-bold text-sm text-black placeholder:text-black/30 tracking-wide"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 ml-6">
          <button
            aria-label="Notifications"
            className="relative p-2.5 bg-[#B3D4FF] border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <Bell className="w-5 h-5 text-black" strokeWidth={2.5} />
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#FF4444] border-2 border-black flex items-center justify-center">
              <span className="font-black text-[8px] text-white">3</span>
            </span>
          </button>
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
              <button
                aria-label="Notifications"
                className="relative p-2 bg-white border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                <Bell className="w-4 h-4 text-black" strokeWidth={2.5} />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#FF4444] border border-black rounded-full" />
              </button>
              <div className="w-9 h-9 bg-[#FFB3C1] border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <span className="font-black text-sm text-black">A</span>
              </div>
            </div>
          </div>
          {/* Mobile Search */}
          <div className="flex items-center bg-white border-[3px] border-black px-3 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <Search className="w-4 h-4 text-black mr-2 shrink-0" strokeWidth={3} />
            <label htmlFor="mobile-topbar-search" className="sr-only">Search</label>
            <input
              id="mobile-topbar-search"
              type="text"
              placeholder="Search..."
              className="bg-transparent outline-none w-full font-bold text-sm text-black placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TopBar;