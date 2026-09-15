import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { TrendingUp, Activity, Layers } from 'lucide-react';
import { formatQtl, formatCurrency } from '../../lib/formatters';

export default function SupplyMarketMovementChart({ data = [], height = '360px' }) {
  const chartOption = useMemo(() => {
    if (!data || data.length === 0) return {};

    const dates = data.map((d) => d.date);
    const arrivals = data.map((d) => d.daily_arrival_qtl ?? 0);
    const rolling7d = data.map((d) => d.rolling_7d_arrival_qtl ?? d.rolling_7d_arrival ?? d.daily_arrival_qtl ?? 0);
    const mspGaps = data.map((d) => d.avg_msp_gap ?? 0);

    return {
      backgroundColor: 'transparent',
      animation: true,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          lineStyle: { color: 'rgba(91, 123, 16, 0.4)', type: 'dashed' },
          label: { backgroundColor: '#5B7B10', color: '#FFFFFF', fontSize: 10 }
        },
        backgroundColor: '#FFFFFF',
        borderColor: 'rgba(91, 123, 16, 0.25)',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: '#1F2E0A', fontSize: 12, fontFamily: 'Plus Jakarta Sans, sans-serif' },
        formatter: (params) => {
          if (!params || params.length === 0) return '';
          const dateStr = params[0].axisValue;
          let arrivalVal = 0;
          let rollingVal = 0;
          let gapVal = 0;

          params.forEach((item) => {
            if (item.seriesName === 'Daily Arrivals') arrivalVal = item.value;
            if (item.seriesName === '7-Day Moving Avg') rollingVal = item.value;
            if (item.seriesName === 'Average MSP Gap') gapVal = item.value;
          });

          const gapStatus = gapVal > 0 
            ? `<span style="color: #DC2626; font-weight: 700;">+₹${Number(gapVal).toFixed(1)} / Qtl (Below MSP)</span>`
            : `<span style="color: #16A34A; font-weight: 700;">₹${Math.abs(Number(gapVal)).toFixed(1)} / Qtl (Above MSP)</span>`;

          return `
            <div style="font-family: Plus Jakarta Sans, sans-serif; min-width: 220px;">
              <div style="font-weight: 800; color: #1F2E0A; font-size: 13px; margin-bottom: 6px; border-bottom: 1px solid #ECEFE4; padding-bottom: 4px;">
                ${dateStr}
              </div>
              <div style="font-size: 11px; font-weight: 700; color: #5B7B10; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px;">
                Panel 1: Supply Inflow
              </div>
              <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 2px;">
                <span style="color: #6B7C4B;">Daily Arrival:</span>
                <strong style="color: #1F2E0A;">${Number(arrivalVal).toLocaleString()} Qtl</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px;">
                <span style="color: #6B7C4B;">7-Day Moving Avg:</span>
                <strong style="color: #364E00;">${Number(rollingVal).toLocaleString()} Qtl</strong>
              </div>
              <div style="font-size: 11px; font-weight: 700; color: #DC2626; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px; border-top: 1px dashed #ECEFE4; padding-top: 5px;">
                Panel 2: Market Floor Pressure
              </div>
              <div style="display: flex; justify-content: space-between; gap: 12px;">
                <span style="color: #6B7C4B;">Avg MSP Gap:</span>
                ${gapStatus}
              </div>
            </div>
          `;
        }
      },
      legend: {
        show: true,
        top: 0,
        right: 10,
        icon: 'roundRect',
        itemWidth: 14,
        itemHeight: 8,
        itemGap: 16,
        textStyle: { color: '#364E00', fontSize: 11, fontWeight: '600', fontFamily: 'Plus Jakarta Sans' },
        data: ['Daily Arrivals', '7-Day Moving Avg', 'Average MSP Gap']
      },
      axisPointer: {
        link: [{ xAxisIndex: 'all' }]
      },
      grid: [
        {
          left: 65,
          right: 30,
          top: 36,
          height: '46%',
          containLabel: false
        },
        {
          left: 65,
          right: 30,
          top: '64%',
          height: '26%',
          containLabel: false
        }
      ],
      xAxis: [
        {
          type: 'category',
          gridIndex: 0,
          data: dates,
          axisLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.2)' } },
          axisTick: { show: false },
          axisLabel: { show: false },
          splitLine: { show: false }
        },
        {
          type: 'category',
          gridIndex: 1,
          data: dates,
          axisLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.25)' } },
          axisTick: { lineStyle: { color: 'rgba(91, 123, 16, 0.2)' } },
          axisLabel: {
            color: '#6B7C4B',
            fontSize: 10,
            interval: Math.max(1, Math.floor(dates.length / 8)),
            formatter: (v) => {
              if (!v) return '';
              const parts = v.split('-');
              if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
              return v;
            }
          },
          splitLine: { show: false }
        }
      ],
      yAxis: [
        {
          type: 'value',
          gridIndex: 0,
          name: 'Daily Arrivals (Qtl)',
          nameLocation: 'end',
          nameTextStyle: { color: '#5B7B10', fontSize: 10, fontWeight: '700', padding: [0, 0, 4, 0] },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.08)', type: 'dashed' } },
          axisLabel: {
            color: '#6B7C4B',
            fontSize: 10,
            formatter: (val) => `${(val / 1000).toFixed(0)}k`
          }
        },
        {
          type: 'value',
          gridIndex: 1,
          name: 'MSP Gap (₹)',
          nameLocation: 'end',
          nameTextStyle: { color: '#DC2626', fontSize: 10, fontWeight: '700', padding: [0, 0, 4, 0] },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: 'rgba(220, 38, 38, 0.08)', type: 'dashed' } },
          axisLabel: {
            color: '#6B7C4B',
            fontSize: 10,
            formatter: (val) => `₹${val}`
          }
        }
      ],
      series: [
        // Panel 1: Daily Arrivals (Soft translucent bars)
        {
          name: 'Daily Arrivals',
          type: 'bar',
          xAxisIndex: 0,
          yAxisIndex: 0,
          barMaxWidth: 14,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#84CC16' },
                { offset: 1, color: 'rgba(132, 204, 22, 0.25)' }
              ]
            },
            borderRadius: [3, 3, 0, 0]
          },
          data: arrivals
        },
        // Panel 1: 7-day Moving Average (Solid dark olive line)
        {
          name: '7-Day Moving Avg',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color: '#364E00' },
          data: rolling7d
        },
        // Panel 2: Average MSP Gap (Crimson line with translucent gradient fill)
        {
          name: 'Average MSP Gap',
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: '#DC2626' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(220, 38, 38, 0.3)' },
                { offset: 1, color: 'rgba(220, 38, 38, 0.02)' }
              ]
            }
          },
          data: mspGaps
        }
      ]
    };
  }, [data]);

  const latestPoint = data[data.length - 1] || {};

  return (
    <div className="agro-card p-5 space-y-3">
      {/* Header with Title and Executive Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#5B7B10]/15 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#5B7B10]" />
              Supply & Market Movement
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#5B7B10]/15 text-[#364E00] flex items-center gap-1">
              <span>⭐</span> PRIMARY
            </span>
          </div>
          <p className="text-[11px] text-[#7A8F59] mt-0.5">
            Two coordinated panels: Daily Arrivals + 7-Day MA vs. Average MSP Gap (MSP − Modal Price)
          </p>
        </div>

        {/* Quick Snapshot Pills */}
        <div className="flex items-center gap-2 text-xs">
          <div className="bg-[#F4F6EC] px-3 py-1 rounded-lg border border-[#5B7B10]/15">
            <span className="text-[10px] text-[#6B7C4B] block font-medium">Latest Daily Inflow</span>
            <span className="font-bold text-[#1F2E0A] font-mono">
              {latestPoint.daily_arrival_qtl ? `${formatQtl(latestPoint.daily_arrival_qtl)}` : '—'}
            </span>
          </div>
          <div className="bg-[#F4F6EC] px-3 py-1 rounded-lg border border-[#5B7B10]/15">
            <span className="text-[10px] text-[#6B7C4B] block font-medium">Market MSP Gap</span>
            <span className={`font-bold font-mono ${(latestPoint.avg_msp_gap ?? 0) > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
              {latestPoint.avg_msp_gap !== undefined ? formatCurrency(latestPoint.avg_msp_gap) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Synchronized Dual-Panel ECharts */}
      <div className="w-full relative">
        <ReactECharts
          option={chartOption}
          notMerge={true}
          style={{ height, width: '100%' }}
        />
      </div>

      {/* Footer Insight Context */}
      <div className="flex items-center justify-between text-[11px] text-[#6B7C4B] pt-1 border-t border-[#5B7B10]/10">
        <span>Dual panels synchronized on timeline: Hover to inspect paired volume and price gap dynamics</span>
        <span className="font-medium text-[#364E00]">Panel 1: Qtl &bull; Panel 2: ₹/Qtl</span>
      </div>
    </div>
  );
}
