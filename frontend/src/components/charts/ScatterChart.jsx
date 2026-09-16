import React from 'react';
import ReactECharts from 'echarts-for-react';

export default function ScatterChart({
  data = [],
  xKey = 'x',
  yKey = 'y',
  xName = 'X Axis',
  yName = 'Y Axis',
  xUnit = '',
  yUnit = '',
  pointColor = null,
  height = '280px',
  markLine = null,
  onPointClick,
  dark = false
}) {
  if (!data || data.length === 0) return null;

  const points = data.map((d) => [
    d[xKey] ?? d.x ?? 0,
    d[yKey] ?? d.y ?? 0,
    d.size ?? 10,
    d.mandiName || d.name || 'Mandi',
    d.mandiData ? { ...d.mandiData, pointColor: d.pointColor } : d
  ]);

  const defaultAxisFormatter = (val) => {
    if (typeof val === 'number') {
      if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + 'M';
      if (Math.abs(val) >= 1000) return (val / 1000).toFixed(0) + 'k';
      return val.toLocaleString();
    }
    return val;
  };

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: dark ? '#172208' : '#FFFFFF',
      borderColor: dark ? '#2D3F14' : 'rgba(91, 123, 16, 0.25)',
      borderWidth: 1,
      padding: [10, 14],
      shadowBlur: 12,
      shadowColor: dark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.08)',
      textStyle: { color: dark ? '#F8FAFC' : '#1F2E0A', fontSize: 12, fontFamily: 'Outfit, sans-serif' },
      formatter: (params) => {
        const [x, y, size, name, extra] = params.value;
        const xFormatted = Number(x).toLocaleString();
        const yFormatted = Number(y).toLocaleString();
        const xUnitStr = xUnit ? ` ${xUnit}` : '';
        const yUnitStr = yUnit
          ? ` ${yUnit}`
          : yName.toLowerCase().includes('%') || yName.toLowerCase().includes('rate')
          ? '%'
          : '';
        const districtStr = extra?.district ? `<span style="font-size: 11px; color: ${dark ? '#8FA866' : '#7A8F59'}; margin-left: 6px;">(${extra.district})</span>` : '';
        const ratioStr = extra?.avg_qtl_per_farmer
          ? `<div style="display: flex; justify-content: space-between; gap: 12px; margin-top: 4px; padding-top: 4px; border-top: 1px dashed ${dark ? 'rgba(132, 204, 22, 0.25)' : 'rgba(91, 123, 16, 0.2)'};">
              <span style="color: ${dark ? '#8FA866' : '#6B7C4B'}; font-size: 11px;">Efficiency Ratio:</span>
              <strong style="color: ${dark ? '#84CC16' : '#364E00'}; font-size: 11px;">${Number(extra.avg_qtl_per_farmer).toFixed(2)} Qtl / Farmer</strong>
             </div>`
          : '';

        let routeDetails = '';
        if (extra?.efficiency_ratio || extra?.destination_warehouse || extra?.expected_hours !== undefined) {
          const expected = extra?.expected_hours ? `${Number(extra.expected_hours).toFixed(1)} hrs` : '—';
          const delay = extra?.delay_hours !== undefined ? `${Number(extra.delay_hours) > 0 ? '+' : ''}${Number(extra.delay_hours).toFixed(1)} hrs` : '—';
          const eff = extra?.efficiency_ratio ? `${Number(extra.efficiency_ratio).toFixed(2)}x` : '1.00x';
          const delayedPct = extra?.delayed_trip_percentage !== undefined ? `${Number(extra.delayed_trip_percentage).toFixed(1)}%` : '—';
          const trips = extra?.trip_count ? Number(extra.trip_count).toLocaleString() : '—';
          const speed = extra?.speed_kmh || (x && y ? Math.round(x / Math.max(0.1, y)) : null);
          const delayH = extra?.delay_hours != null ? Number(extra.delay_hours) : 0;
          const statusColor = extra?.pointColor || (delayH > 24 ? '#E11D48' : delayH > 2.0 ? '#F59E0B' : '#0D9488');
          const statusLabel = delayH > 24 ? 'Severe Delay (>24h)' : delayH > 2.0 ? 'Minor Delay (>2.0h SLA)' : 'On-Time (≤ SLA)';

          routeDetails = `
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed ${dark ? 'rgba(132, 204, 22, 0.25)' : 'rgba(91, 123, 16, 0.2)'}; font-size: 11px; display: flex; flex-direction: column; gap: 3px;">
              <div style="display: flex; justify-content: space-between; gap: 12px;">
                <span style="color: ${dark ? '#8FA866' : '#6B7C4B'};">Realized Speed:</span>
                <strong style="color: ${speed && speed >= 40 ? (dark ? '#84CC16' : '#5B7B10') : '#D97706'};">${speed ? `${speed} km/h` : '—'}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 12px;">
                <span style="color: ${dark ? '#8FA866' : '#6B7C4B'};">Baseline SLA (40km/h):</span>
                <strong style="color: ${dark ? '#FFFFFF' : '#1F2E0A'};">${expected}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 12px;">
                <span style="color: ${dark ? '#8FA866' : '#6B7C4B'};">Net Delay:</span>
                <strong style="color: ${delayH > 2.0 ? '#DC2626' : (dark ? '#84CC16' : '#5B7B10')};">${delay}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 12px;">
                <span style="color: ${dark ? '#8FA866' : '#6B7C4B'};">Efficiency Multiplier:</span>
                <strong style="color: ${dark ? '#84CC16' : '#364E00'};">${eff}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 12px;">
                <span style="color: ${dark ? '#8FA866' : '#6B7C4B'};">Dispatches / Delayed:</span>
                <strong style="color: ${dark ? '#FFFFFF' : '#1F2E0A'};">${trips} trips (${delayedPct})</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 12px; margin-top: 3px;">
                <span style="color: ${dark ? '#8FA866' : '#6B7C4B'};">SLA Compliance:</span>
                <span style="font-weight: 700; color: ${statusColor};">${statusLabel}</span>
              </div>
            </div>
          `;
        }

        return `
          <div style="font-family: Outfit, sans-serif; min-width: 190px;">
            <div style="font-weight: 700; color: ${dark ? '#FFFFFF' : '#364E00'}; margin-bottom: 5px; font-size: 13px;">
              ${name} ${districtStr}
            </div>
            <div style="display: flex; justify-content: space-between; gap: 14px; margin-bottom: 2px;">
              <span style="color: ${dark ? '#8FA866' : '#6B7C4B'};">${xName}:</span>
              <strong style="color: ${dark ? '#FFFFFF' : '#1F2E0A'};">${xFormatted}${xUnitStr}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 14px;">
              <span style="color: ${dark ? '#8FA866' : '#6B7C4B'};">${yName}:</span>
              <strong style="color: ${dark ? '#84CC16' : '#5B7B10'};">${yFormatted}${yUnitStr}</strong>
            </div>
            ${ratioStr}
            ${routeDetails}
          </div>
        `;
      }
    },
    grid: {
      top: 35,
      left: 20,
      right: 25,
      bottom: markLine ? 35 : 30,
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: xName,
      nameLocation: 'middle',
      nameGap: 24,
      nameTextStyle: { color: dark ? '#8FA866' : '#6B7C4B', fontSize: 11, fontWeight: 'bold' },
      axisLine: { lineStyle: { color: dark ? '#2D3F14' : 'rgba(91, 123, 16, 0.15)' } },
      splitLine: { lineStyle: { color: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(91, 123, 16, 0.08)', type: 'dashed' } },
      axisLabel: { color: dark ? '#8FA866' : '#6B7C4B', fontSize: 10, formatter: (val) => defaultAxisFormatter(val) }
    },
    yAxis: {
      type: 'value',
      name: yName,
      nameLocation: 'end',
      nameGap: 12,
      nameTextStyle: { color: dark ? '#8FA866' : '#6B7C4B', fontSize: 11, fontWeight: 'bold', align: 'left', padding: [0, 0, 8, -5] },
      axisLine: { lineStyle: { color: dark ? '#2D3F14' : 'rgba(91, 123, 16, 0.15)' } },
      splitLine: { lineStyle: { color: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(91, 123, 16, 0.08)', type: 'dashed' } },
      axisLabel: { color: dark ? '#8FA866' : '#6B7C4B', fontSize: 10, formatter: (val) => defaultAxisFormatter(val) }
    },
    series: [
      {
        name: 'Mandis',
        type: 'scatter',
        symbolSize: (val) => {
          const rawVal = val[2] || 10;
          return Math.max(10, Math.min(28, Math.round(Math.sqrt(rawVal) * 3.8)));
        },
        emphasis: {
          focus: 'series',
          scale: true,
          itemStyle: {
            borderWidth: 2.5,
            borderColor: dark ? '#172208' : '#FFFFFF',
            shadowBlur: 14,
            shadowColor: dark ? 'rgba(132, 204, 22, 0.5)' : 'rgba(0, 0, 0, 0.35)'
          }
        },
        data: points,
        markLine: markLine
          ? {
              silent: true,
              symbol: 'none',
              label: {
                show: true,
                fontSize: 10,
                color: dark ? '#D9F99D' : '#7A8F59',
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 'bold'
              },
              lineStyle: {
                color: dark ? 'rgba(132, 204, 22, 0.5)' : 'rgba(91, 123, 16, 0.4)',
                type: 'dashed',
                width: 1.5
              },
              data: markLine
            }
          : undefined,
        itemStyle: {
          color: (params) => {
            if (typeof pointColor === 'function') {
              return pointColor(params.value, params.data?.[4]);
            }
            if (typeof pointColor === 'string') {
              return pointColor;
            }
            if (params.data?.[4]?.pointColor) {
              return params.data[4].pointColor;
            }
            const yVal = params.value[1];
            if (yName.toLowerCase().includes('%') || yName.toLowerCase().includes('delay')) {
              if (yVal > 40) return '#EF4444';
              if (yVal > 20) return '#F59E0B';
              return '#84CC16';
            }
            return '#84CC16';
          },
          borderColor: dark ? '#172208' : '#FFFFFF',
          borderWidth: 1.5,
          shadowColor: dark ? 'rgba(132, 204, 22, 0.3)' : 'rgba(91, 123, 16, 0.25)',
          shadowBlur: 6,
          opacity: 0.88
        }
      }
    ]
  };

  const onEvents = onPointClick
    ? {
        click: (params) => {
          if (params.data && params.data[4]) {
            onPointClick(params.data[4]);
          }
        }
      }
    : {};

  return <ReactECharts option={option} onEvents={onEvents} style={{ height, width: '100%' }} />;
}
