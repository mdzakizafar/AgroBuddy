import React from 'react';
import ReactECharts from 'echarts-for-react';

export default function LineChart({ data, xAxisKey = 'date', series = [], height = '280px' }) {
  if (!data || data.length === 0) return null;

  const categories = data.map((d) => d[xAxisKey]);
  const colors = ['#5B7B10', '#D97706', '#2563EB', '#DC2626'];

  const seriesOptions = series.map((s, idx) => ({
    name: s.label || s.field,
    type: 'line',
    smooth: 0.35,
    symbol: 'circle',
    symbolSize: 5,
    lineStyle: { width: 2.5, color: s.color || colors[idx % colors.length] },
    itemStyle: { color: s.color || colors[idx % colors.length] },
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
    legend: { top: 0, textStyle: { color: '#526633', fontSize: 11 } },
    grid: {
      top: 35,
      left: 10,
      right: 15,
      bottom: 25,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.15)' } },
      axisLabel: { color: '#6B7C4B', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.08)', type: 'dashed' } },
      axisLabel: { color: '#6B7C4B', fontSize: 10 }
    },
    series: seriesOptions
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} />;
}
