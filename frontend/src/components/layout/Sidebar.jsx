import React from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Coins, 
  Truck, 
  CloudSun, 
  ShieldAlert, 
  LineChart, 
  Bot, 
  Sprout, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'command-center', label: 'Command Center', icon: LayoutDashboard, path: '/command-center' },
  { id: 'supply', label: 'Supply Pulse', icon: TrendingUp, path: '/supply' },
  { id: 'prices', label: 'Farmer Price Watch', icon: Coins, path: '/prices' },
  { id: 'logistics', label: 'Logistics Command', icon: Truck, path: '/logistics' },
  { id: 'weather', label: 'Weather & Operations', icon: CloudSun, path: '/weather' },
  { id: 'risk', label: 'Mandi Risk', icon: ShieldAlert, path: '/risk' },
  { id: 'forecast', label: 'Forecast & Planning', icon: LineChart, path: '/forecast' },
  { id: 'ask-agrobuddy', label: 'Ask AgroBuddy', icon: Bot, path: '/ask-agrobuddy', badge: 'AI' },
];

export default function Sidebar({ activeTab, onTabChange }) {
  return (
    <aside className="w-64 bg-[#1C270A] text-white flex flex-col justify-between p-4 min-h-screen border-r border-[#364E00]/30 shadow-2xl relative z-20">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-[#364E00]/40">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#84CC16] to-[#5B7B10] flex items-center justify-center shadow-lg shadow-lime-950/40">
            <Sprout className="w-6 h-6 text-[#1C270A]" />
          </div>
          <div>
            <h1 className="font-['Outfit'] font-bold text-xl tracking-tight text-white flex items-center gap-1.5">
              AgroBuddy
              <span className="text-[10px] uppercase tracking-widest bg-[#84CC16]/20 text-[#84CC16] border border-[#84CC16]/30 px-1.5 py-0.5 rounded-full">v1.0</span>
            </h1>
            <p className="text-[11px] text-[#A3B882] font-medium">Mandi-to-Market Optimizer</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#5B7B10] text-white shadow-lg shadow-[#5B7B10]/30 border border-[#84CC16]/30 font-semibold translate-x-1'
                    : 'text-[#B5C99A] hover:bg-[#2A3B0F] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-[#D9F99D]' : 'text-[#84CC16]/70'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAB308] text-black uppercase tracking-wider flex items-center gap-0.5 shadow-sm">
                    <Sparkles className="w-2.5 h-2.5" />
                    {item.badge}
                  </span>
                ) : (
                  isActive && <ChevronRight className="w-4 h-4 text-[#D9F99D]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Box */}
      <div className="p-3.5 bg-[#25340D] rounded-xl border border-[#364E00]/60 text-xs text-[#A3B882] space-y-2 mt-6">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white">System Status</span>
          <span className="flex items-center gap-1 text-[11px] text-[#84CC16] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#84CC16] animate-ping" />
            LIVE
          </span>
        </div>
        <p className="text-[11px] leading-relaxed">
          56 Mandis connected • DuckDB Analytics Online
        </p>
      </div>
    </aside>
  );
}
