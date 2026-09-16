import React from 'react';
import ReactECharts from 'echarts-for-react';

export default function WeatherTrendChart({
  data = [],
  height = '340px'
}) {
  if (!data || data.length === 0) return null;

  // Format dates cleanly for time axis (e.g., "15 Jan", "01 Feb")
  const dates = data.map((d) => {
    if (!d.date) return '';
    try {
      const parts = d.date.split('-');
      if (parts.length >= 3) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = parseInt(parts[1], 10) - 1;
        return `${parseInt(parts[2], 10)} ${monthNames[mIdx] || parts[1]}`;
      }
    } catch (e) {}
    return d.date;
  });

  const avgTemps = data.map((d) => Number(d.avg_temperature_c || d.temperature_c || 0));
  const maxTemps = data.map((d) => Number(d.max_temperature_c || d.avg_temperature_c || 0));
  const rainfalls = data.map((d) => Number(d.rainfall_mm || d.avg_rainfall_mm || d.total_rainfall_mm || 0));

  // Determine dynamic bounds
  const allTemps = [...avgTemps, ...maxTemps].filter((t) => t > 0);
  const minTemp = allTemps.length > 0 ? Math.min(...allTemps) : 15;
  const maxTemp = allTemps.length > 0 ? Math.max(...allTemps) : 45;
  const yMinTemp = Math.max(0, Math.floor((minTemp - 3) / 5) * 5);
  const yMaxTemp = Math.max(45, Math.ceil((maxTemp + 2) / 5) * 5);

  const maxRain = rainfalls.length > 0 ? Math.max(...rainfalls) : 40;
  const yMaxRain = Math.max(40, Math.ceil((maxRain * 1.25) / 10) * 10);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: '#FFFFFF',
      borderColor: 'rgba(91, 123, 16, 0.2)',
      borderWidth: 1,
      padding: [10, 14],
      shadowBlur: 14,
      shadowColor: 'rgba(45, 65, 12, 0.08)',
      textStyle: { color: '#1F2E0A', fontSize: 12, fontFamily: 'Outfit, sans-serif' },
      formatter: (params) => {
        if (!params || params.length === 0) return '';
        const idx = params[0].dataIndex;
        const dateStr = dates[idx] || data[idx]?.date;
        const avgT = avgTemps[idx];
        const maxT = maxTemps[idx];
        const rain = rainfalls[idx];

        const isHeatwave = maxT >= 38.0;
        const isHeavyRain = rain >= 28.0;

        return `
          <div style="min-width: 220px; font-family: Outfit, sans-serif;">
            <div style="font-weight: 700; font-size: 13px; color: #1F2E0A; border-bottom: 1px solid rgba(91, 123, 16, 0.15); padding-bottom: 6px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <span>${dateStr}</span>
              ${
                isHeatwave
                  ? `<span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: #FEF2F2; color: #BE123C; border: 1px solid #FECDD3;">🔥 Extreme Heat</span>`
                  : isHeavyRain
                  ? `<span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: #E0F2FE; color: #0369A1; border: 1px solid #BAE6FD;">🌧️ Rain Surge</span>`
                  : `<span style="font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 6px; background: #F4F6EC; color: #364E00; border: 1px solid rgba(91, 123, 16, 0.2);">⛅ Temperate</span>`
              }
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px; font-size: 11px;">
              <div style="display: flex; justify-content: space-between; gap: 14px; align-items: center;">
                <span style="color: #6B7C4B; display: flex; align-items: center; gap: 5px;">
                  <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #D97706;"></span>
                  Ambient Mean Temp:
                </span>
                <strong style="color: #1F2E0A; font-weight: 700;">${avgT.toFixed(1)}°C</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 14px; align-items: center;">
                <span style="color: #6B7C4B; display: flex; align-items: center; gap: 5px;">
                  <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #E11D48;"></span>
                  Peak Sensor Temp:
                </span>
                <strong style="color: #E11D48; font-weight: 700;">${maxT.toFixed(1)}°C</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 14px; align-items: center; padding-top: 5px; border-top: 1px dashed rgba(91, 123, 16, 0.15); margin-top: 3px;">
                <span style="color: #0284C7; font-weight: 600; display: flex; align-items: center; gap: 5px;">
                  <span style="display: inline-block; width: 8px; height: 8px; border-radius: 2px; background-color: #0284C7;"></span>
                  Daily Precipitation:
                </span>
                <strong style="color: #0284C7; font-weight: 700;">${rain.toFixed(1)} mm</strong>
              </div>
            </div>
          </div>
        `;
      }
    },
    legend: {
      top: 0,
      right: '2%',
      icon: 'roundRect',
      itemWidth: 12,
      itemHeight: 8,
      textStyle: { color: '#526633', fontSize: 11, fontWeight: 600, fontFamily: 'Outfit, sans-serif' },
      data: ['Ambient Mean Temp (°C)', 'Peak Sensor Temp (°C)', 'Daily Rainfall (mm)']
    },
    grid: {
      top: 36,
      left: 12,
      right: 28,
      bottom: 18,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: true,
      axisLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.18)' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#6B7C4B',
        fontSize: 10,
        fontFamily: 'Outfit, sans-serif',
        interval: 3,
        rotate: 0
      }
    },
    yAxis: [
      // Left Y-Axis: Temperature (°C)
      {
        type: 'value',
        name: 'Ambient (°C)',
        nameTextStyle: { color: '#526633', fontSize: 11, fontWeight: '700', fontFamily: 'Outfit, sans-serif', align: 'left' },
        min: yMinTemp,
        max: yMaxTemp,
        interval: 5,
        splitLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.08)', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#6B7C4B',
          fontSize: 10,
          fontFamily: 'Outfit, sans-serif',
          formatter: '{value}°C'
        }
      },
      // Right Y-Axis: Rainfall (mm)
      {
        type: 'value',
        name: 'Precipitation (mm)',
        nameTextStyle: { color: '#0284C7', fontSize: 11, fontWeight: '700', fontFamily: 'Outfit, sans-serif', align: 'right' },
        min: 0,
        max: yMaxRain,
        interval: 10,
        splitLine: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#0284C7',
          fontSize: 10,
          fontFamily: 'Outfit, sans-serif',
          formatter: '{value} mm'
        }
      }
    ],
    series: [
      // 1. Rainfall Volumetric Columns (Right Axis) - Soft Cyan Gradient
      {
        name: 'Daily Rainfall (mm)',
        type: 'bar',
        yAxisIndex: 1,
        barWidth: 11,
        emphasis: {
          focus: 'series',
          itemStyle: { color: 'rgba(14, 165, 233, 0.85)' }
        },
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(14, 165, 233, 0.55)' },
              { offset: 1, color: 'rgba(14, 165, 233, 0.05)' }
            ]
          }
        },
        data: rainfalls
      },
      // 2. Peak Sensor Temperature (Left Axis) - Sophisticated Dashed Rose Accent
      {
        name: 'Peak Sensor Temp (°C)',
        type: 'line',
        yAxisIndex: 0,
        smooth: 0.4,
        symbol: 'circle',
        symbolSize: 4,
        showSymbol: false,
        emphasis: {
          focus: 'series',
          itemStyle: { borderWidth: 2, borderColor: '#FFFFFF', shadowBlur: 6 }
        },
        lineStyle: {
          width: 1.8,
          type: 'dashed',
          color: '#E11D48'
        },
        itemStyle: { color: '#E11D48' },
        data: maxTemps
      },
      // 3. Ambient Mean Temperature (Left Axis) - Warm Solar Amber Spine with Ambient Fill
      {
        name: 'Ambient Mean Temp (°C)',
        type: 'line',
        yAxisIndex: 0,
        smooth: 0.45,
        symbol: 'circle',
        symbolSize: 5,
        showSymbol: false,
        emphasis: {
          focus: 'series',
          itemStyle: { borderWidth: 2, borderColor: '#FFFFFF', shadowBlur: 8, shadowColor: 'rgba(217, 119, 6, 0.4)' }
        },
        lineStyle: {
          width: 2.8,
          color: '#D97706',
          shadowColor: 'rgba(217, 119, 6, 0.25)',
          shadowBlur: 8
        },
        itemStyle: { color: '#D97706' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(217, 119, 6, 0.16)' },
              { offset: 0.8, color: 'rgba(217, 119, 6, 0.02)' },
              { offset: 1, color: 'transparent' }
            ]
          }
        },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            {
              yAxis: 35,
              name: 'Heatwave Advisory',
              lineStyle: { color: 'rgba(225, 29, 72, 0.55)', type: 'dashed', width: 1.5 },
              label: {
                formatter: 'Heatwave Advisory (≥35°C)',
                position: 'insideEndTop',
                color: '#BE123C',
                fontSize: 10,
                fontWeight: 700,
                fontFamily: 'Outfit, sans-serif'
              }
            }
          ]
        },
        data: avgTemps
      }
    ]
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} notMerge={true} />;
}
