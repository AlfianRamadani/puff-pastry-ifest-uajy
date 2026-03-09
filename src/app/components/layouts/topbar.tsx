import React from 'react';
import { Search, Bell, User, ArrowLeft, UserPlus, ChevronDown, Briefcase } from 'lucide-react';

const TopBar = () => {
  return (
    <nav className="w-full font-sans antialiased">
      {/* =========================================
          DESKTOP VIEW
          ========================================= */}
      <header className="hidden md:flex w-full bg-white border-b-[3px] border-black px-6 py-4 items-center justify-between">
        
        {/* Fluid Search Bar */}
        <div className="flex-1 md:max-w-md lg:max-w-xl flex items-center bg-[#F4F8FA] border-2 border-black px-4 py-2 mr-10 transition-all">
          <Search className="w-5 h-5 text-black mr-3 shrink-0" strokeWidth={3} />
          <input
            type="text"
            placeholder="FIND FRIENDS..."
            className="bg-transparent outline-none w-full font-black text-sm text-black placeholder:text-[#5E6A78] tracking-wide"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 shrink-0">
          <button className="px-3 py-2 bg-white border-2 border-black font-black text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
            EN / ID
          </button>
          <button className="p-2 bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] transition-all">
            <Bell className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <div className="w-10 h-10 bg-[#FFD1B3] border-2 border-black flex items-center justify-center shrink-0">
            <div className="w-6 h-6 bg-white rounded-full border border-black flex items-center justify-center">
              <User className="w-4 h-4" strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </header>

      {/* =========================================
          MOBILE VIEW (Refined Proportions)
          ========================================= */}
      <div className="md:hidden w-full px-4 py-4">
        {/* Floating Card Container */}
        <div className="bg-white border-[3px] border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          
          {/* Header Row */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <ArrowLeft className="w-7 h-7 text-black stroke-[2.5px] cursor-pointer" />
              {/* Removed font-black, used font-semibold for a cleaner look */}
              <h1 className="text-2xl font-semibold text-black tracking-tight uppercase">
                Friends
              </h1>
            </div>
            
            {/* Reduced Yellow Add Friend Button */}
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-black translate-x-[3px] translate-y-[3px]" />
              <button className="relative bg-[#FFB800] border-[2.5px] border-black p-1.5 active:translate-x-[1.5px] active:translate-y-[1.5px] transition-transform">
                <UserPlus className="w-5 h-5 text-black stroke-[2.5px]" />
              </button>
            </div>
          </div>

          {/* Workspace Selector */}
          <div className="relative">
            <div className="absolute inset-0 bg-black translate-x-[4px] translate-y-[4px] rounded-2xl" />
            <div className="relative w-full bg-white border-[3px] border-black rounded-2xl p-2.5 flex items-center justify-between active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                {/* Scaled Icon Box */}
                <div className="w-10 h-10 bg-[#8FFFE1] border-[2px] border-black rounded-xl flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
                  <Briefcase className="w-5 h-5 text-black" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-black text-xs tracking-wide uppercase">
                  Personal Workspace
                </span>
              </div>
              <ChevronDown className="w-6 h-6 text-black stroke-[3px] mr-1" />
            </div>
          </div>

        </div>
      </div>
    </nav>
  );
};

export default TopBar;