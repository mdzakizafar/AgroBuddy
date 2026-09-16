import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { PieChart, ArrowUpRight, BarChart3, TrendingUp } from 'lucide-react';
import { formatQtl } from '../../lib/formatters';

export default function MandiSupplyConcentration({ mandis = [], onSelectMandi, onViewAll, height = '230px', dark = false }) {
  const displayMandis = useMemo(() => {
    return (mandis || []).slice(0, 5);
  }, [mandis]);

  // Cumulative top 5 share
  const totalTop5Share = useMemo(() => {
    return displayMandis.reduce((sum, m) => sum + (m.share_percentage || 0), 0);
  }, [displayMandis]);

  // ECharts Horizontal Bar Option
  const chartOption = useMemo(() => {
    if (!displayMandis || displayMandis.length === 0) return {};

    // Reverse so #1 top mandi appears at the top of the horizontal bar chart
    const reversed = [...displayMandis].reverse();
    const categories = reversed.map((m) => {
      const short = (m.mandi_name || 'Mandi').replace(/APMC|Grain Market|Market|Mandi/gi, '').trim();
      return short || m.mandi_name;
    });
    const shares = reversed.map((m) => Number((m.share_percentage || 0).toFixed(1)));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: dark ? '#172208' : '#FFFFFF',
        borderColor: dark ? '#2D3F14' : '#E2E8F0',
        borderWidth: 1,
        padding: [10, 14],
        shadowBlur: 10,
        shadowColor: 'rgba(0, 0, 0, 0.25)',
        textStyle: { color: dark ? '#F8FAFC' : '#0F172A', fontSize: 12, fontFamily: 'Outfit, sans-serif' },
        axisPointer: { type: 'shadow', shadowStyle: { color: dark ? 'rgba(132, 204, 22, 0.08)' : 'rgba(91, 123, 16, 0.05)' } },
        formatter: (params) => {
          if (!params || params.length === 0) return '';
          const idx = params[0].dataIndex;
          const mandi = reversed[idx];
          if (!mandi) return '';

          return `
            <div style="font-family: Outfit, sans-serif; min-width: 190px;">
              <div style="font-weight: 700; font-size: 13px; color: ${dark ? '#FFFFFF' : '#1F2E0A'}; margin-bottom: 2px;">
                ${mandi.mandi_name}
              </div>
              <div style="font-size: 11px; color: ${dark ? '#8FA866' : '#7A8F59'}; margin-bottom: 6px;">
                ${mandi.district ? `${mandi.district}, ` : ''}${mandi.state || ''}
              </div>
              <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px; border-top: 1px dashed ${dark ? 'rgba(132,204,22,0.25)' : 'rgba(91,123,16,0.2)'}; padding-top: 6px;">
                <div style="display: flex; justify-content: space-between; gap: 12px;">
                  <span style="color: ${dark ? '#A3B882' : '#6B7C4B'};">Arrival Volume:</span>
                  <strong style="color: ${dark ? '#FFFFFF' : '#1F2E0A'};">${formatQtl(mandi.arrival_qtl)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 12px;">
                  <span style="color: #84CC16; font-weight: 600;">State Share:</span>
                  <strong style="color: ${dark ? '#84CC16' : '#2A3B0F'}; font-size: 12px;">${(mandi.share_percentage || 0).toFixed(1)}%</strong>
                </div>
              </div>
              <div style="margin-top: 6px; text-align: center; font-size: 10px; color: #84CC16; font-weight: 700;">
                Click to inspect mandi drawer &rarr;
              </div>
            </div>
          `;
        }
      },
      grid: {
        top: 10,
        left: 8,
        right: 46,
        bottom: 8,
        containLabel: true
      },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(91, 123, 16, 0.08)', type: 'dashed' } },
        axisLabel: {
          color: dark ? '#8FA866' : '#7A8F59',
          fontSize: 10,
          formatter: '{value}%'
        }
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: dark ? '#2D3F14' : '#E2E8F0' } },
        axisTick: { show: false },
        axisLabel: {
          color: dark ? '#E2E8F0' : '#1F2E0A',
          fontSize: 11,
          fontWeight: 600,
          fontFamily: 'Outfit, sans-serif'
        }
      },
      series: [
        {
          name: 'Market Share',
          type: 'bar',
          barWidth: 16,
          data: shares,
          itemStyle: {
            borderRadius: [0, 6, 6, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: '#5B7B10' },
                { offset: 1, color: '#84CC16' }
              ]
            }
          },
          emphasis: {
            itemStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [
                  { offset: 0, color: '#364E00' },
                  { offset: 1, color: '#A3E635' }
                ]
              },
              shadowBlur: 10,
              shadowColor: 'rgba(132, 204, 22, 0.5)'
            }
          },
          label: {
            show: true,
            position: 'right',
            color: dark ? '#A3E635' : '#364E00',
            fontSize: 11,
            fontWeight: 800,
            fontFamily: 'Outfit, sans-serif',
            formatter: '{c}%'
          }
        }
      ]
    };
  }, [displayMandis, dark]);

  const onChartClick = (params) => {
    if (params.dataIndex !== undefined) {
      const reversed = [...displayMandis].reverse();
      const selected = reversed[params.dataIndex];
      if (selected && onSelectMandi) {
        onSelectMandi(selected.mandi_id, selected);
      }
    }
  };

  return (
    <div className={`p-5 space-y-3.5 flex flex-col justify-between h-full rounded-2xl ${
      dark 
        ? 'bg-[#172208] text-white border border-[#2D3F14] shadow-xl' 
        : 'agro-card border-[#5B7B10]/20'
    }`}>
      <div>
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-3 ${dark ? 'border-[#2D3F14]' : 'border-[#5B7B10]/15'}`}>
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 font-['Outfit'] ${
              dark ? 'text-white' : 'text-[#364E00]'
            }`}>
              <PieChart className="w-4 h-4 text-[#84CC16]" />
              Supply Concentration
            </h3>
            <p className={`text-[11px] mt-0.5 ${dark ? 'text-[#8FA866]' : 'text-[#7A8F59]'}`}>
              Throughput concentration (% of state intake volume)
            </p>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border shrink-0 ${
            dark 
              ? 'text-[#84CC16] bg-[#22330D] border-[#2D3F14]' 
              : 'text-[#364E00] bg-[#F4F6EC] border-[#5B7B10]/15'
          }`}>
            Top 5 Hubs
          </span>
        </div>

        {/* Top 5 Cumulative Insight Banner */}
        <div className={`mt-3 p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
          dark 
            ? 'bg-[#1F2E0A] border-[#2D3F14]' 
            : 'bg-[#F4F6EC] border-[#5B7B10]/15'
        }`}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#84CC16] animate-pulse shrink-0 shadow-[0_0_6px_#84CC16]" />
            <span className={`text-[11px] font-semibold ${dark ? 'text-[#E2E8F0]' : 'text-[#1F2E0A]'}`}>
              Top 5 APMCs Process <strong className="text-[#84CC16] font-extrabold font-mono">{totalTop5Share.toFixed(1)}%</strong> of State Output
            </span>
          </div>
          <div className={`w-20 h-2 rounded-full overflow-hidden shrink-0 border ${
            dark ? 'bg-[#2D3F14] border-[#3E561C]' : 'bg-[#EBF0DC] border-[#5B7B10]/10'
          }`}>
            <div 
              className="h-full bg-gradient-to-r from-[#5B7B10] to-[#84CC16] rounded-full" 
              style={{ width: `${Math.min(100, totalTop5Share * 5)}%` }}
            />
          </div>
        </div>

        {/* Re-planned ECharts Horizontal Bar Graph */}
        <div className="pt-2 w-full">
          <ReactECharts
            option={chartOption}
            notMerge={true}
            style={{ height, width: '100%' }}
            onEvents={{ click: onChartClick }}
          />
        </div>
      </div>

      {/* Footer Link */}
      <div className={`pt-2 border-t flex items-center justify-between text-xs ${dark ? 'border-[#2D3F14]' : 'border-[#5B7B10]/10'}`}>
        <span className={`text-[10px] ${dark ? 'text-[#8FA866]' : 'text-[#7A8F59]'}`}>
          Click any bar to inspect mandi drawer
        </span>
        <button
          onClick={onViewAll}
          className={`text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
            dark ? 'text-[#84CC16] hover:text-[#A3E635]' : 'text-[#5B7B10] hover:text-[#364E00]'
          }`}
        >
          <span>View all mandis</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
