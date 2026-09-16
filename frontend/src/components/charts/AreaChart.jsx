import React from 'react';
import ReactECharts from 'echarts-for-react';

export default function AreaChart({
  data,
  xAxisKey = 'date',
  seriesKey = 'arrival_qtl',
  series = null,
  height = '260px',
  color = '#84CC16',
  dark = false,
  valueFormatter
}) {
  if (!data || data.length === 0) return null;

  const xData = data.map((d) => d[xAxisKey]);

  const defaultFormatter = (val) => {
    if (typeof valueFormatter === 'function') return valueFormatter(val);
    if (typeof val === 'number') {
      if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + 'M';
      if (Math.abs(val) >= 1000) return (val / 1000).toFixed(0) + 'k';
      return val.toLocaleString();
    }
    return val;
  };

  let seriesConfigs = [];
  if (Array.isArray(series) && series.length > 0) {
    seriesConfigs = series.map((s, idx) => {
      const sColor = s.color || (idx === 0 ? color : '#364E00');
      const isArea = s.isArea !== false && s.type !== 'line';
      return {
        name: s.label || s.field,
        type: 'line',
        smooth: s.smooth ?? 0.5,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        lineStyle: {
          width: s.width || 3.5,
          type: s.lineType || 'solid',
          color: sColor,
          shadowColor: sColor,
          shadowBlur: 12
        },
        itemStyle: { color: sColor },
        areaStyle: isArea
          ? {
              opacity: s.opacity || 0.4,
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: sColor },
                  { offset: 1, color: 'rgba(132, 204, 22, 0.0)' }
                ]
              }
            }
          : undefined,
        data: data.map((d) => d[s.field])
      };
    });
  } else {
    seriesConfigs = [
      {
        name: 'Daily Arrivals',
        type: 'line',
        smooth: 0.45,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        lineStyle: {
          width: 3,
          color: color,
          shadowColor: color,
          shadowBlur: 10
        },
        itemStyle: { color: color },
        areaStyle: {
          opacity: 0.35,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: color },
              { offset: 1, color: 'rgba(132, 204, 22, 0.0)' }
            ]
          }
        },
        data: data.map((d) => d[seriesKey])
      }
    ];
  }

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: dark ? '#1C270A' : '#FFFFFF',
      borderColor: dark ? 'rgba(132, 204, 22, 0.3)' : 'rgba(91, 123, 16, 0.2)',
      textStyle: { color: dark ? '#FFFFFF' : '#1F2E0A', fontSize: 12, fontFamily: 'Outfit, sans-serif' },
      formatter: (params) => {
        if (!params || params.length === 0) return '';
        const xVal = params[0].name;
        let html = `<div style="font-weight: 700; color: ${dark ? '#D9F99D' : '#364E00'}; margin-bottom: 4px; font-size: 13px; font-family: Outfit, sans-serif;">${xVal}</div>`;
        params.forEach((p) => {
          const valFormatted = defaultFormatter(p.value);
          html += `
            <div style="display: flex; justify-content: space-between; gap: 14px; align-items: center; margin-bottom: 2px; font-family: Outfit, sans-serif;">
              <span style="color: ${dark ? '#A3B882' : '#6B7C4B'}; font-size: 11px;">${p.seriesName}:</span>
              <strong style="color: ${dark ? '#84CC16' : '#5B7B10'}; font-size: 12px;">${valFormatted}</strong>
            </div>
          `;
        });
        return html;
      }
    },
    legend: {
      show: seriesConfigs.length > 1,
      top: 0,
      right: '2%',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: dark ? '#A3B882' : '#526633', fontSize: 11, fontFamily: 'Outfit, sans-serif', fontWeight: 500 }
    },
    grid: {
      top: seriesConfigs.length > 1 ? 32 : 16,
      left: 12,
      right: 16,
      bottom: 28,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xData,
      boundaryGap: false,
      axisLine: { lineStyle: { color: dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(91, 123, 16, 0.15)' } },
      axisLabel: {
        color: dark ? '#A3B882' : '#6B7C4B',
        fontSize: 10,
        interval: xData.length > 20 ? Math.floor(xData.length / 10) : 0,
        formatter: (val) => (val && val.length === 10 ? val.slice(5) : val)
      }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(91, 123, 16, 0.08)', type: 'dashed' } },
      axisLabel: {
        color: dark ? '#A3B882' : '#6B7C4B',
        fontSize: 10,
        formatter: (val) => defaultFormatter(val)
      }
    },
    series: seriesConfigs
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} />;
}
