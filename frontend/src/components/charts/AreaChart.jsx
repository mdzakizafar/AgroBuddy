import React from 'react';
import ReactECharts from 'echarts-for-react';

export default function AreaChart({ data, xAxisKey = 'date', seriesKey = 'arrival_qtl', height = '260px', color = '#84CC16', dark = false }) {
  if (!data || data.length === 0) return null;

  const xData = data.map((d) => d[xAxisKey]);
  const yData = data.map((d) => d[seriesKey]);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: dark ? '#1C270A' : '#FFFFFF',
      borderColor: dark ? 'rgba(132, 204, 22, 0.3)' : 'rgba(91, 123, 16, 0.2)',
      textStyle: { color: dark ? '#FFFFFF' : '#1F2E0A', fontSize: 12, fontFamily: 'Plus Jakarta Sans' },
      formatter: (params) => {
        const item = params[0];
        return `<div class="font-bold mb-1">${item.name}</div>
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full" style="background:${color}"></span>
                  <span>${item.value} Qtl</span>
                </div>`;
      }
    },
    grid: {
      top: 15,
      left: 10,
      right: 15,
      bottom: 25,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: xData,
      boundaryGap: false,
      axisLine: { lineStyle: { color: dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(91, 123, 16, 0.15)' } },
      axisLabel: { color: dark ? '#A3B882' : '#6B7C4B', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(91, 123, 16, 0.08)', type: 'dashed' } },
      axisLabel: { color: dark ? '#A3B882' : '#6B7C4B', fontSize: 10 },
    },
    series: [
      {
        name: 'Value',
        type: 'line',
        smooth: 0.45,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        lineStyle: {
          width: 3,
          color: color,
          shadowColor: color,
          shadowBlur: 10,
        },
        itemStyle: {
          color: color,
        },
        areaStyle: {
          opacity: 0.4,
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: color },
              { offset: 1, color: 'rgba(132, 204, 22, 0.0)' }
            ]
          }
        },
        data: yData,
      }
    ]
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} />;
}
