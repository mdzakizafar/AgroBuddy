import React from 'react';
import ReactECharts from 'echarts-for-react';

const DEFAULT_COLORS = ['#5B7B10', '#D97706', '#2563EB', '#DC2626', '#84CC16', '#7C3AED'];

export default function LineChart({
  data,
  xAxisKey = 'date',
  series = [],
  height = '290px',
  yAxisFormatter = null,
  dualAxis = false,
  yAxisName1 = '',
  yAxisName2 = '',
  yMin = null,
  yMax = null,
  yMin2 = null,
  yMax2 = null,
  yAxisFormatter1 = null,
  yAxisFormatter2 = null,
  enableZoom = true,
  showLegend = true,
  dark = false
}) {
  if (!data || data.length === 0) return null;

  const categories = data.map((d) => {
    const val = d[xAxisKey];
    if (typeof val === 'string' && val.includes('-') && val.length === 10) {
      const parts = val.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${parts[2]} ${monthNames[mIdx] || parts[1]}`;
    }
    return val || '';
  });

  const rawDates = data.map((d) => d[xAxisKey]);
  const hasBars = series.some((s) => s.type === 'bar');

  // Format metric value according to field context
  const formatMetricValue = (val, fieldName = '', seriesName = '') => {
    if (val == null || isNaN(val)) return '—';
    if (typeof yAxisFormatter === 'function') return yAxisFormatter(val);

    const nameLower = `${fieldName} ${seriesName}`.toLowerCase();

    if (nameLower.includes('price') || nameLower.includes('msp') || nameLower.includes('cost')) {
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

  const palette = dark 
    ? ['#84CC16', '#38BDF8', '#F59E0B', '#34D399', '#A855F7', '#EC4899'] 
    : DEFAULT_COLORS;

  const seriesColors = series.map((s, idx) => {
    if (s.color) return typeof s.color === 'string' ? s.color : (s.color.colorStops?.[0]?.color || palette[idx % palette.length]);
    return palette[idx % palette.length];
  });

  const seriesOptions = series.map((s, idx) => {
    const sColor = seriesColors[idx];
    const sType = s.type || 'line';
    return {
      name: s.label || s.field,
      type: sType,
      smooth: sType === 'line' ? (s.smooth !== undefined ? s.smooth : 0.45) : undefined,
      symbol: sType === 'line' ? 'circle' : undefined,
      symbolSize: sType === 'line' ? (s.symbolSize || 4) : undefined,
      showSymbol: sType === 'line' ? (s.showSymbol ?? (data.length <= 15)) : undefined,
      yAxisIndex: s.yAxisIndex || 0,
      barWidth: sType === 'bar' ? (s.barWidth || '36%') : undefined,
      emphasis: {
        focus: 'series',
        itemStyle: {
          borderWidth: 2,
          borderColor: dark ? '#172208' : '#FFFFFF',
          shadowBlur: 10,
          shadowColor: typeof sColor === 'string' ? sColor : '#84CC16'
        }
      },
      lineStyle: sType === 'line'
        ? {
            width: s.width || 2.5,
            type: s.lineType || 'solid',
            color: sColor,
            shadowColor: dark ? (typeof sColor === 'string' ? `${sColor}40` : 'rgba(0,0,0,0.4)') : undefined,
            shadowBlur: dark ? 6 : undefined
          }
        : undefined,
      itemStyle: {
        color: sColor,
        borderRadius: sType === 'bar' ? (s.borderRadius || [4, 4, 0, 0]) : undefined
      },
      areaStyle: sType === 'line' && s.isArea
        ? {
            origin: s.areaOrigin || 'auto',
            opacity: s.areaOpacity !== undefined ? s.areaOpacity : (dark ? 0.22 : 0.15),
            color: s.areaColor || {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: sColor },
                { offset: 1, color: 'rgba(0, 0, 0, 0.0)' }
              ]
            }
          }
        : undefined,
      data: data.map((d) => d[s.field])
    };
  });

  const shouldRotate = false;

  const yAxisConfig = dualAxis
    ? [
        {
          type: 'value',
          name: yAxisName1,
          min: yMin != null ? yMin : undefined,
          max: yMax != null ? yMax : undefined,
          nameTextStyle: { color: dark ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: 'bold' },
          splitLine: { lineStyle: { color: dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(91, 123, 16, 0.08)', type: 'dashed' } },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: dark ? '#94A3B8' : '#64748B',
            fontSize: 10,
            formatter: yAxisFormatter1 || yAxisFormatter || ((v) => formatMetricValue(v))
          }
        },
        {
          type: 'value',
          name: yAxisName2,
          min: yMin2 != null ? yMin2 : undefined,
          max: yMax2 != null ? yMax2 : undefined,
          nameTextStyle: { color: dark ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: 'bold' },
          splitLine: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: dark ? '#94A3B8' : '#64748B',
            fontSize: 10,
            formatter: yAxisFormatter2 || ((v) => formatMetricValue(v))
          }
        }
      ]
    : {
        type: 'value',
        min: yMin != null ? yMin : undefined,
        max: yMax != null ? yMax : undefined,
        splitLine: { lineStyle: { color: dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(91, 123, 16, 0.08)', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: dark ? '#94A3B8' : '#64748B',
          fontSize: 10,
          formatter: yAxisFormatter || ((v) => formatMetricValue(v))
        }
      };

  const option = {
    backgroundColor: 'transparent',
    color: seriesColors,
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: dark ? '#172208' : '#FFFFFF',
      borderColor: dark ? '#2D3F14' : '#E2E8F0',
      borderWidth: 1,
      padding: [10, 14],
      shadowBlur: 14,
      shadowColor: dark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.08)',
      textStyle: { color: dark ? '#F8FAFC' : '#0F172A', fontSize: 12, fontFamily: 'Outfit, sans-serif' },
      formatter: (params) => {
        if (!params || params.length === 0) return '';
        const idx = params[0].dataIndex;
        const fullDate = rawDates[idx] || params[0].name || '';
        let html = `
          <div style="font-family: Outfit, sans-serif; min-width: 190px;">
            <div style="font-weight: 700; color: ${dark ? '#FFFFFF' : '#1E293B'}; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid ${dark ? '#2D3F14' : '#F1F5F9'}; font-size: 12px;">
              ${fullDate}
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
        `;
        params.forEach((p) => {
          const cfg = series.find((s) => (s.label || s.field) === p.seriesName) || {};
          const valFormatted = formatMetricValue(p.value, cfg.field, p.seriesName);
          const dotColor = typeof p.color === 'string' ? p.color : (p.color?.colorStops?.[0]?.color || '#84CC16');
          html += `
            <div style="display: flex; justify-content: space-between; gap: 14px; align-items: center; font-size: 11px;">
              <span style="color: ${dark ? '#CBD5E1' : '#64748B'}; display: flex; align-items: center; gap: 5px;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${dotColor};"></span>
                ${p.seriesName}:
              </span>
              <strong style="color: ${dotColor}; font-weight: 700;">${valFormatted}</strong>
            </div>
          `;
        });
        html += `</div></div>`;
        return html;
      }
    },
    legend: {
      show: showLegend,
      top: 0,
      right: '2%',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: dark ? '#CBD5E1' : '#475569', fontSize: 11, fontWeight: 500, fontFamily: 'Outfit, sans-serif' }
    },
    grid: {
      top: showLegend ? 32 : 16,
      left: 12,
      right: dualAxis ? 32 : 24,
      bottom: 14,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: categories,
      boundaryGap: hasBars ? true : false,
      axisLine: { lineStyle: { color: dark ? '#2D3F14' : '#E2E8F0' } },
      axisTick: { show: false },
      axisLabel: {
        color: dark ? '#94A3B8' : '#475569',
        fontSize: 10,
        fontWeight: 500,
        interval: Math.max(0, Math.floor(categories.length / 7)),
        rotate: 0,
        hideOverlap: true,
        showMinLabel: true,
        showMaxLabel: true
      }
    },
    yAxis: yAxisConfig,
    series: seriesOptions
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} notMerge={true} />;
}
