import React from 'react';
import { Search, Bell, User } from 'lucide-react';

const TopBar = () => {
  return (
    // The main header container with a thick bottom border
    <header className="w-full bg-white border-b-[3px] border-black px-4 py-3 md:px-6 md:py-4 flex items-center justify-between z-10 font-sans">
      
      {/* =========================================
          🔍 SEARCH BAR
          ========================================= */}
      <div className="flex items-center bg-[#F4F8FA] border-2 border-black px-4 py-2 w-full max-w-md mr-4">
        <Search className="w-5 h-5 text-black mr-3 shrink-0" strokeWidth={3} />
        <input
          type="text"
          placeholder="FIND FRIENDS..."
          // Using placeholder:text-slate-500 to style the placeholder text specifically
          className="bg-transparent outline-none w-full font-black text-sm text-black placeholder:text-[#5E6A78] tracking-wide"
        />
      </div>

      {/* =========================================
          ⚙️ RIGHT SIDE ACTIONS
          ========================================= */}
      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        
        {/* Language Toggle - Hidden on very small mobile screens to save space */}
        <button className="hidden sm:block px-3 py-2 bg-white border-2 border-black font-black text-xs md:text-sm text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
          EN / ID
        </button>

        {/* Notification Bell */}
        <button className="p-2 bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
          <Bell className="w-5 h-5 text-black" strokeWidth={2.5} />
        </button>

        {/* Profile Avatar Container (Peach Background, no shadow in your reference) */}
        <button className="w-10 h-10 bg-[#FFD1B3] border-2 border-black flex items-center justify-center overflow-hidden hover:opacity-90 transition-opacity">
          {/* I'm using a Lucide User icon as a fallback, but you can replace this with an actual <img src="..." /> tag later */}
          <div className="w-6 h-6 bg-white rounded-full border border-black flex items-center justify-center overflow-hidden">
            <User className="w-4 h-4 text-black" strokeWidth={2.5} />
          </div>
        </button>
        
      </div>
    </header>
  );
};

export default TopBar;