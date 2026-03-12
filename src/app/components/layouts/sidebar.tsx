"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, CheckSquare, PenLine, ChevronDown, Zap } from 'lucide-react';

const Sidebar = () => {
  const pathname = usePathname();

  // Menambahkan konfigurasi bgColor agar sinkron dengan TopBar
  const navItems = [
    { name: 'HOME', icon: Home, href: '/', bgColor: 'bg-[#FFC107]' },
    { name: 'FRIENDS', icon: Users, href: '/friends', bgColor: 'bg-[#8FFFE1]' },
    { name: 'TASKS', icon: CheckSquare, href: '/tasks', aliases: ['/testing'], bgColor: 'bg-[#B4F8C8]' },
    { name: 'NOTES', icon: PenLine, href: '/notes', bgColor: 'bg-[#FFA6D6]' },
  ];

  return (
    <>
      {/* =========================================
          📱 MOBILE NAVIGATION (Bottom Bar)
          ========================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full flex z-50 font-sans transition-all h-16 bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] min-[400px]:h-20 min-[400px]:bg-black min-[400px]:border-t-[3px] min-[400px]:border-b-[3px] min-[400px]:border-black min-[400px]:shadow-none">
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
              // Menggunakan item.bgColor saat aktif
              className={`flex flex-col items-center justify-center flex-1 transition-all min-[400px]:border-r-[3px] min-[400px]:border-black min-[400px]:last:border-r-0 ${isActive ? item.bgColor : 'bg-white hover:bg-gray-50 min-[400px]:hover:bg-white'}`}
            >
              <item.icon 
                className={`mb-1 shrink-0 transition-all w-4 h-4 min-[400px]:w-5 min-[400px]:h-5 ${isActive ? 'text-black' : 'text-gray-400'}`} 
                strokeWidth={2} 
              />
              <span className={`font-medium uppercase tracking-wide whitespace-nowrap transition-all text-[9px] min-[400px]:text-[10px] ${isActive ? 'text-black' : 'text-gray-400'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* =========================================
          💻 DESKTOP NAVIGATION (Side Bar)
          ========================================= */}
      <div className="hidden md:flex flex-col w-64 min-h-screen bg-white border-r-[3px] border-black font-sans z-10">
        
        {/* Workspace Selector Section */}
        <div className="p-5 border-b-[3px] border-black">
          <div className="flex items-center justify-between bg-[#FFC107] border-[3px] border-black p-2 rounded-sm cursor-pointer hover:bg-[#ffcd38] transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-3">
              <div className="bg-[#FFA6D6] border-[2px] border-black w-8 h-8 flex items-center justify-center rounded-sm">
                <Zap className="w-5 h-5 text-black fill-black" strokeWidth={2} />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-black text-xs text-black tracking-wide">PUFF PASTRY</span>
                <span className="text-[9px] text-black font-bold opacity-80">STUDY HUB</span>
              </div>
            </div>
            <ChevronDown className="w-5 h-5 text-black" strokeWidth={3} />
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-2 w-full p-5">
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href) ||
                  (item.aliases && item.aliases.some((alias) => pathname.startsWith(alias)));

            return (
              <Link key={item.name} href={item.href} className="group block">
                {isActive ? (
                  // Active State (Warna Background Dinamis)
                  <div className={`flex items-center justify-between w-full border-[3px] border-black px-4 py-3 rounded-sm cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-colors duration-300 ${item.bgColor}`}>
                    <div className="flex items-center gap-4">
                      <item.icon className="w-5 h-5 text-black" strokeWidth={2.5} />
                      <span className="font-black text-sm text-black tracking-wide">
                        {item.name}
                      </span>
                    </div>
                    <div className="w-2 h-2 bg-black rounded-full" />
                  </div>
                ) : (
                  // Inactive State
                  <div className="flex items-center w-full gap-4 px-4 py-3 cursor-pointer text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors rounded-sm">
                    <item.icon className="w-5 h-5" strokeWidth={2.5} />
                    <span className="font-bold text-sm tracking-wide">
                      {item.name}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Profile Section (Solid/Tidak Memudar) */}
        <div className="mt-auto border-t-2 border-gray-200 p-5 flex items-center gap-3 bg-white">
          <div className="bg-[#FFA6D6] border-[2px] border-black w-8 h-8 flex items-center justify-center rounded-sm">
            <Zap className="w-5 h-5 text-black fill-black" strokeWidth={2} />
          </div>
          <span className="font-black text-xs text-gray-500 tracking-wider">STUDENT</span>
        </div>
      </div>
    </>
  );
};

export default Sidebar;