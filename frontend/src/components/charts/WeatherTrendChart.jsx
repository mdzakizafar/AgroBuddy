import React from 'react';
import ReactECharts from 'echarts-for-react';

export default function WeatherTrendChart({
  data = [],
  height = '340px'
}) {
  if (!data || data.length === 0) return null;

  // Downsample to at most 24 clean, well-spaced time points for visual elegance
  const processedData = React.useMemo(() => {
    if (data.length <= 25) return data;
    const step = Math.max(1, Math.floor(data.length / 24));
    const result = [];
    for (let i = 0; i < data.length; i += step) {
      const chunk = data.slice(i, i + step);
      const avgT = chunk.reduce((sum, c) => sum + (c.avg_temperature_c || 0), 0) / chunk.length;
      const maxT = chunk.reduce((sum, c) => Math.max(sum, c.max_temperature_c || c.avg_temperature_c || 0), 0);
      const sumR = chunk.reduce((sum, c) => sum + (c.total_rainfall_mm || c.rainfall_mm || 0), 0) / chunk.length;
      const dateLabel = chunk[0]?.date || `Period ${i + 1}`;

      result.push({
        date: dateLabel,
        avg_temperature_c: Math.round(avgT * 10) / 10,
        max_temperature_c: Math.round(maxT * 10) / 10,
        total_rainfall_mm: Math.round(sumR * 10) / 10
      });
    }
    return result;
  }, [data]);

  const dates = processedData.map((d) => {
    if (!d.date) return '';
    try {
      const parts = d.date.split('-');
      if (parts.length >= 3) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = parseInt(parts[1], 10) - 1;
        return `${parts[2]} ${monthNames[mIdx] || parts[1]}`;
      }
    } catch (e) {
      // fallback
    }
    return d.date;
  });

  const avgTemps = processedData.map((d) => Number(d.avg_temperature_c || 0));
  const maxTemps = processedData.map((d) => Number(d.max_temperature_c || d.avg_temperature_c || 0));
  const rainfalls = processedData.map((d) => Number(d.total_rainfall_mm || 0));

  // Compute clean Y-axis bounds
  const allTemps = [...avgTemps, ...maxTemps].filter((t) => t > 0);
  const minTemp = allTemps.length > 0 ? Math.min(...allTemps) : 15;
  const maxTemp = allTemps.length > 0 ? Math.max(...allTemps) : 45;
  const yMinTemp = Math.max(0, Math.floor((minTemp - 3) / 5) * 5);
  const yMaxTemp = Math.ceil((maxTemp + 3) / 5) * 5;

  const maxRain = rainfalls.length > 0 ? Math.max(...rainfalls) : 60;
  const yMaxRain = Math.max(40, Math.ceil((maxRain * 1.3) / 10) * 10);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#FFFFFF',
      borderColor: '#E2E8F0',
      borderWidth: 1,
      padding: [10, 14],
      shadowBlur: 10,
      shadowColor: 'rgba(0, 0, 0, 0.05)',
      textStyle: { color: '#0F172A', fontSize: 12, fontFamily: 'Outfit, sans-serif' },
      formatter: (params) => {
        if (!params || params.length === 0) return '';
        const idx = params[0].dataIndex;
        const dateStr = dates[idx] || processedData[idx]?.date;
        const avgT = avgTemps[idx];
        const maxT = maxTemps[idx];
        const rain = rainfalls[idx];

        const isHeatwave = maxT >= 40.0;
        const isHeavyRain = rain >= 40.0;

        return `
          <div style="min-width: 200px; font-family: inherit;">
            <div style="font-weight: 700; font-size: 12px; color: #1E293B; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <span>${dateStr}</span>
              ${
                isHeatwave
                  ? `<span style="font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: #FEE2E2; color: #991B1B;">Heatwave</span>`
                  : isHeavyRain
                  ? `<span style="font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: #DBEAFE; color: #1E40AF;">Heavy Rain</span>`
                  : `<span style="font-size: 10px; font-weight: 600; color: #64748B;">Normal</span>`
              }
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px; font-size: 11px;">
              <div style="display: flex; justify-content: space-between; gap: 12px;">
                <span style="color: #EF4444; font-weight: 600;">● Maximum Temp:</span>
                <strong style="color: #0F172A;">${maxT.toFixed(1)}°C</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 12px;">
                <span style="color: #F59E0B; font-weight: 600;">● Average Temp:</span>
                <strong style="color: #0F172A;">${avgT.toFixed(1)}°C</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 12px; padding-top: 4px; border-top: 1px dashed #E2E8F0; margin-top: 2px;">
                <span style="color: #3B82F6; font-weight: 600;">▮ Daily Rainfall:</span>
                <strong style="color: #0F172A;">${rain.toFixed(1)} mm</strong>
              </div>
            </div>
          </div>
        `;
      }
    },
    legend: {
      top: 0,
      right: '1%',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: '#64748B', fontSize: 11, fontWeight: 500 },
      data: ['Maximum Temp (°C)', 'Average Temp (°C)', 'Daily Rainfall (mm)']
    },
    grid: {
      top: 36,
      left: 15,
      right: 45,
      bottom: 25,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: true,
      axisLine: { lineStyle: { color: '#E2E8F0' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#64748B',
        fontSize: 10,
        margin: 10
      }
    },
    yAxis: [
      // Left Y-Axis: Temperature (°C)
      {
        type: 'value',
        name: 'Temp (°C)',
        nameTextStyle: { color: '#64748B', fontSize: 10, fontWeight: '600', align: 'left' },
        min: yMinTemp,
        max: yMaxTemp,
        splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#64748B',
          fontSize: 10,
          formatter: (v) => `${v}°C`
        }
      },
      // Right Y-Axis: Rainfall (mm)
      {
        type: 'value',
        name: 'Rain (mm)',
        nameTextStyle: { color: '#3B82F6', fontSize: 10, fontWeight: '600', align: 'right' },
        min: 0,
        max: yMaxRain,
        splitLine: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#3B82F6',
          fontSize: 10,
          formatter: (v) => `${v}mm`
        }
      }
    ],
    series: [
      // 1. Rainfall Volumetric Bars (Right Axis)
      {
        name: 'Daily Rainfall (mm)',
        type: 'bar',
        yAxisIndex: 1,
        barWidth: '22%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.65)' },
              { offset: 1, color: 'rgba(219, 234, 254, 0.15)' }
            ]
          }
        },
        data: rainfalls
      },
      // 2. Maximum Temperature Line (Left Axis)
      {
        name: 'Maximum Temp (°C)',
        type: 'line',
        yAxisIndex: 0,
        smooth: 0.45,
        symbol: 'none',
        lineStyle: {
          width: 2.2,
          color: '#EF4444'
        },
        itemStyle: { color: '#EF4444' },
        data: maxTemps
      },
      // 3. Average Temperature Line & Soft Gradient Fill (Left Axis)
      {
        name: 'Average Temp (°C)',
        type: 'line',
        yAxisIndex: 0,
        smooth: 0.45,
        symbol: 'none',
        lineStyle: {
          width: 3.0,
          color: '#F59E0B'
        },
        itemStyle: { color: '#F59E0B' },
        areaStyle: {
          opacity: 1,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245, 158, 11, 0.18)' },
              { offset: 0.8, color: 'rgba(245, 158, 11, 0.02)' },
              { offset: 1, color: 'rgba(245, 158, 11, 0.0)' }
            ]
          }
        },
        data: avgTemps
      }
    ]
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} notMerge={true} />;
}
