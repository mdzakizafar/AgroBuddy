import React from 'react';
import { RotateCw, Bell, Calendar, Menu } from 'lucide-react';

export default function Header({ pageTitle, onRefresh, isRefreshing, onOpenMobileMenu }) {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <header className="bg-white/85 backdrop-blur-md border-b border-[#5B7B10]/10 px-3.5 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between gap-3 sticky top-0 z-30">
      {/* Left: Mobile Hamburger & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl bg-[#F4F6EC] hover:bg-[#E9EDDA] text-[#364E00] border border-[#5B7B10]/15 transition-all cursor-pointer shrink-0"
          aria-label="Open Navigation Menu"
          title="Open Menu"
        >
          <Menu className="w-5 h-5 text-[#5B7B10]" />
        </button>

        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold font-['Outfit'] text-[#1F2E0A] tracking-tight truncate">
            {pageTitle}
          </h2>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium text-[#6B7C4B] mt-0.5">
            <Calendar className="w-3.5 h-3.5 text-[#5B7B10] shrink-0" />
            <span className="text-[#1F2E0A] font-semibold">Dashboard: {currentDate}</span>
            <span className="text-[#364E00]/30">•</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E9EDDA] text-[#364E00] border border-[#5B7B10]/20">
              Data Available Through: 09 Sep 2026
            </span>
            <span className="text-[#364E00]/30 hidden md:inline">•</span>
            <span className="text-[#5B7B10] font-semibold hidden md:inline truncate">State Agriculture Command Center</span>
          </div>
        </div>
      </div>

      {/* Right Controls & User Info */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          className={`p-2 rounded-xl bg-[#F4F6EC] hover:bg-[#E9EDDA] text-[#364E00] border border-[#5B7B10]/15 transition-all cursor-pointer ${
            isRefreshing ? 'animate-spin text-[#5B7B10]' : ''
          }`}
          title="Refresh Data"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {/* Notifications Bell */}
        <button className="p-2 rounded-xl bg-[#F4F6EC] hover:bg-[#E9EDDA] text-[#364E00] border border-[#5B7B10]/15 relative transition-all cursor-pointer">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-[#EF4444] absolute top-1.5 right-1.5 ring-2 ring-white animate-pulse" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2 pl-1.5 sm:pl-2 border-l border-[#5B7B10]/15">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#5B7B10] text-white flex items-center justify-center font-bold text-xs shadow-md">
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