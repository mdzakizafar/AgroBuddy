import React from 'react';
import { HelpCircle, ArrowRight } from 'lucide-react';

const SUGGESTIONS = [
  "Which Mandis had wheat prices below MSP?",
  "Show wheat arrivals for the last 30 days.",
  "Which Mandis have increasing arrivals but prices below MSP?",
  "Which Mandis have the highest logistics delays?",
  "Compare Wheat and Rice arrivals across Mandis.",
  "Show the forecast for Wheat arrivals."
];

export default function SuggestedQueries({ onSelectQuery }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-[#526633] uppercase tracking-wider">
        <HelpCircle className="w-4 h-4 text-[#5B7B10]" />
        <span>Suggested Data Questions:</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {SUGGESTIONS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => onSelectQuery(q)}
            className="agro-card p-3 text-left text-xs font-semibold text-[#1F2E0A] hover:border-[#5B7B10] hover:bg-[#F4F6EC] flex items-center justify-between group transition-all"
          >
            <span className="line-clamp-2">{q}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#5B7B10] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
