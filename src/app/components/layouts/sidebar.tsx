"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, CheckSquare, PenLine, ChevronDown, Zap } from 'lucide-react';

const NAV_COLORS = {
  HOME: { active: "bg-[#FFC107]", dot: "bg-[#FFC107]" },
  FRIENDS: { active: "bg-[#B3D4FF]", dot: "bg-[#B3D4FF]" },
  TASKS: { active: "bg-[#B3FFB3]", dot: "bg-[#B3FFB3]" },
  NOTES: { active: "bg-[#FFB3C1]", dot: "bg-[#FFB3C1]" },
} as const;

const navItems = [
  { name: 'HOME' as const, icon: Home, href: '/' },
  { name: 'FRIENDS' as const, icon: Users, href: '/friends' },
  { name: 'TASKS' as const, icon: CheckSquare, href: '/tasks', aliases: ['/testing'] },
  { name: 'NOTES' as const, icon: PenLine, href: '/notes' },
];

const Sidebar = () => {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full flex z-50 h-18 bg-white border-t-[3px] border-black">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href) ||
                (item.aliases && item.aliases.some((a) => pathname.startsWith(a)));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 border-r-[3px] border-black last:border-r-0 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black ${
                isActive ? NAV_COLORS[item.name].active : 'bg-white hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-5 h-5 text-black mb-0.5" strokeWidth={2.5} />
              <span className="font-black text-xs text-black uppercase tracking-wider">
                {item.name}
              </span>
              {isActive && (
                <div className="w-1.5 h-1.5 bg-black rounded-full mt-0.5" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 min-h-screen bg-[#FFFDF7] border-r-[3px] border-black font-sans">
        {/* Brand */}
        <div className="p-5 border-b-[3px] border-black">
          <div className="flex items-center gap-3 bg-[#FFC107] border-[3px] border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
            <div className="bg-[#FFB3C1] border-2 border-black w-10 h-10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-black" strokeWidth={3} />
            </div>
            <div className="flex flex-col leading-tight flex-1">
              <span className="font-black text-sm text-black tracking-wide">PUFF PASTRY</span>
              <span className="font-bold text-xs text-black/50">STUDY HUB</span>
            </div>
            <ChevronDown className="w-5 h-5 text-black" strokeWidth={3} />
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex flex-col gap-2 p-4 flex-1">
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href) ||
                  (item.aliases && item.aliases.some((a) => pathname.startsWith(a)));

            return (
              <Link key={item.name} href={item.href} className="block outline-none focus-visible:ring-2 focus-visible:ring-[#FFC107]">
                <div className={`flex items-center gap-3 px-4 py-3 border-[3px] font-black text-sm uppercase tracking-wide transition-all ${
                  isActive
                    ? `${NAV_COLORS[item.name].active} border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black`
                    : 'border-transparent text-black/50 hover:text-black hover:bg-[#FFC107]/10 hover:border-black/10'
                }`}>
                  <item.icon className="w-5 h-5 shrink-0" strokeWidth={2.5} />
                  <span>{item.name}</span>
                  {isActive && <div className="ml-auto w-2 h-2 bg-black rounded-full" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t-[3px] border-black/10">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-[#FFB3C1] border-2 border-black flex items-center justify-center">
              <span className="font-black text-xs text-black">A</span>
            </div>
            <span className="font-bold text-xs text-black/40 uppercase tracking-wide">Student</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;