import React from 'react';
import ReactECharts from 'echarts-for-react';

export default function LineChart({
  data,
  xAxisKey = 'date',
  series = [],
  height = '280px',
  yAxisFormatter = null,
  dualAxis = false,
  yAxisName1 = '',
  yAxisName2 = '',
  yMin = null,
  yMax = null,
  yMin2 = null,
  yMax2 = null,
  yAxisFormatter1 = null,
  yAxisFormatter2 = null
}) {
  if (!data || data.length === 0) return null;

  const categories = data.map((d) => d[xAxisKey]);
  const defaultColors = ['#5B7B10', '#D97706', '#2563EB', '#DC2626'];
  const hasBars = series.some((s) => s.type === 'bar');

  const seriesOptions = series.map((s, idx) => {
    const sColor = s.color || defaultColors[idx % defaultColors.length];
    const sType = s.type || 'line';
    return {
      name: s.label || s.field,
      type: sType,
      smooth: sType === 'line' ? (s.smooth !== undefined ? s.smooth : 0.45) : undefined,
      symbol: sType === 'line' ? 'circle' : undefined,
      symbolSize: sType === 'line' ? (s.symbolSize || 5) : undefined,
      showSymbol: sType === 'line' ? (s.showSymbol ?? false) : undefined,
      yAxisIndex: s.yAxisIndex || 0,
      barWidth: sType === 'bar' ? (s.barWidth || '45%') : undefined,
      lineStyle: sType === 'line'
        ? {
            width: s.width || 3,
            type: s.lineType || 'solid',
            color: typeof sColor === 'string' ? sColor : (sColor.colorStops?.[0]?.color || '#5B7B10'),
            shadowColor: s.shadowColor !== undefined ? s.shadowColor : (s.shadowBlur ? (typeof sColor === 'string' ? sColor : '#5B7B10') : 'transparent'),
            shadowBlur: s.shadowBlur !== undefined ? s.shadowBlur : 0
          }
        : undefined,
      itemStyle: {
        color: sColor,
        borderRadius: sType === 'bar' ? (s.borderRadius || [4, 4, 0, 0]) : undefined
      },
      areaStyle: sType === 'line' && s.isArea
        ? {
            origin: s.areaOrigin || 'auto',
            opacity: s.areaOpacity !== undefined ? s.areaOpacity : 0.7,
            color: s.areaColor || {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: typeof sColor === 'string' ? sColor : '#5B7B10' },
                { offset: 1, color: 'rgba(255, 255, 255, 0.0)' }
              ]
            }
          }
        : undefined,
      data: data.map((d) => d[s.field])
    };
  });

  const yAxisConfig = dualAxis
    ? [
        {
          type: 'value',
          name: yAxisName1,
          min: yMin != null ? yMin : undefined,
          max: yMax != null ? yMax : undefined,
          nameTextStyle: { color: '#6B7C4B', fontSize: 10, fontWeight: 'bold' },
          splitLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.08)', type: 'dashed' } },
          axisLabel: {
            color: '#6B7C4B',
            fontSize: 10,
            formatter: yAxisFormatter1 || yAxisFormatter || undefined
          }
        },
        {
          type: 'value',
          name: yAxisName2,
          min: yMin2 != null ? yMin2 : undefined,
          max: yMax2 != null ? yMax2 : undefined,
          nameTextStyle: { color: '#6B7C4B', fontSize: 10, fontWeight: 'bold' },
          splitLine: { show: false },
          axisLabel: {
            color: '#6B7C4B',
            fontSize: 10,
            formatter: yAxisFormatter2 || undefined
          }
        }
      ]
    : {
        type: 'value',
        min: yMin != null ? yMin : undefined,
        max: yMax != null ? yMax : undefined,
        splitLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.08)', type: 'dashed' } },
        axisLabel: {
          color: '#6B7C4B',
          fontSize: 10,
          formatter: yAxisFormatter || undefined
        }
      };

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#FFFFFF',
      borderColor: 'rgba(91, 123, 16, 0.25)',
      textStyle: { color: '#1F2E0A', fontSize: 12, fontFamily: 'Plus Jakarta Sans' }
    },
    legend: { top: 0, textStyle: { color: '#526633', fontSize: 11, fontWeight: '600' } },
    grid: {
      top: 40,
      left: 10,
      right: dualAxis ? 30 : 15,
      bottom: 25,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: categories,
      boundaryGap: hasBars ? true : false,
      axisLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.15)' } },
      axisLabel: { color: '#6B7C4B', fontSize: 10 }
    },
    yAxis: yAxisConfig,
    series: seriesOptions
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} />;
}
