import React from 'react';
import ReactECharts from 'echarts-for-react';

const DEFAULT_COLORS = ['#5B7B10', '#D97706', '#2563EB', '#DC2626', '#84CC16', '#7C3AED'];

export default function BarChart({
  data,
  xAxisKey,
  xKey,
  yKey,
  series = [],
  height = '290px',
  horizontal = false,
  title,
  barColor,
  showLabel = false,
  valueFormatter,
  enableZoom = true
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

  // Format metric value according to field context
  const formatMetricValue = (val, fieldName = '', seriesName = '') => {
    if (val == null || isNaN(val)) return '—';
    if (typeof valueFormatter === 'function') return valueFormatter(val);

    const nameLower = `${fieldName} ${seriesName}`.toLowerCase();

    if (nameLower.includes('price') || nameLower.includes('msp') || nameLower.includes('cost') || nameLower.includes('revenue')) {
      return `₹${Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })} / Qtl`;
    }
    if (nameLower.includes('arrival') || nameLower.includes('volume') || nameLower.includes('quintal') || nameLower.includes('qtl')) {
      return `${Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })} Qtl`;
    }
    if (nameLower.includes('rate') || nameLower.includes('percent') || nameLower.includes('%') || nameLower.includes('ratio')) {
      return `${Number(val).toFixed(1)}%`;
    }
    if (nameLower.includes('temp') || nameLower.includes('°c')) {
      return `${Number(val).toFixed(1)}°C`;
    }
    if (nameLower.includes('rain') || nameLower.includes('precipitation') || nameLower.includes('mm')) {
      return `${Number(val).toFixed(1)} mm`;
    }
    if (nameLower.includes('delay') || nameLower.includes('transit') || nameLower.includes('hour')) {
      return `${Number(val).toFixed(1)} hrs`;
    }
    if (nameLower.includes('risk') || nameLower.includes('score')) {
      return `${Number(val).toFixed(1)} / 100`;
    }

    if (typeof val === 'number') {
      if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
      if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(1)}k`;
      return Number(val).toLocaleString(undefined, { maximumFractionDigits: 1 });
    }
    return val;
  };

  // Build series options ensuring legend colors match bar colors 1:1
  const seriesColors = seriesConfigs.map((s, idx) => s.color || (Array.isArray(barColor) ? barColor[idx % barColor.length] : (typeof barColor === 'string' ? barColor : DEFAULT_COLORS[idx % DEFAULT_COLORS.length])));

  const seriesOptions = seriesConfigs.map((s, idx) => {
    const sColor = seriesColors[idx];
    return {
      name: s.label || s.field,
      type: 'bar',
      barMaxWidth: 28,
      itemStyle: {
        color: sColor,
        borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]
      },
      label: {
        show: showLabel || s.showLabel,
        position: horizontal ? 'right' : 'top',
        color: '#364E00',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'Outfit, sans-serif',
        formatter: (params) => formatMetricValue(params.value, s.field, s.label)
      },
      data: data.map((d) => d[s.field])
    };
  });

  const shouldRotate = !horizontal && categories.length > 4;

  const option = {
    backgroundColor: 'transparent',
    color: seriesColors,
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#FFFFFF',
      borderColor: '#E2E8F0',
      borderWidth: 1,
      padding: [10, 14],
      shadowBlur: 12,
      shadowColor: 'rgba(0, 0, 0, 0.08)',
      textStyle: { color: '#0F172A', fontSize: 12, fontFamily: 'Outfit, sans-serif' },
      formatter: (params) => {
        if (!params || params.length === 0) return '';
        const rawCategory = params[0].name || '';
        let html = `
          <div style="font-family: inherit; min-width: 190px;">
            <div style="font-weight: 700; color: #1E293B; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #F1F5F9; font-size: 12px;">
              ${rawCategory}
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
        `;
        params.forEach((p) => {
          const cfg = seriesConfigs.find((s) => (s.label || s.field) === p.seriesName) || {};
          const valFormatted = formatMetricValue(p.value, cfg.field, p.seriesName);
          const dotColor = typeof p.color === 'string' ? p.color : (p.color?.colorStops?.[0]?.color || '#5B7B10');
          html += `
            <div style="display: flex; justify-content: space-between; gap: 14px; align-items: center; font-size: 11px;">
              <span style="color: #64748B; display: flex; align-items: center; gap: 5px;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${dotColor};"></span>
                ${p.seriesName}:
              </span>
              <strong style="color: #0F172A; font-weight: 600;">${valFormatted}</strong>
            </div>
          `;
        });
        html += `</div></div>`;
        return html;
      }
    },
    legend: {
      top: 0,
      right: '2%',
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: '#475569', fontSize: 11, fontWeight: 500, fontFamily: 'Outfit, sans-serif' }
    },
    grid: {
      top: seriesConfigs.length > 1 ? 30 : 20,
      left: 10,
      right: horizontal && showLabel ? 65 : 15,
      bottom: !horizontal ? (shouldRotate ? 45 : 20) : 20,
      containLabel: true
    },
    [horizontal ? 'yAxis' : 'xAxis']: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: '#E2E8F0' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#475569',
        fontSize: 10,
        fontWeight: 500,
        interval: 0,
        rotate: shouldRotate ? 28 : 0,
        overflow: 'truncate',
        width: shouldRotate ? 80 : 100,
        ellipsis: '...'
      }
    },
    [horizontal ? 'xAxis' : 'yAxis']: {
      type: 'value',
      splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#64748B',
        fontSize: 10,
        formatter: (val) => formatMetricValue(val)
      }
    },
    series: seriesOptions
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} notMerge={true} />;
}
