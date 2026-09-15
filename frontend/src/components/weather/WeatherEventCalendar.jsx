import React, { useState } from 'react';
import { Calendar, Flame, CloudRain, Info, ShieldAlert, Sparkles, AlertTriangle } from 'lucide-react';
import { formatTemp, formatRain } from '../../lib/formatters';

const ALL_MONTHS = [
  { key: '01', name: 'Jan', full: 'January' },
  { key: '02', name: 'Feb', full: 'February' },
  { key: '03', name: 'Mar', full: 'March' },
  { key: '04', name: 'Apr', full: 'April' },
  { key: '05', name: 'May', full: 'May' },
  { key: '06', name: 'Jun', full: 'June' },
  { key: '07', name: 'Jul', full: 'July' },
  { key: '08', name: 'Aug', full: 'August' },
  { key: '09', name: 'Sep', full: 'September' },
  { key: '10', name: 'Oct', full: 'October' },
  { key: '11', name: 'Nov', full: 'November' },
  { key: '12', name: 'Dec', full: 'December' },
];

export default function WeatherEventCalendar({ data = [], isLoading = false, totalSensors = 50 }) {
  const [selectedMonthKey, setSelectedMonthKey] = useState(null);

  // Map incoming calendar array by month name or month key
  const calendarMap = React.useMemo(() => {
    const map = {};
    if (Array.isArray(data)) {
      data.forEach((item) => {
        if (item.month) {
          map[item.month.toLowerCase()] = item;
        }
        if (item.month_key) {
          map[item.month_key] = item;
        }
      });
    }
    return map;
  }, [data]);

  const getMonthData = (m) => {
    return (
      calendarMap[m.name.toLowerCase()] ||
      calendarMap[`2026-${m.key}`] ||
      calendarMap[m.key] || {
        month: m.name,
        heatwave_days: 0,
        heatwave_events: 0,
        heavy_rain_days: 0,
        heavy_rain_events: 0,
        max_temperature_c: null,
        total_rainfall_mm: 0
      }
    );
  };

  const selectedMonthData = selectedMonthKey
    ? ALL_MONTHS.find((m) => m.key === selectedMonthKey)
    : null;
  const activeDetail = selectedMonthData ? getMonthData(selectedMonthData) : null;

  return (
    <div className="agro-card p-5 space-y-4 border-[#5B7B10]/20 shadow-sm bg-gradient-to-b from-white to-[#F9FAF4]">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#5B7B10]/15 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#5B7B10] text-white flex items-center justify-center shadow-sm">
            <Calendar className="w-4 h-4 text-[#D9F99D]" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2E0A]">
              Weather Event Calendar
            </h3>
            <p className="text-[11px] text-[#6B7C4B]">
              Monthly incident recurrence matrix tracking operational disruptions across {totalSensors} regional telemetry stations
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] text-[#6B7C4B] bg-[#F4F6EC] px-3 py-1.5 rounded-lg border border-[#5B7B10]/15">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] inline-block shadow-[0_0_6px_rgba(217,119,6,0.6)]" />
            <span className="font-semibold text-[#1F2E0A]">Heatwave Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] inline-block shadow-[0_0_6px_rgba(37,99,235,0.6)]" />
            <span className="font-semibold text-[#1F2E0A]">Heavy Rain Day</span>
          </div>
          <div className="flex items-center gap-1.5 text-stone-400">
            <span className="text-sm font-black leading-none">·</span>
            <span>Quiet / Normal</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid Matrix */}
      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#5B7B10]" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#5B7B10]/15">
                <th className="py-2.5 px-3 text-left font-bold text-[#1F2E0A] w-36 uppercase tracking-wider text-[11px]">
                  Disruption Type
                </th>
                {ALL_MONTHS.map((m) => {
                  const isSelected = selectedMonthKey === m.key;
                  return (
                    <th
                      key={m.key}
                      onClick={() =>
                        setSelectedMonthKey(selectedMonthKey === m.key ? null : m.key)
                      }
                      className={`py-2 px-1 text-center font-bold transition-all cursor-pointer rounded-t-lg ${
                        isSelected
                          ? 'bg-[#5B7B10] text-white shadow-sm'
                          : 'text-[#364E00] hover:bg-[#F4F6EC]'
                      }`}
                    >
                      <span className="block text-xs uppercase">{m.name}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#5B7B10]/10">
              {/* Heatwave Row */}
              <tr className="hover:bg-amber-50/40 transition-colors">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <Flame className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-[#1F2E0A] block text-xs">Heat</span>
                      <span className="text-[10px] text-amber-800/80">Heatwave Days</span>
                    </div>
                  </div>
                </td>
                {ALL_MONTHS.map((m) => {
                  const monthData = getMonthData(m);
                  const days = monthData.heatwave_days || 0;
                  const events = monthData.heatwave_events || 0;
                  const isSelected = selectedMonthKey === m.key;

                  // Determine dot style
                  let dotContent;
                  let cellBg = '';
                  if (days >= 20 || events >= 100) {
                    dotContent = (
                      <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[#D97706] shadow-[0_0_8px_rgba(217,119,6,0.6)]" />
                      </span>
                    );
                    cellBg = 'bg-amber-50/60';
                  } else if (days > 0) {
                    dotContent = (
                      <span className="inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                    );
                    cellBg = 'bg-amber-50/30';
                  } else {
                    dotContent = <span className="text-stone-300 font-black text-base">·</span>;
                  }

                  return (
                    <td
                      key={m.key}
                      onClick={() =>
                        setSelectedMonthKey(selectedMonthKey === m.key ? null : m.key)
                      }
                      title={`${m.full}: ${days} heatwave days (${events} total events)`}
                      className={`py-3 px-1 text-center cursor-pointer transition-all ${
                        isSelected ? 'bg-amber-100/70 ring-1 ring-amber-400' : cellBg
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center gap-1">
                        {dotContent}
                        {days > 0 && (
                          <span className="text-[9px] font-mono font-bold text-amber-900">
                            {days}d
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Heavy Rain Row */}
              <tr className="hover:bg-blue-50/40 transition-colors">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                      <CloudRain className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-[#1F2E0A] block text-xs">Rain</span>
                      <span className="text-[10px] text-blue-800/80">Heavy Rain Days</span>
                    </div>
                  </div>
                </td>
                {ALL_MONTHS.map((m) => {
                  const monthData = getMonthData(m);
                  const days = monthData.heavy_rain_days || 0;
                  const events = monthData.heavy_rain_events || 0;
                  const isSelected = selectedMonthKey === m.key;

                  // Determine dot style
                  let dotContent;
                  let cellBg = '';
                  if (days >= 20 || events >= 100) {
                    dotContent = (
                      <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[#2563EB] shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
                      </span>
                    );
                    cellBg = 'bg-blue-50/60';
                  } else if (days > 0) {
                    dotContent = (
                      <span className="inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
                    );
                    cellBg = 'bg-blue-50/30';
                  } else {
                    dotContent = <span className="text-stone-300 font-black text-base">·</span>;
                  }

                  return (
                    <td
                      key={m.key}
                      onClick={() =>
                        setSelectedMonthKey(selectedMonthKey === m.key ? null : m.key)
                      }
                      title={`${m.full}: ${days} heavy rain days (${events} total events)`}
                      className={`py-3 px-1 text-center cursor-pointer transition-all ${
                        isSelected ? 'bg-blue-100/70 ring-1 ring-blue-400' : cellBg
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center gap-1">
                        {dotContent}
                        {days > 0 && (
                          <span className="text-[9px] font-mono font-bold text-blue-900">
                            {days}d
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Interactive Detail Drawer when month is selected */}
      {activeDetail && selectedMonthData && (
        <div className="mt-3 p-3.5 bg-[#F4F6EC] border border-[#5B7B10]/20 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#5B7B10] text-white flex items-center justify-center font-bold text-sm shrink-0">
              {selectedMonthData.name}
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#1F2E0A] flex items-center gap-2">
                {selectedMonthData.full} 2026 Disruption Profile
                <span className="text-[10px] px-2 py-0.2 bg-[#5B7B10]/15 text-[#364E00] rounded-full font-semibold">
                  {totalSensors} Regional Sensors
                </span>
              </h4>
              <p className="text-[11px] text-[#6B7C4B] mt-0.5">
                Observed environmental pressure across unmapped regional telemetry stations
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white/80 p-2 rounded-lg border border-[#5B7B10]/10">
              <span className="text-[10px] text-amber-800 font-semibold flex items-center gap-1">
                <Flame className="w-3 h-3 text-[#D97706]" /> Heatwave Days
              </span>
              <p className="font-bold text-[#1F2E0A] text-sm mt-0.5">
                {activeDetail.heatwave_days || 0} <span className="text-[10px] text-gray-500">Days</span>
              </p>
              <span className="text-[9px] text-stone-500">{activeDetail.heatwave_events || 0} alerts</span>
            </div>

            <div className="bg-white/80 p-2 rounded-lg border border-[#5B7B10]/10">
              <span className="text-[10px] text-blue-800 font-semibold flex items-center gap-1">
                <CloudRain className="w-3 h-3 text-[#2563EB]" /> Heavy Rain Days
              </span>
              <p className="font-bold text-[#1F2E0A] text-sm mt-0.5">
                {activeDetail.heavy_rain_days || 0} <span className="text-[10px] text-gray-500">Days</span>
              </p>
              <span className="text-[9px] text-stone-500">{activeDetail.heavy_rain_events || 0} alerts</span>
            </div>

            <div className="bg-white/80 p-2 rounded-lg border border-[#5B7B10]/10">
              <span className="text-[10px] text-[#6B7C4B] font-semibold">Peak Temperature</span>
              <p className="font-bold text-[#1F2E0A] text-sm mt-0.5">
                {formatTemp(activeDetail.max_temperature_c)}
              </p>
              <span className="text-[9px] text-stone-500">Station high</span>
            </div>

            <div className="bg-white/80 p-2 rounded-lg border border-[#5B7B10]/10">
              <span className="text-[10px] text-[#6B7C4B] font-semibold">Precipitation</span>
              <p className="font-bold text-[#1F2E0A] text-sm mt-0.5">
                {formatRain(activeDetail.total_rainfall_mm)}
              </p>
              <span className="text-[9px] text-stone-500">Total volume</span>
            </div>
          </div>

          <button
            onClick={() => setSelectedMonthKey(null)}
            className="text-[11px] text-[#5B7B10] hover:text-[#364E00] font-bold underline shrink-0 self-start md:self-center"
          >
            Close Details
          </button>
        </div>
      )}
    </div>
  );
}
