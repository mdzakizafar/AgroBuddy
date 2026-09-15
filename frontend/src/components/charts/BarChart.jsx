import React from 'react';
import ReactECharts from 'echarts-for-react';

export default function BarChart({
  data,
  xAxisKey,
  xKey,
  yKey,
  series = [],
  height = '260px',
  horizontal = false,
  title,
  barColor,
  showLabel = false,
  valueFormatter
}) {
  if (!data || data.length === 0) return null;

  const resolvedXKey = xAxisKey || xKey || 'name';
  const categories = data.map((d) => d[resolvedXKey]);

  let seriesConfigs = series;
  if ((!seriesConfigs || seriesConfigs.length === 0) && yKey) {
    seriesConfigs = [{ field: yKey, label: yKey }];
  } else if (!seriesConfigs || seriesConfigs.length === 0) {
    seriesConfigs = [{ field: 'val', label: 'Value' }];
  }

  const defaultFormatter = (val) => {
    if (typeof valueFormatter === 'function') return valueFormatter(val);
    if (typeof val === 'number') {
      if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + 'M';
      if (Math.abs(val) >= 1000) return (val / 1000).toFixed(0) + 'k';
      return val.toLocaleString();
    }
    return val;
  };

  const seriesOptions = seriesConfigs.map((s, idx) => ({
    name: s.label || s.field,
    type: 'bar',
    barMaxWidth: 26,
    label: {
      show: showLabel || s.showLabel,
      position: horizontal ? 'right' : 'top',
      color: '#364E00',
      fontSize: 10,
      fontWeight: 'bold',
      fontFamily: 'Plus Jakarta Sans',
      formatter: (params) => defaultFormatter(params.value)
    },
    itemStyle: {
      borderRadius: horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0],
      color: (params) => {
        const item = data[params.dataIndex];
        if (item && item.color) return item.color;
        if (typeof barColor === 'function') return barColor(params, item);
        if (Array.isArray(barColor)) return barColor[params.dataIndex % barColor.length];
        if (s.color || barColor) return s.color || barColor;
        return idx === 0
          ? {
              type: 'linear',
              x: 0,
              y: 0,
              x2: horizontal ? 1 : 0,
              y2: horizontal ? 0 : 1,
              colorStops: [
                { offset: 0, color: '#EAB308' },
                { offset: 1, color: '#5B7B10' }
              ]
            }
          : {
              type: 'linear',
              x: 0,
              y: 0,
              x2: horizontal ? 1 : 0,
              y2: horizontal ? 0 : 1,
              colorStops: [
                { offset: 0, color: '#84CC16' },
                { offset: 1, color: '#364E00' }
              ]
            };
      }
    },
    data: data.map((d) => d[s.field])
  }));

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#FFFFFF',
      borderColor: 'rgba(91, 123, 16, 0.25)',
      textStyle: { color: '#1F2E0A', fontSize: 12, fontFamily: 'Plus Jakarta Sans' },
      formatter: (params) => {
        if (!params || params.length === 0) return '';
        const categoryName = params[0].name;
        let html = `<div style="font-weight: 700; color: #364E00; margin-bottom: 4px; font-size: 13px;">${categoryName}</div>`;
        params.forEach((p) => {
          const valFormatted = defaultFormatter(p.value);
          html += `
            <div style="display: flex; justify-content: space-between; gap: 14px; align-items: center; margin-bottom: 2px;">
              <span style="color: #6B7C4B; font-size: 11px;">${p.seriesName}:</span>
              <strong style="color: #5B7B10; font-size: 12px;">${valFormatted}</strong>
            </div>
          `;
        });
        return html;
      }
    },
    legend:
      seriesOptions.length > 1
        ? { top: 0, textStyle: { color: '#526633', fontSize: 11 } }
        : undefined,
    grid: {
      top: seriesOptions.length > 1 ? 30 : 15,
      left: 10,
      right: horizontal && showLabel ? 65 : 20,
      bottom: 20,
      containLabel: true
    },
    [horizontal ? 'yAxis' : 'xAxis']: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.15)' } },
      axisLabel: { color: '#364E00', fontSize: 11, fontWeight: '600', interval: 0 }
    },
    [horizontal ? 'xAxis' : 'yAxis']: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.08)', type: 'dashed' } },
      axisLabel: {
        color: '#6B7C4B',
        fontSize: 10,
        formatter: (val) => defaultFormatter(val)
      }
    },
    series: seriesOptions
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} />;
}
