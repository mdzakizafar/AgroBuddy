import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Activity, ShieldAlert, Info } from 'lucide-react';
import { formatQtl } from '../../lib/formatters';

export default function MandiPerformanceMatrix({ mandis = [], onSelectMandi, height = '340px' }) {
  const chartOption = useMemo(() => {
    if (!mandis || mandis.length === 0) return {};

    const points = mandis.map((m) => {
      const p = m.price_pressure_score ?? 0;
      const l = m.logistics_delay_score ?? (m.logistics_delay_hours ? Math.min(100, m.logistics_delay_hours * 1.5) : 0);
      const vol = m.arrival_volume ?? 0;
      const risk = m.risk_score ?? 0;
      const level = (m.risk_level || 'Medium').toLowerCase();
      let color = '#15803D'; // Agro Forest Green for Low / Baseline Risk
      if (level === 'critical' || level === 'high' || risk >= 75) color = '#991B1B'; // Deep Bordeaux Cabernet for Critical Market Distress
      else if (level === 'medium' || level === 'warning' || risk >= 50) color = '#C2410C'; // Terracotta Ochre for Watchlist / Moderate Strain

      return {
        name: m.mandi_name,
        value: [p, l, vol, m.mandi_name, m.mandi_id, risk, m.risk_level || 'Medium', m],
        itemStyle: {
          color,
          borderColor: '#FFFFFF',
          borderWidth: 1.5,
          shadowBlur: 7,
          shadowColor: `${color}55`
        }
      };
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: '#FFFFFF',
        borderColor: 'rgba(91, 123, 16, 0.25)',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: '#1F2E0A', fontSize: 12, fontFamily: 'Outfit, sans-serif' },
        formatter: (params) => {
          const val = params.value;
          if (!val) return '';
          const [p, l, vol, name, id, risk, level, m] = val;
          const volFormatted = (vol / 1000).toFixed(1);
          const delayHrs = m.logistics_delay_hours ? `${m.logistics_delay_hours}h` : `${l}`;

          let badgeBg = '#FFEDD5';
          let badgeColor = '#9A3412';
          if (level.toLowerCase() === 'critical' || level.toLowerCase() === 'high') {
            badgeBg = '#FEE2E2';
            badgeColor = '#991B1B';
          } else if (level.toLowerCase() === 'low') {
            badgeBg = '#DCFCE7';
            badgeColor = '#166534';
          }

          return `
            <div style="font-family: Plus Jakarta Sans, sans-serif; min-width: 220px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="font-size: 13px; color: #1F2E0A;">${name}</strong>
                <span style="font-size: 10px; font-weight: 700; background: ${badgeBg}; color: ${badgeColor}; padding: 2px 6px; border-radius: 4px;">
                  ${level.toUpperCase()}
                </span>
              </div>
              <div style="font-size: 11px; color: #7A8F59; margin-bottom: 8px;">
                ${m.district || ''}${m.state ? `, ${m.state}` : ''}
              </div>

              <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
                <div style="display: flex; justify-content: space-between; gap: 12px;">
                  <span style="color: #526633;">Risk Score:</span>
                  <strong style="color: #1F2E0A;">${risk} / 100</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 12px;">
                  <span style="color: #DC2626; font-weight: 600;">Price Pressure:</span>
                  <strong style="color: #1F2E0A;">${p} / 100</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 12px;">
                  <span style="color: #D97706; font-weight: 600;">Logistics Delay:</span>
                  <strong style="color: #1F2E0A;">${l} / 100 (${delayHrs})</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 12px;">
                  <span style="color: #5B7B10; font-weight: 600;">Arrival Volume:</span>
                  <strong style="color: #1F2E0A;">${volFormatted}k Qtl</strong>
                </div>
              </div>

              <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed rgba(91, 123, 16, 0.2); text-align: center; font-size: 10px; color: #5B7B10; font-weight: 700;">
                Click point to inspect Mandi Detail Drawer &rarr;
              </div>
            </div>
          `;
        }
      },
      grid: {
        top: 35,
        left: 20,
        right: 25,
        bottom: 35,
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: 'Price Pressure →',
        nameLocation: 'middle',
        nameGap: 24,
        nameTextStyle: { color: '#6B7C4B', fontSize: 11, fontWeight: '700' },
        axisLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.2)' } },
        splitLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.08)', type: 'dashed' } },
        axisLabel: { color: '#6B7C4B', fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        name: 'Logistics Delay ↑',
        nameLocation: 'end',
        nameGap: 12,
        nameTextStyle: { color: '#6B7C4B', fontSize: 11, fontWeight: '700', align: 'left', padding: [0, 0, 8, -5] },
        axisLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.2)' } },
        splitLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.08)', type: 'dashed' } },
        axisLabel: { color: '#6B7C4B', fontSize: 10 }
      },
      series: [
        {
          name: 'Mandis',
          type: 'scatter',
          symbolSize: (data) => {
            const rawVol = data[2] || 10000;
            // Scale bubble size by volume between 11px and 30px
            const norm = Math.sqrt(rawVol) / 30;
            return Math.max(11, Math.min(30, Math.round(norm)));
          },
          emphasis: {
            focus: 'series',
            scale: true,
            itemStyle: {
              borderWidth: 2.5,
              borderColor: '#FFFFFF',
              shadowBlur: 14,
              shadowColor: 'rgba(0, 0, 0, 0.35)'
            }
          },
          data: points,
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { type: 'dashed', color: 'rgba(91, 123, 16, 0.2)', width: 1 },
            data: [
              { xAxis: 25, label: { show: false } },
              { yAxis: 25, label: { show: false } }
            ]
          }
        }
      ]
    };
  }, [mandis]);

  const onChartClick = (params) => {
    if (params.data && params.data.value) {
      const mandiObj = params.data.value[7];
      const mandiId = params.data.value[4];
      if (onSelectMandi) {
        onSelectMandi(mandiId, mandiObj);
      }
    }
  };

  return (
    <div className="agro-card p-5 space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#5B7B10]/15 pb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-2 font-['Outfit']">
              <Activity className="w-4 h-4 text-[#5B7B10]" />
              Mandi Performance Matrix
            </h3>
            <p className="text-xs text-[#6B7C4B] mt-0.5">
              X: Price Pressure Score | Y: Logistics Delay Score | Bubble Size: Arrival Volume | Color: Risk Level
            </p>
          </div>
        <span className="text-[10px] font-medium text-[#7A8F59] bg-[#F4F6EC] px-2.5 py-1 rounded-lg border border-[#5B7B10]/15">
          Click any node to inspect drawer
        </span>
      </div>

      {/* Legend Strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#526633] bg-[#F7F9F2] px-3 py-1.5 rounded-lg border border-[#5B7B10]/20">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#991B1B] inline-block" />
          <span className="font-semibold text-[#1F2E0A]">Critical Market Distress (&ge;75)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C2410C] inline-block" />
          <span className="font-semibold text-[#1F2E0A]">Moderate Strain / Watchlist (50–74)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#15803D] inline-block" />
          <span className="font-semibold text-[#1F2E0A]">Operational Baseline (&lt;50)</span>
        </div>
        <span className="text-[#A3B882] hidden sm:inline">|</span>
        <span className="text-[10px] text-[#7A8F59]">Bubble Size = Throughput (Qtl)</span>
      </div>

      {/* ECharts Scatter Plot */}
      <div className="w-full relative">
        <ReactECharts
          option={chartOption}
          notMerge={true}
          style={{ height, width: '100%' }}
          onEvents={{ click: onChartClick }}
        />
      </div>

      {/* Quadrant Legend Footnote */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-[#526633] pt-2 border-t border-[#5B7B10]/10">
        <div className="p-1.5 bg-[#FEF2F2] rounded-lg border border-red-200 text-red-900 font-semibold">
          Top-Right: Dual Stress (High Delay & Low Price)
        </div>
        <div className="p-1.5 bg-[#FFFBEB] rounded-lg border border-amber-200 text-amber-900 font-semibold">
          Bottom-Right: Price Distress Hotspot
        </div>
        <div className="p-1.5 bg-[#F4F6EC] rounded-lg border border-[#5B7B10]/20 text-[#364E00] font-semibold">
          Top-Left: Route Transit Bottleneck
        </div>
        <div className="p-1.5 bg-[#EBF0DC] rounded-lg border border-[#5B7B10]/30 text-[#1F2E0A] font-semibold">
          Bottom-Left: Balanced Operations
        </div>
      </div>
    </div>
  );
}
