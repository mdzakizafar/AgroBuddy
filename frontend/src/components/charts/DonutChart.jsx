import React from 'react';
import ReactECharts from 'echarts-for-react';

export default function DonutChart({
  percentage = 82,
  label = "Below MSP",
  valueText = "42.3%",
  subText = "32.0 / 40 kQtl",
  height = "220px",
  activeColor = null
}) {
  // Determine semantic color gradient based on percentage if not explicitly provided
  let startColor = '#84CC16';
  let endColor = '#5B7B10';

  if (activeColor) {
    startColor = activeColor;
    endColor = activeColor;
  } else if (percentage > 35) {
    startColor = '#F59E0B';
    endColor = '#D97706';
  } else if (percentage > 50) {
    startColor = '#EF4444';
    endColor = '#DC2626';
  }

  const option = {
    backgroundColor: 'transparent',
    tooltip: { show: false },
    series: [
      {
        type: 'pie',
        radius: ['68%', '88%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        label: {
          show: true,
          position: 'center',
          formatter: () => `{val|${valueText}}\n{sub|${subText}}`,
          rich: {
            val: {
              fontSize: 24,
              fontWeight: 800,
              fontFamily: 'Outfit, sans-serif',
              color: '#1F2E0A',
              padding: [0, 0, 4, 0]
            },
            sub: {
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'Outfit, sans-serif',
              color: '#7A8F59'
            }
          }
        },
        data: [
          {
            value: percentage,
            name: 'Active',
            itemStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 1, y2: 1,
                colorStops: [
                  { offset: 0, color: startColor },
                  { offset: 1, color: endColor }
                ]
              }
            }
          },
          {
            value: Math.max(0, 100 - percentage),
            name: 'Remaining',
            itemStyle: { color: 'rgba(91, 123, 16, 0.1)' }
          }
        ]
      }
    ]
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} />;
}
