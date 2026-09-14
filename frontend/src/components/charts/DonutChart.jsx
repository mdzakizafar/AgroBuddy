import React from 'react';
import ReactECharts from 'echarts-for-react';

export default function DonutChart({ percentage = 82, label = "Below MSP", valueText = "42.3%", subText = "32.0 / 40 kQtl", height = "220px" }) {
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
              fontSize: 26,
              fontWeight: 800,
              fontFamily: 'Outfit',
              color: '#1F2E0A',
              padding: [0, 0, 4, 0]
            },
            sub: {
              fontSize: 11,
              fontWeight: 600,
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
                  { offset: 0, color: '#84CC16' },
                  { offset: 1, color: '#5B7B10' }
                ]
              }
            }
          },
          {
            value: 100 - percentage,
            name: 'Remaining',
            itemStyle: { color: 'rgba(91, 123, 16, 0.1)' }
          }
        ]
      }
    ]
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} />;
}
