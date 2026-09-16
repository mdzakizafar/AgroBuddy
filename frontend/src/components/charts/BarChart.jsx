import React from 'react';
import ReactECharts from 'echarts-for-react';

const DEFAULT_COLORS = ['#5B7B10', '#7E9E1E', '#D97706', '#364E00', '#84CC16', '#A3E635'];

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
  enableZoom = true,
  showLegend = null,
  dark = false
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

  const palette = dark 
    ? ['#84CC16', '#F59E0B', '#38BDF8', '#34D399', '#A3E635', '#E879F9'] 
    : ['#5B7B10', '#7E9E1E', '#D97706', '#364E00', '#84CC16', '#A3E635'];

  // Build series options ensuring legend colors match bar colors 1:1
  const seriesColors = seriesConfigs.map((s, idx) => s.color || (Array.isArray(barColor) ? barColor[idx % barColor.length] : (typeof barColor === 'string' ? barColor : palette[idx % palette.length])));

  const seriesOptions = seriesConfigs.map((s, idx) => {
    const sColor = seriesColors[idx];
    return {
      name: s.label || s.field,
      type: 'bar',
      barMaxWidth: 24,
      showBackground: dark,
      backgroundStyle: {
        color: dark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(91, 123, 16, 0.04)',
        borderRadius: horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]
      },
      itemStyle: {
        color: sColor,
        borderRadius: horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0],
        shadowColor: dark ? 'rgba(0, 0, 0, 0.4)' : undefined,
        shadowBlur: dark ? 6 : undefined
      },
      label: {
        show: showLabel || s.showLabel,
        position: horizontal ? 'right' : 'top',
        color: s.labelColor || (dark ? '#A3E635' : '#364E00'),
        fontSize: 11,
        fontWeight: 'bold',
        fontFamily: 'Outfit, sans-serif',
        formatter: (params) => formatMetricValue(params.value, s.field, s.label)
      },
      data: data.map((d) => {
        const val = d[s.field];
        const customColor = d.itemColor || d.color;
        if (customColor) {
          return {
            value: val,
            itemStyle: {
              color: customColor,
              borderRadius: horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]
            }
          };
        }
        return val;
      })
    };
  });

  const shouldRotate = !horizontal && categories.length > 4;
  const isLegendVisible = showLegend !== null ? showLegend : seriesConfigs.length > 1;

  const option = {
    backgroundColor: 'transparent',
    color: seriesColors,
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: dark ? '#172208' : '#FFFFFF',
      borderColor: dark ? '#2D3F14' : 'rgba(91, 123, 16, 0.2)',
      borderWidth: 1,
      padding: [10, 14],
      shadowBlur: 14,
      shadowColor: dark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(45, 65, 12, 0.08)',
      textStyle: { color: dark ? '#F8FAFC' : '#1F2E0A', fontSize: 12, fontFamily: 'Outfit, sans-serif' },
      formatter: (params) => {
        if (!params || params.length === 0) return '';
        const rawCategory = params[0].name || '';
        const rawItem = data[params[0].dataIndex];
        let html = `
          <div style="font-family: Outfit, sans-serif; min-width: 190px;">
            <div style="font-weight: 700; color: ${dark ? '#FFFFFF' : '#1F2E0A'}; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid ${dark ? '#2D3F14' : 'rgba(91, 123, 16, 0.12)'}; font-size: 12px;">
              ${rawCategory}
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
        `;
        params.forEach((p) => {
          const cfg = seriesConfigs.find((s) => (s.label || s.field) === p.seriesName) || {};
          const valFormatted = formatMetricValue(p.value, cfg.field, p.seriesName);
          const dotColor = rawItem?.itemColor || rawItem?.color || (typeof p.color === 'string' ? p.color : (p.color?.colorStops?.[1]?.color || p.color?.colorStops?.[0]?.color || '#5B7B10'));
          html += `
            <div style="display: flex; justify-content: space-between; gap: 14px; align-items: center; font-size: 11px;">
              <span style="color: ${dark ? '#CBD5E1' : '#6B7C4B'}; display: flex; align-items: center; gap: 5px;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${dotColor};"></span>
                ${p.seriesName}:
              </span>
              <strong style="color: ${dotColor}; font-weight: 700;">${valFormatted}</strong>
            </div>
          `;
        });
        if (rawItem?.mean_daily_arrival) {
          html += `
            <div style="display: flex; justify-content: space-between; gap: 14px; align-items: center; font-size: 11px; margin-top: 4px; border-top: 1px dashed ${dark ? 'rgba(132,204,22,0.2)' : 'rgba(91,123,16,0.15)'}; padding-top: 4px;">
              <span style="color: ${dark ? '#A3B882' : '#6B7C4B'};">Mean Daily:</span>
              <strong style="color: ${dark ? '#FFFFFF' : '#1F2E0A'}; font-weight: 600;">${Math.round(rawItem.mean_daily_arrival).toLocaleString()} Qtl/d</strong>
            </div>
          `;
        }
        if (rawItem?.std_daily_arrival) {
          html += `
            <div style="display: flex; justify-content: space-between; gap: 14px; align-items: center; font-size: 11px;">
              <span style="color: ${dark ? '#A3B882' : '#6B7C4B'};">Std Deviation:</span>
              <strong style="color: ${dark ? '#CBD5E1' : '#526633'}; font-weight: 600;">${Math.round(rawItem.std_daily_arrival).toLocaleString()} Qtl/d</strong>
            </div>
          `;
        }
        if (rawItem?.share_percent != null) {
          html += `
            <div style="display: flex; justify-content: space-between; gap: 14px; align-items: center; font-size: 11px; margin-top: 4px; border-top: 1px dashed ${dark ? 'rgba(132,204,22,0.2)' : 'rgba(91,123,16,0.15)'}; padding-top: 4px;">
              <span style="color: ${dark ? '#A3B882' : '#6B7C4B'};">Volume Share:</span>
              <strong style="color: ${dark ? '#84CC16' : '#364E00'}; font-weight: 600;">${Number(rawItem.share_percent).toFixed(1)}%</strong>
            </div>
          `;
        }
        html += `</div></div>`;
        return html;
      }
    },
    legend: {
      show: isLegendVisible,
      top: 0,
      right: '2%',
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: dark ? '#CBD5E1' : '#526633', fontSize: 11, fontWeight: 500, fontFamily: 'Outfit, sans-serif' }
    },
    grid: {
      top: isLegendVisible ? 32 : 16,
      left: 10,
      right: horizontal && (showLabel || seriesConfigs.some((s) => s.showLabel)) ? 65 : 15,
      bottom: !horizontal ? (shouldRotate ? 45 : 20) : 18,
      containLabel: true
    },
    [horizontal ? 'yAxis' : 'xAxis']: {
      type: 'category',
      data: categories,
      inverse: horizontal ? true : false,
      axisLine: { lineStyle: { color: dark ? '#2D3F14' : 'rgba(91, 123, 16, 0.18)' } },
      axisTick: { show: false },
      axisLabel: {
        color: dark ? '#F1F5F9' : '#1F2E0A',
        fontSize: 11,
        fontWeight: 600,
        interval: 0,
        rotate: shouldRotate ? 28 : 0,
        overflow: 'truncate',
        width: horizontal ? 105 : (shouldRotate ? 80 : 110),
        ellipsis: '...'
      }
    },
    [horizontal ? 'xAxis' : 'yAxis']: {
      type: 'value',
      splitLine: { lineStyle: { color: dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(91, 123, 16, 0.08)', type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: dark ? '#8FA866' : '#6B7C4B',
        fontSize: 10,
        fontFamily: 'Outfit, sans-serif',
        formatter: (val) => formatMetricValue(val)
      }
    },
    series: seriesOptions
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} notMerge={true} />;
}
