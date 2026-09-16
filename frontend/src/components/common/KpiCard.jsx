import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function KpiCard({ title, value, unit, trend, trendLabel, icon: Icon, severity, description, dark = false }) {
  const isCritical = severity === 'critical' || severity === 'danger';
  const numericTrend = typeof trend === 'number' ? trend : parseFloat(trend);
  const hasNumericTrend = !isNaN(numericTrend) && trend !== null && trend !== undefined;
  
  const isPositive = hasNumericTrend ? numericTrend > 0 : String(trend || '').startsWith('+');
  const isNegative = isCritical || (hasNumericTrend ? numericTrend < 0 : String(trend || '').startsWith('-'));

  const trendColor = isCritical || isNegative
    ? (dark ? 'text-rose-400' : 'text-[#EF4444]')
    : isPositive
    ? (dark ? 'text-[#84CC16]' : 'text-[#65A30D]')
    : (dark ? 'text-[#8FA866]' : 'text-[#7A8F59]');

  const sparklineColor = isCritical || isNegative
    ? 'text-[#EF4444]'
    : severity === 'warning'
    ? 'text-[#D97706]'
    : isPositive
    ? (dark ? 'text-[#84CC16]' : 'text-[#65A30D]')
    : (dark ? 'text-[#84CC16]' : 'text-[#5B7B10]');

  const formattedTrendValue = () => {
    if (hasNumericTrend) {
      return numericTrend > 0 ? `+${numericTrend.toFixed(1)}%` : `${numericTrend.toFixed(1)}%`;
    }
    return trend;
  };

  return (
    <div className={`p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group rounded-2xl ${
      dark 
        ? 'bg-[#172208] text-white border border-[#2D3F14] shadow-xl' 
        : 'agro-card'
    }`}>
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
        <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider truncate font-mono ${
          dark ? 'text-[#8FA866]' : 'text-[#6B7C4B]'
        }`}>
          {title}
        </span>
        {Icon && (
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-all border ${
            severity === 'critical' || severity === 'danger'
              ? (dark ? 'bg-rose-950/40 text-rose-400 border-rose-900' : 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white border-transparent')
              : severity === 'warning'
              ? (dark ? 'bg-amber-950/40 text-amber-400 border-amber-900' : 'bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white border-transparent')
              : (dark ? 'bg-[#1F2E0A] text-[#84CC16] border-[#2D3F14] group-hover:bg-[#84CC16] group-hover:text-[#172208]' : 'bg-[#5B7B10]/10 text-[#5B7B10] group-hover:bg-[#5B7B10] group-hover:text-white border-transparent')
          }`}>
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="mb-2">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className={`text-2xl sm:text-3xl font-extrabold font-['Outfit'] tracking-tight truncate ${
            dark ? 'text-white' : 'text-[#1F2E0A]'
          }`}>
            {value !== undefined && value !== null ? value : '—'}
          </span>
          {unit && <span className={`text-xs font-semibold ${dark ? 'text-[#8FA866]' : 'text-[#6B7C4B]'}`}>{unit}</span>}
        </div>
      </div>

      {/* Trend & Description */}
      <div className={`flex items-center justify-between pt-2 border-t text-xs ${
        dark ? 'border-[#2D3F14]' : 'border-[#5B7B10]/10'
      }`}>
        {trend !== undefined && trend !== null ? (
          <div className={`flex items-center gap-1 font-bold ${trendColor} text-[11px] sm:text-xs truncate`}>
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            ) : isNegative ? (
              <TrendingDown className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Minus className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{formattedTrendValue()}</span>
            {trendLabel && <span className={`font-normal truncate hidden xs:inline sm:inline ${dark ? 'text-[#8FA866]' : 'text-[#6B7C4B]'}`}>{trendLabel}</span>}
          </div>
        ) : (
          <span className={`text-[11px] sm:text-xs truncate ${dark ? 'text-[#8FA866]' : 'text-[#6B7C4B]'}`}>{description || 'Baseline Active'}</span>
        )}

        {/* Small Visual Sparkline Accent */}
        <div className="w-10 sm:w-12 h-3.5 sm:h-4 opacity-40 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
          <svg viewBox="0 0 40 12" className={`w-full h-full fill-none stroke-current stroke-[2] ${sparklineColor}`}>
            <path d={isNegative ? "M0,2 Q10,10 20,4 T40,11" : "M0,10 Q10,2 20,8 T40,1"} />
          </svg>
        </div>
      </div>
    </div>
  );
}
