import React from 'react';
import ReactECharts from 'echarts-for-react';

export default function PriceGapChart({
  data = [],
  height = '310px'
}) {
  if (!data || data.length === 0) return null;

  // Downsample raw 270+ daily points into 36 smooth, elegant period intervals
  const processedData = React.useMemo(() => {
    if (data.length <= 40) return data;
    const step = Math.max(1, Math.floor(data.length / 36));
    const result = [];
    for (let i = 0; i < data.length; i += step) {
      const chunk = data.slice(i, i + step);
      const avgModal = chunk.reduce((acc, c) => acc + (c.avg_modal_price || c.modal_price || 0), 0) / chunk.length;
      const avgMsp = chunk.reduce((acc, c) => acc + (c.avg_msp || c.msp || 0), 0) / chunk.length;
      const dateLabel = chunk[0]?.date || `Period ${i + 1}`;
      result.push({
        date: dateLabel,
        avg_modal_price: Math.round(avgModal * 10) / 10,
        avg_msp: Math.round(avgMsp * 10) / 10
      });
    }
    return result;
  }, [data]);

  const dates = processedData.map((d) => d.date);
  const modalPrices = processedData.map((d) => Number(d.avg_modal_price || 0));
  const mspPrices = processedData.map((d) => Number(d.avg_msp || 0));

  const allPrices = [...modalPrices, ...mspPrices].filter((p) => p > 0);
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 3000;
  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 4500;
  const yMin = Math.max(0, Math.floor((minPrice - 120) / 100) * 100);
  const yMax = Math.ceil((maxPrice + 180) / 100) * 100;

  // Peak and Trough index points for callout highlights
  let maxModalIdx = 0;
  let minModalIdx = 0;
  modalPrices.forEach((p, i) => {
    if (p > modalPrices[maxModalIdx]) maxModalIdx = i;
    if (p < modalPrices[minModalIdx]) minModalIdx = i;
  });

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: '#FFFFFF',
      borderColor: 'rgba(91, 123, 16, 0.25)',
      borderWidth: 1,
      padding: [12, 16],
      textStyle: { color: '#1F2E0A', fontSize: 12, fontFamily: 'Outfit, sans-serif' },
      formatter: (params) => {
        if (!params || params.length === 0) return '';
        const idx = params[0].dataIndex;
        const date = dates[idx];
        const modal = modalPrices[idx];
        const msp = mspPrices[idx];
        const diff = modal - msp;
        const isDistressed = diff < 0;

        return `
          <div style="min-width: 210px; font-family: inherit;">
            <div style="font-weight: 700; font-size: 12px; color: #1C270A; border-bottom: 1px solid rgba(91,123,16,0.2); padding-bottom: 6px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
              <span>${date}</span>
              <span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 9999px; ${
                isDistressed ? 'background: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5;' : 'background: #ECFCCB; color: #365314; border: 1px solid #BEF264;'
              }">
                ${isDistressed ? 'MSP Deficit Alert' : 'At/Above Floor'}
              </span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px; font-size: 11px;">
              <div style="display: flex; justify-content: space-between; gap: 16px;">
                <span style="color: #D97706; font-weight: 600;">● Realized Modal Price:</span>
                <strong style="color: #1C270A;">₹${modal.toLocaleString('en-IN', { minimumFractionDigits: 1 })} / Qtl</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 16px;">
                <span style="color: #5B7B10; font-weight: 600;">-- Govt MSP Floor:</span>
                <strong style="color: #1C270A;">₹${msp.toLocaleString('en-IN', { minimumFractionDigits: 1 })} / Qtl</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 16px; padding-top: 5px; border-top: 1px dashed rgba(91,123,16,0.2); margin-top: 3px; font-weight: 700;">
                <span style="color: ${isDistressed ? '#DC2626' : '#5B7B10'};">
                  ${isDistressed ? 'Deficit Shortfall:' : 'Price Premium:'}
                </span>
                <span style="color: ${isDistressed ? '#DC2626' : '#5B7B10'};">
                  ${isDistressed ? `-₹${Math.abs(diff).toFixed(1)} / Qtl` : `+₹${diff.toFixed(1)} / Qtl`}
                </span>
              </div>
            </div>
          </div>
        `;
      }
    },
    legend: {
      top: 0,
      right: '2%',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: '#526633', fontSize: 11, fontWeight: 600, fontFamily: 'Outfit, sans-serif' },
      data: ['Realized Modal Price', 'Govt MSP Floor Benchmark']
    },
    grid: {
      top: 34,
      left: 15,
      right: 20,
      bottom: 25,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.2)' } },
      axisLabel: {
        color: '#6B7C4B',
        fontSize: 10,
        formatter: (val) => {
          if (!val) return '';
          const parts = val.split('-');
          return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : val;
        }
      }
    },
    yAxis: {
      type: 'value',
      name: 'Price (₹/Qtl)',
      nameTextStyle: { color: '#6B7C4B', fontSize: 10, fontWeight: 'bold', align: 'left' },
      min: yMin,
      max: yMax,
      splitLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.08)', type: 'dashed' } },
      axisLabel: {
        color: '#6B7C4B',
        fontSize: 10,
        formatter: (v) => `₹${v.toLocaleString('en-IN')}`
      }
    },
    series: [
      // 1. Realized Modal Price line with elegant amber gradient area fill
      {
        name: 'Realized Modal Price',
        type: 'line',
        smooth: 0.45,
        symbol: 'circle',
        symbolSize: 5,
        showSymbol: false,
        emphasis: {
          focus: 'series',
          itemStyle: {
            borderWidth: 2,
            borderColor: '#FFFFFF',
            shadowBlur: 8
          }
        },
        lineStyle: {
          width: 3.2,
          color: '#D97706',
          shadowBlur: 0
        },
        itemStyle: { color: '#D97706' },
        areaStyle: {
          opacity: 1,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(217, 119, 6, 0.38)' },
              { offset: 0.65, color: 'rgba(217, 119, 6, 0.12)' },
              { offset: 1, color: 'rgba(217, 119, 6, 0.01)' }
            ]
          }
        },
        markPoint: {
          symbol: 'pin',
          symbolSize: 48,
          label: {
            fontSize: 9,
            fontWeight: 'bold',
            color: '#FFFFFF',
            formatter: (p) => `₹${Math.round(p.value)}`
          },
          data: [
            { type: 'max', name: 'Peak', itemStyle: { color: '#D97706' } },
            { type: 'min', name: 'Trough', itemStyle: { color: '#DC2626' } }
          ]
        },
        data: modalPrices
      },
      // 2. Govt MSP Floor line Benchmark
      {
        name: 'Govt MSP Floor Benchmark',
        type: 'line',
        smooth: 0.45,
        symbol: 'circle',
        symbolSize: 5,
        showSymbol: false,
        lineStyle: {
          width: 2.4,
          color: '#5B7B10',
          type: 'dashed',
          shadowBlur: 0
        },
        itemStyle: { color: '#5B7B10' },
        data: mspPrices
      }
    ]
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} notMerge={true} />;
}
