"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, CheckSquare, PenLine, ChevronDown } from 'lucide-react';

const Sidebar = () => {
  const pathname = usePathname();

  const navItems = [
    { name: 'HOME', icon: Home, href: '/' },
    { name: 'FRIENDS', icon: Users, href: '/friends' },
    { name: 'TASKS', icon: CheckSquare, href: '/tasks', aliases: ['/testing'] },
    { name: 'NOTES', icon: PenLine, href: '/notes' },
  ];

  return (
    <>
     {/* =========================================
          📱 MOBILE NAVIGATION (Bottom Bar)
          ========================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full flex z-50 font-sans transition-all
        /* UNDER 400px: Slim height, white background, soft shadow, no top/bottom black borders */
        h-16 bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]
        /* 400px AND UP: Thicker height, black background for borders, chunky top/bottom borders */
        min-[400px]:h-20 min-[400px]:bg-black min-[400px]:border-t-[3px] min-[400px]:border-b-[3px] min-[400px]:border-black min-[400px]:shadow-none
      ">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href) ||
                (item.aliases && item.aliases.some((alias) => pathname.startsWith(alias)));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 transition-all
                /* 400px AND UP: Add the chunky right borders between items */
                min-[400px]:border-r-[3px] min-[400px]:border-black min-[400px]:last:border-r-0
                ${isActive ? 'bg-[#FFC107]' : 'bg-white hover:bg-gray-50 min-[400px]:hover:bg-white'}
              `}
            >
              <item.icon 
                className="mb-1 text-black shrink-0 transition-all
                  /* UNDER 400px: Smaller icon */
                  w-4 h-4
                  /* 400px AND UP: Larger icon */
                  min-[400px]:w-5 min-[400px]:h-5
                " 
                strokeWidth={2} 
              />
              
              <span className="font-medium text-black uppercase tracking-wide whitespace-nowrap transition-all
                /* UNDER 400px: Smaller text */
                text-[9px]
                /* 400px AND UP: Larger text */
                min-[400px]:text-[10px]
              ">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* =========================================
          💻 DESKTOP NAVIGATION (Side Bar)
          ========================================= */}
      <div className="hidden md:flex flex-col w-64 min-h-screen bg-[#2D3E50] p-6 font-sans">
        {/* Workspace Selector */}
        <div className="relative mb-12">
          <div className="flex items-center justify-between bg-white border-2 border-black p-3 rounded-md shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="bg-[#FFC107] border-2 border-black w-10 h-10 flex items-center justify-center font-bold text-black rounded-sm">
                PW
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-black text-xs text-black">PERSONAL</span>
                <span className="text-[10px] text-gray-500 font-bold">WORKSPACE</span>
              </div>
            </div>
            <ChevronDown className="w-5 h-5 text-black" strokeWidth={3} />
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-6 w-full">
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href) ||
                  (item.aliases && item.aliases.some((alias) => pathname.startsWith(alias)));

            return (
              <Link key={item.name} href={item.href} className="group block">
                {isActive ? (
                  // Active State
                  <div className="flex items-center w-full gap-4 bg-white border-2 border-black p-4 rounded-sm shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] cursor-pointer">
                    <item.icon className="w-6 h-6 text-black" strokeWidth={2.5} />
                    <span className="font-black text-sm text-black tracking-wide">
                      {item.name}
                    </span>
                  </div>
                ) : (
                  // Inactive State
                  <div className="flex items-center w-full gap-4 p-4 cursor-pointer text-white hover:bg-white/10 rounded-sm transition-colors">
                    <item.icon className="w-6 h-6" strokeWidth={2.5} />
                    <span className="font-black text-sm tracking-wide">
                      {item.name}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;