import React from 'react';
import { BarChart3, ArrowUpRight, PieChart, Layers } from 'lucide-react';
import { formatQtl } from '../../lib/formatters';

export default function MandiSupplyConcentration({ mandis = [], onSelectMandi, onViewAll }) {
  const displayMandis = mandis.slice(0, 5);
  const maxShare = displayMandis.length > 0 ? Math.max(...displayMandis.map((m) => m.share_percentage || 0)) : 10;
  
  // Calculate cumulative top 5 share
  const totalTop5Share = displayMandis.reduce((sum, m) => sum + (m.share_percentage || 0), 0);

  return (
    <div className="agro-card p-5 space-y-4 flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#5B7B10]" />
              Mandi Supply Concentration
            </h3>
            <p className="text-[11px] text-[#7A8F59] mt-0.5">
              Throughput concentration share (% of total state arrival volume)
            </p>
          </div>
          <span className="text-[10px] font-bold text-[#364E00] bg-[#F4F6EC] px-2.5 py-1 rounded-lg border border-[#5B7B10]/15">
            Top 5 Mandis
          </span>
        </div>

        {/* Top 5 Cumulative Insight Banner */}
        <div className="mt-3 p-2.5 bg-[#F4F6EC] rounded-xl border border-[#5B7B10]/15 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#84CC16] animate-pulse" />
            <span className="text-[11px] font-semibold text-[#1F2E0A]">
              Top 5 Hubs Process <strong className="text-[#364E00] font-extrabold">{totalTop5Share.toFixed(1)}%</strong> of State Output
            </span>
          </div>
          <div className="w-24 bg-[#EBF0DC] h-2 rounded-full overflow-hidden shrink-0 border border-[#5B7B10]/10">
            <div 
              className="h-full bg-gradient-to-r from-[#5B7B10] to-[#84CC16] rounded-full" 
              style={{ width: `${Math.min(100, totalTop5Share)}%` }}
            />
          </div>
        </div>

        {/* Horizontal Bars List */}
        <div className="space-y-2.5 pt-3">
          {displayMandis.map((m, idx) => {
            const share = m.share_percentage ?? 0;
            const barWidth = maxShare > 0 ? Math.max(6, Math.min(100, (share / maxShare) * 100)) : 10;
            const volumeFormatted = formatQtl(m.arrival_qtl);

            // Rank badge styles
            let rankBadgeClass = "bg-[#EBF0DC] text-[#364E00] border-[#5B7B10]/20";
            if (idx === 0) rankBadgeClass = "bg-amber-100 text-amber-900 border-amber-300 font-black shadow-2xs";
            else if (idx === 1) rankBadgeClass = "bg-slate-100 text-slate-800 border-slate-300 font-bold";
            else if (idx === 2) rankBadgeClass = "bg-orange-100 text-orange-900 border-orange-300 font-bold";

            return (
              <div
                key={m.mandi_id || idx}
                onClick={() => onSelectMandi && onSelectMandi(m.mandi_id)}
                className="group cursor-pointer rounded-xl p-2 transition-all duration-200 hover:bg-[#F6F8EF] hover:shadow-xs border border-transparent hover:border-[#5B7B10]/15"
                title={`${m.mandi_name}: ${share}% share (${volumeFormatted})`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#1F2E0A] mb-1.5">
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-5 h-5 rounded-md text-[10px] flex items-center justify-center border ${rankBadgeClass} shrink-0`}>
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <span className="group-hover:text-[#364E00] group-hover:underline truncate block">
                        {m.mandi_name}
                      </span>
                    </div>
                    {m.district && (
                      <span className="text-[10px] text-[#7A8F59] font-normal truncate hidden sm:inline">
                        ({m.district})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-[#526633] font-mono font-medium">
                      {volumeFormatted}
                    </span>
                    <span className="text-[11px] font-extrabold font-mono text-[#2A3B0F] bg-[#84CC16]/25 px-2 py-0.5 rounded-md border border-[#84CC16]/40">
                      {share.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar Track */}
                <div className="w-full bg-[#EBF0DC] h-2.5 rounded-full overflow-hidden p-0.5 border border-[#5B7B10]/10">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#5B7B10] via-[#7E9E1E] to-[#84CC16] group-hover:brightness-110 shadow-2xs"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Link */}
      <div className="pt-3 border-t border-[#5B7B10]/10 flex items-center justify-between text-xs">
        <span className="text-[10px] text-[#7A8F59]">
          Showing top 5 processing hubs
        </span>
        <button
          onClick={onViewAll}
          className="text-xs font-bold text-[#5B7B10] hover:text-[#364E00] flex items-center gap-1 transition-colors"
        >
          <span>View all mandis</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
