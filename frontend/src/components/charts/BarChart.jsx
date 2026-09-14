import React from 'react';
import ReactECharts from 'echarts-for-react';

export default function BarChart({ data, xAxisKey, series = [], height = '260px', horizontal = false, title }) {
  if (!data || data.length === 0) return null;

  const categories = data.map((d) => d[xAxisKey]);

  const seriesOptions = series.map((s, idx) => ({
    name: s.label || s.field,
    type: 'bar',
    barMaxWidth: 24,
    itemStyle: {
      borderRadius: horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0],
      color: idx === 0 
        ? {
            type: 'linear',
            x: 0, y: 0, x2: horizontal ? 1 : 0, y2: horizontal ? 0 : 1,
            colorStops: [
              { offset: 0, color: '#EAB308' },
              { offset: 1, color: '#5B7B10' }
            ]
          }
        : {
            type: 'linear',
            x: 0, y: 0, x2: horizontal ? 1 : 0, y2: horizontal ? 0 : 1,
            colorStops: [
              { offset: 0, color: '#84CC16' },
              { offset: 1, color: '#364E00' }
            ]
          }
    },
    data: data.map((d) => d[s.field])
  }));

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#FFFFFF',
      borderColor: 'rgba(91, 123, 16, 0.2)',
      textStyle: { color: '#1F2E0A', fontSize: 12 }
    },
    legend: series.length > 1 ? { top: 0, textStyle: { color: '#526633', fontSize: 11 } } : undefined,
    grid: {
      top: series.length > 1 ? 30 : 15,
      left: 10,
      right: 15,
      bottom: 20,
      containLabel: true
    },
    [horizontal ? 'yAxis' : 'xAxis']: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.15)' } },
      axisLabel: { color: '#6B7C4B', fontSize: 10, interval: 0 }
    },
    [horizontal ? 'xAxis' : 'yAxis']: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.08)', type: 'dashed' } },
      axisLabel: { color: '#6B7C4B', fontSize: 10 }
    },
    series: seriesOptions
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} />;
}
