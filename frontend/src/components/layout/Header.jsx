import React from 'react';
import { Search, Mic, RotateCw, Bell, User, CloudSun, Calendar } from 'lucide-react';

export default function Header({ pageTitle, onRefresh, isRefreshing }) {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-[#5B7B10]/10 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
      {/* Page Title & Greeting */}
      <div>
        <h2 className="text-2xl font-bold font-['Outfit'] text-[#1F2E0A] tracking-tight flex items-center gap-2">
          {pageTitle}
        </h2>
        <div className="flex items-center gap-2 text-xs font-medium text-[#6B7C4B] mt-0.5">
          <Calendar className="w-3.5 h-3.5 text-[#5B7B10]" />
          <span>{currentDate}</span>
          <span className="text-[#364E00]/20">•</span>
          <span className="text-[#5B7B10] font-semibold">State Agriculture Command Center</span>
        </div>
      </div>

      {/* Center Search Bar (as shown in Mockup 1) */}
      <div className="flex-1 max-w-md hidden md:flex items-center relative">
        <Search className="w-4 h-4 text-[#7A8F59] absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          placeholder="Search crop, mandi, district or ask a query..."
          className="w-full bg-[#F4F6EC] border border-[#5B7B10]/15 rounded-full pl-10 pr-10 py-2 text-xs text-[#1F2E0A] placeholder-[#7A8F59] focus:outline-none focus:ring-2 focus:ring-[#5B7B10]/30 transition-all"
        />
        <button className="absolute right-3 text-[#7A8F59] hover:text-[#364E00] transition-colors">
          <Mic className="w-4 h-4" />
        </button>
      </div>

      {/* Right Controls & User Info */}
      <div className="flex items-center gap-3">
        {/* Weather Mini Indicator (from Mockup 1) */}
        <div className="hidden lg:flex items-center gap-2 bg-[#F4F6EC] px-3 py-1.5 rounded-full border border-[#5B7B10]/15 text-xs text-[#2A3B0F] font-semibold">
          <CloudSun className="w-4 h-4 text-[#EAB308]" />
          <span>+22°C Regional Weather</span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          className={`p-2 rounded-xl bg-[#F4F6EC] hover:bg-[#E9EDDA] text-[#364E00] border border-[#5B7B10]/15 transition-all ${
            isRefreshing ? 'animate-spin text-[#5B7B10]' : ''
          }`}
          title="Refresh Data"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {/* Notifications Bell */}
        <button className="p-2 rounded-xl bg-[#F4F6EC] hover:bg-[#E9EDDA] text-[#364E00] border border-[#5B7B10]/15 relative transition-all">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-[#EF4444] absolute top-1.5 right-1.5 ring-2 ring-white animate-pulse" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#5B7B10]/15">
          <div className="w-8 h-8 rounded-full bg-[#5B7B10] text-white flex items-center justify-center font-bold text-xs shadow-md">
            AB
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-[#1F2E0A] leading-tight">Board Admin</p>
            <p className="text-[10px] text-[#7A8F59]">Punjab Mandi Board</p>
          </div>
        </div>
      </div>
    </header>
  );
}
