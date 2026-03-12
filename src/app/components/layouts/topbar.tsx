"use client";

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Search, Bell, Sparkles, X, Users, CheckSquare, PenLine } from 'lucide-react';

const TopBar = ({ userName = "Herlambang" }) => {
  const pathname = usePathname();
  const initial = userName ? userName.charAt(0).toUpperCase() : "?";
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const pageConfigs = [
    { name: 'DASHBOARD', href: '/', bgColor: 'bg-[#FFC107]', icon: Sparkles },
    { name: 'FRIENDS', href: '/friends', bgColor: 'bg-[#8FFFE1]', icon: Users },
    { name: 'TASKS', href: '/tasks', aliases: ['/testing'], bgColor: 'bg-[#B4F8C8]', icon: CheckSquare },
    { name: 'NOTES', href: '/notes', bgColor: 'bg-[#FFA6D6]', icon: PenLine },
  ];

  // Mencari konfigurasi halaman yang sedang aktif berdasarkan URL
  const activePage = pageConfigs.find(page => 
    page.href === '/' 
      ? pathname === '/' 
      : pathname.startsWith(page.href) || 
        (page.aliases && page.aliases.some(alias => pathname.startsWith(alias)))
  ) || pageConfigs[0]; // Default ke Dashboard jika tidak ditemukan

  const ActiveIcon = activePage.icon;

  return (
    <nav className="w-full h-16 md:h-20 bg-white border-b-[3px] border-black flex items-center justify-between font-sans antialiased relative z-20">
      
      {isMobileSearchOpen && (
        <div className="absolute inset-0 z-30 bg-white flex items-center px-4 md:hidden">
          <div className="flex-1 flex items-center bg-white border-[3px] border-black px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Search className="w-5 h-5 text-black mr-2 shrink-0" strokeWidth={3} />
            <input
              type="text"
              autoFocus
              placeholder="Search anything..."
              className="bg-transparent outline-none w-full font-bold text-sm text-black placeholder:text-gray-400"
            />
          </div>
          <button 
            onClick={() => setIsMobileSearchOpen(false)}
            className="ml-3 bg-[#FFC107] border-[3px] border-black p-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          >
            <X className="w-5 h-5 text-black" strokeWidth={3} />
          </button>
        </div>
      )}

      <div className={`flex items-center h-full ${isMobileSearchOpen ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Menu Aktif (Warna, Ikon, dan Teks Berubah Otomatis) */}
        <div className={`flex h-full items-center justify-center border-r-[3px] border-black px-4 lg:px-6 gap-0 xl:gap-3 transition-colors duration-300 ${activePage.bgColor}`}>
          <ActiveIcon className="w-5 h-5 text-black shrink-0" strokeWidth={2.5} />
          <span className="hidden xl:block font-black text-sm text-black tracking-wide uppercase">
            {activePage.name}
          </span>
        </div>

        {/* Search Bar Desktop */}
        <div className="hidden md:flex ml-4 lg:ml-6 items-center bg-white border-[3px] border-black px-4 py-2 w-56 lg:w-80 xl:w-[400px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-within:-translate-y-[1px] focus-within:-translate-x-[1px] transition-all">
          <Search className="w-5 h-5 text-black mr-3 shrink-0" strokeWidth={3} />
          <input
            type="text"
            placeholder="Search anything..."
            className="bg-transparent outline-none w-full font-bold text-sm text-black placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className={`flex items-center gap-3 md:gap-4 pr-3 md:pr-6 shrink-0 ${isMobileSearchOpen ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Tombol Search Mobile */}
        <button 
          onClick={() => setIsMobileSearchOpen(true)}
          className="md:hidden bg-white border-[2px] border-black p-1.5 hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
        >
          <Search className="w-4 h-4 text-black" strokeWidth={3} />
        </button>

        {/* Notifikasi */}
        <button className="relative bg-[#A3C4FF] border-[2px] md:border-[3px] border-black p-1.5 md:p-2 hover:bg-[#8eb6f8] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer">
          <Bell className="w-4 h-4 md:w-5 md:h-5 text-black" strokeWidth={2.5} />
          <div className="absolute -top-1 -right-1 md:-top-1.5 md:-right-1.5 w-3 h-3 md:w-3.5 md:h-3.5 bg-red-500 border-[2px] md:border-[2px] border-black rounded-full" />
        </button>

        {/* Profil User */}
        <button className="flex items-center bg-[#FFA6D6] border-[2px] md:border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer p-1 md:p-1.5 gap-0 lg:gap-3">
          <div className="bg-[#FFC107] border-[2px] border-black w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-sm">
            <span className="font-black text-xs md:text-sm text-black">{initial}</span>
          </div>
          <div className="hidden lg:flex pr-2 items-center justify-center">
            <span className="font-black text-sm text-black tracking-wide uppercase">{userName}</span>
          </div>
        </button>

      </div>
      
    </nav>
  );
};

export default TopBar;