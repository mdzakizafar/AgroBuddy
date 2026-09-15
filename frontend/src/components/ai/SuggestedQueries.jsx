import React, { useState } from 'react';
import { HelpCircle, ArrowRight, TrendingUp, DollarSign, Truck, Sparkles, BookOpen } from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Queries', icon: Sparkles },
  { id: 'pricing', label: 'Price & MSP', icon: DollarSign },
  { id: 'supply', label: 'Arrivals & Volume', icon: TrendingUp },
  { id: 'logistics', label: 'Logistics & Weather', icon: Truck },
  { id: 'risk', label: 'Risk & Strategy', icon: BookOpen }
];

const SUGGESTIONS = [
  // Pricing & MSP
  { text: 'Which crops have the highest percentage of sales below MSP?', category: 'pricing' },
  { text: 'Show Wheat modal price versus MSP over time.', category: 'pricing' },
  { text: 'Which mandis have the largest gap between modal price and MSP for Wheat?', category: 'pricing' },
  { text: 'Which mandis show a supply glut with rising arrivals and falling prices?', category: 'pricing' },
  { text: 'Which crop is facing the most severe market pressure?', category: 'pricing' },
  // Supply & Volume
  { text: 'Plot the daily arrival trend of Wheat in Amritsar mandi for the last 30 days.', category: 'supply' },
  { text: 'Compare Wheat, Rice and Maize arrivals over the last 30 days.', category: 'supply' },
  { text: 'Which 5 mandis received the highest crop arrivals?', category: 'supply' },
  { text: 'How do registered farmers correlate with crop arrivals across mandis?', category: 'supply' },
  { text: 'Which crop has the highest arrival volatility?', category: 'supply' },
  // Logistics & Weather
  { text: 'Which 5 mandis have the worst logistics delays?', category: 'logistics' },
  { text: 'Show average transit time trend over the last 30 days.', category: 'logistics' },
  { text: 'Which transport routes are the most severe bottlenecks?', category: 'logistics' },
  { text: 'How does distance affect transit time across warehouse routes?', category: 'logistics' },
  { text: 'Which sensor locations have the highest heatwave frequency?', category: 'logistics' },
  { text: 'Show daily average temperature and rainfall trends over time.', category: 'logistics' },
  // Risk & Strategy
  { text: 'Which 5 mandis have the highest operational risk?', category: 'risk' },
  { text: 'How does operational risk score compare to logistics risk across top mandis?', category: 'risk' },
  { text: 'Rank mandis by urgent intervention priority.', category: 'risk' },
  { text: 'Tell me about Karnal mandi', category: 'risk' }
];

export default function SuggestedQueries({ onSelectQuery }) {
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = activeCategory === 'all'
    ? SUGGESTIONS
    : SUGGESTIONS.filter((s) => s.category === activeCategory);

  return (
    <div className="space-y-3 sm:space-y-3.5">
      {/* Category Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-[#526633] uppercase tracking-wider">
          <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#5B7B10]" />
          <span>Suggested Inquiries:</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#5B7B10] text-white shadow-sm'
                    : 'bg-white text-[#5B7B10] hover:bg-[#F4F6EC] border border-[#5B7B10]/20'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Query Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
        {filtered.map((q, idx) => (
          <button
            key={idx}
            onClick={() => onSelectQuery(q.text)}
            className="agro-card p-2.5 sm:p-3 text-left text-xs font-semibold text-[#1F2E0A] hover:border-[#5B7B10] hover:bg-[#F4F6EC] flex items-center justify-between group transition-all cursor-pointer shadow-xs"
          >
            <span className="line-clamp-2">{q.text}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#5B7B10] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
          </button>
        ))}
      </div>
    </div>
  );
}
