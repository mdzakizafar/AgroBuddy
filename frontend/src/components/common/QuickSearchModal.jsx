import React, { useState, useEffect } from 'react';
import { Search, Sprout, Building2, MapPin, ArrowRight, Bot, X, Sparkles } from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Check Wheat MSP Gap', icon: Sprout, tab: 'prices', filter: { crop: 'Wheat' } },
  { label: 'View Mandi Risk Rankings', icon: Building2, tab: 'risk' },
  { label: 'Analyze Logistics Delay Hours', icon: MapPin, tab: 'logistics' },
  { label: 'Ask AgroBuddy AI Assistant', icon: Bot, tab: 'ask-agrobuddy' },
];

const SEARCH_DATABASE = [
  { type: 'Mandi', title: 'Amritsar Grain Market', subtitle: 'Amritsar District • Major Wheat Hub', tab: 'command-center', mandi_id: 'MANDI001' },
  { type: 'Mandi', title: 'Patiala APMC Market', subtitle: 'Patiala District • Paddy & Cotton Market', tab: 'command-center', mandi_id: 'MANDI002' },
  { type: 'Crop', title: 'Wheat (Gehun)', subtitle: 'MSP ₹2,275 / Qtl • High arrival volume', tab: 'prices', crop: 'Wheat' },
  { type: 'Crop', title: 'Paddy / Rice (Dhan)', subtitle: 'MSP ₹2,183 / Qtl • Kharif harvest', tab: 'prices', crop: 'Rice' },
  { type: 'Crop', title: 'Maize (Makka)', subtitle: 'MSP ₹2,090 / Qtl • Feed industry demand', tab: 'prices', crop: 'Maize' },
  { type: 'District', title: 'Ludhiana District', subtitle: '12 Connected Mandis • Transit Corridor', tab: 'supply' },
  { type: 'District', title: 'Bathinda District', subtitle: 'High MSP Deficit Zone • Weather Alert Active', tab: 'weather' },
];

export default function QuickSearchModal({ isOpen, onClose, onSelectAction }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? onClose() : null;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredResults = query.trim()
    ? SEARCH_DATABASE.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
          item.type.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-sm animate-fade-in-up">
      <div
        className="bg-white border border-[#5B7B10]/20 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden agro-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#5B7B10]/15 gap-3 bg-[#F4F6EC]">
          <Search className="w-5 h-5 text-[#5B7B10]" />
          <input
            type="text"
            placeholder="Search crops, mandis, districts, or type AI prompt... (press ESC to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-sm text-[#1F2E0A] placeholder-[#7A8F59] font-medium focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[#7A8F59] hover:text-[#1F2E0A]">
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] font-bold px-2 py-1 bg-white rounded border border-[#5B7B10]/20 text-[#526633]">
            ESC
          </span>
        </div>

        {/* Content Body */}
        <div className="p-4 max-h-[380px] overflow-y-auto space-y-4">
          {/* Quick AI Query Suggestion if typing */}
          {query.trim() && (
            <button
              onClick={() => {
                onSelectAction('ask-agrobuddy', { query });
                onClose();
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-[#172208] to-[#2B3E10] text-white hover:opacity-95 transition-all shadow-md group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#84CC16]/20 text-[#84CC16]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    Ask AgroBuddy AI: <span className="text-[#84CC16] font-medium">"{query}"</span>
                  </p>
                  <p className="text-[10px] text-[#A3B882]">Generate instant analytical query visualization</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#84CC16] transition-transform group-hover:translate-x-1" />
            </button>
          )}

          {/* Search Results */}
          {query.trim() && filteredResults.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-[#7A8F59] uppercase tracking-wider px-1">
                Database Search Matches ({filteredResults.length})
              </p>
              {filteredResults.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onSelectAction(item.tab, { crop: item.crop, mandi_id: item.mandi_id });
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[#F4F6EC] text-left transition-colors border border-transparent hover:border-[#5B7B10]/15"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#5B7B10]/10 text-[#364E00] uppercase">
                      {item.type}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#1F2E0A]">{item.title}</p>
                      <p className="text-[11px] text-[#7A8F59]">{item.subtitle}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#7A8F59]" />
                </button>
              ))}
            </div>
          )}

          {/* Default Quick Actions */}
          {!query.trim() && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-[#7A8F59] uppercase tracking-wider px-1">
                Suggested Quick Actions
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {QUICK_ACTIONS.map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        onSelectAction(action.tab, action.filter);
                        onClose();
                      }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-[#5B7B10]/15 hover:border-[#5B7B10]/40 hover:bg-[#F4F6EC] text-left transition-all group"
                    >
                      <div className="p-2 rounded-lg bg-[#5B7B10]/10 text-[#5B7B10] group-hover:bg-[#5B7B10] group-hover:text-white transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-[#1F2E0A]">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-[#F6F8EF] border-t border-[#5B7B10]/15 flex items-center justify-between text-[11px] text-[#7A8F59]">
          <span className="flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-[#5B7B10]" /> AgroBuddy Dual Groq Intelligence Engine Active
          </span>
          <span>Tip: Press <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[9px] font-mono">Ctrl + K</kbd> anytime</span>
        </div>
      </div>
    </div>
  );
}
