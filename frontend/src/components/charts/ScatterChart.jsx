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
  onPointClick
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
      backgroundColor: '#FFFFFF',
      borderColor: 'rgba(91, 123, 16, 0.25)',
      textStyle: { color: '#1F2E0A', fontSize: 12, fontFamily: 'Plus Jakarta Sans' },
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
        const districtStr = extra?.district ? `<span style="font-size: 11px; color: #7A8F59; margin-left: 6px;">(${extra.district})</span>` : '';
        const ratioStr = extra?.avg_qtl_per_farmer
          ? `<div style="display: flex; justify-content: space-between; gap: 12px; margin-top: 4px; padding-top: 4px; border-top: 1px dashed rgba(91, 123, 16, 0.2);">
              <span style="color: #6B7C4B; font-size: 11px;">Efficiency Ratio:</span>
              <strong style="color: #364E00; font-size: 11px;">${Number(extra.avg_qtl_per_farmer).toFixed(2)} Qtl / Farmer</strong>
             </div>`
          : '';

        let routeDetails = '';
        if (extra?.efficiency_ratio || extra?.destination_warehouse || extra?.expected_hours !== undefined) {
          const expected = extra?.expected_hours ? `${Number(extra.expected_hours).toFixed(1)} hrs` : '—';
          const delay = extra?.delay_hours ? `${Number(extra.delay_hours).toFixed(1)} hrs` : '—';
          const eff = extra?.efficiency_ratio ? `${Number(extra.efficiency_ratio).toFixed(2)}x` : '1.00x';
          const delayedPct = extra?.delayed_trip_percentage !== undefined ? `${Number(extra.delayed_trip_percentage).toFixed(1)}%` : '—';
          const trips = extra?.trip_count ? Number(extra.trip_count).toLocaleString() : '—';
          const isDelayed = (extra?.delay_hours || 0) > 0;
          const statusColor = (extra?.actual_transit_hours || y) > 200 ? '#DC2626' : (extra?.actual_transit_hours || y) > 50 ? '#D97706' : '#5B7B10';
          const statusLabel = (extra?.actual_transit_hours || y) > 200 ? 'Critical Bottleneck (>200h)' : (extra?.actual_transit_hours || y) > 50 ? 'Moderate Delay (50–200h)' : 'Optimal SLA (<50h)';

          routeDetails = `
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(91, 123, 16, 0.2); font-size: 11px; display: flex; flex-direction: column; gap: 3px;">
              <div style="display: flex; justify-content: space-between; gap: 12px;">
                <span style="color: #6B7C4B;">Baseline SLA (40km/h):</span>
                <strong style="color: #1F2E0A;">${expected}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 12px;">
                <span style="color: #6B7C4B;">Average Delay:</span>
                <strong style="color: ${isDelayed ? '#DC2626' : '#5B7B10'};">${delay}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 12px;">
                <span style="color: #6B7C4B;">Efficiency Multiplier:</span>
                <strong style="color: #364E00;">${eff}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 12px;">
                <span style="color: #6B7C4B;">Trip Volume / Delayed:</span>
                <strong style="color: #1F2E0A;">${trips} trips (${delayedPct})</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 12px; margin-top: 3px;">
                <span style="color: #6B7C4B;">Corridor SLA Status:</span>
                <span style="font-weight: 700; color: ${statusColor};">${statusLabel}</span>
              </div>
            </div>
          `;
        }

        return `
          <div style="font-weight: 700; color: #364E00; margin-bottom: 5px; font-size: 13px;">
            ${name} ${districtStr}
          </div>
          <div style="display: flex; justify-content: space-between; gap: 14px; margin-bottom: 2px;">
            <span style="color: #6B7C4B;">${xName}:</span>
            <strong style="color: #1F2E0A;">${xFormatted}${xUnitStr}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 14px;">
            <span style="color: #6B7C4B;">${yName}:</span>
            <strong style="color: #5B7B10;">${yFormatted}${yUnitStr}</strong>
          </div>
          ${ratioStr}
          ${routeDetails}
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
      nameTextStyle: { color: '#6B7C4B', fontSize: 11, fontWeight: 'bold' },
      axisLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.15)' } },
      splitLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.08)', type: 'dashed' } },
      axisLabel: { color: '#6B7C4B', fontSize: 10, formatter: (val) => defaultAxisFormatter(val) }
    },
    yAxis: {
      type: 'value',
      name: yName,
      nameLocation: 'end',
      nameGap: 12,
      nameTextStyle: { color: '#6B7C4B', fontSize: 11, fontWeight: 'bold', align: 'left', padding: [0, 0, 8, -5] },
      axisLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.15)' } },
      splitLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.08)', type: 'dashed' } },
      axisLabel: { color: '#6B7C4B', fontSize: 10, formatter: (val) => defaultAxisFormatter(val) }
    },
    series: [
      {
        name: 'Mandis',
        type: 'scatter',
        symbolSize: (val) => {
          const rawVal = val[2] || 10;
          return Math.max(10, Math.min(28, Math.round(Math.sqrt(rawVal) * 3.8)));
        },
        data: points,
        markLine: markLine
          ? {
              silent: true,
              symbol: 'none',
              label: {
                show: true,
                fontSize: 10,
                color: '#7A8F59',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: 'bold'
              },
              lineStyle: {
                color: 'rgba(91, 123, 16, 0.4)',
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
              if (yVal > 40) return '#DC2626';
              if (yVal > 20) return '#D97706';
              return '#5B7B10';
            }
            return '#5B7B10';
          },
          borderColor: '#FFFFFF',
          borderWidth: 1.5,
          shadowColor: 'rgba(91, 123, 16, 0.25)',
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
