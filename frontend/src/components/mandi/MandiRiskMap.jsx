import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { MapPin, Info, Flame, Truck, ShieldAlert, Compass, Activity } from 'lucide-react';

export default function MandiRiskMap({ mandis = [], onSelectMandi }) {
  const [activeLens, setActiveLens] = useState('drivers'); // 'drivers' | 'price' | 'arrival' | 'logistics' | 'composite'

  const validPoints = useMemo(() => {
    return mandis.filter(m => m.latitude && m.longitude);
  }, [mandis]);

  const unmappedCount = mandis.length - validPoints.length;

  // Driver counts for operational summary pills
  const driverCounts = useMemo(() => {
    const counts = { price: 0, arrival: 0, logistics: 0, baseline: 0 };
    validPoints.forEach(m => {
      const d = m.primary_risk_driver || 'price';
      if (counts[d] !== undefined) counts[d]++;
      else counts.baseline++;
    });
    return counts;
  }, [validPoints]);

  // Construct ECharts Options based on active lens
  const option = useMemo(() => {
    if (validPoints.length === 0) return {};

    const tooltipFormatter = (params) => {
      const m = params.data?.mandiData;
      if (!m) return params.name;

      const driver = m.primary_risk_driver || 'price';
      let driverColor = '#DC2626';
      let driverBg = 'rgba(220, 38, 38, 0.12)';
      let driverLabel = 'Price Pressure Hotspot';

      if (driver === 'arrival') {
        driverColor = '#D97706';
        driverBg = 'rgba(217, 119, 6, 0.12)';
        driverLabel = 'Arrival Volatility Hotspot';
      } else if (driver === 'logistics') {
        driverColor = '#2563EB';
        driverBg = 'rgba(37, 99, 235, 0.12)';
        driverLabel = 'Logistics Bottleneck';
      } else if (driver === 'baseline') {
        driverColor = '#5B7B10';
        driverBg = 'rgba(91, 123, 16, 0.12)';
        driverLabel = 'Operational Baseline';
      }

      const pScore = m.price_pressure_score ?? m.price_pressure ?? 0;
      const aScore = m.arrival_instability_score ?? m.arrival_instability ?? 0;
      const lScore = m.logistics_delay_score ?? m.logistics_delay ?? 0;
      const belowMsp = m.below_msp_percentage ?? 0;
      const delayHrs = m.avg_delay_hours ?? 0;
      const volQtl = Math.round(m.arrival_volume || 0).toLocaleString();

      const rScore = m.risk_score ?? 0;
      const rLevel = (m.risk_level || 'Low').toLowerCase();
      const isHighRisk = rScore >= 75 || rLevel === 'critical' || rLevel === 'high';
      const isMediumRisk = !isHighRisk && (rScore >= 50 || rLevel === 'medium' || rLevel === 'warning');

      const vulnColor = isHighRisk ? '#DC2626' : isMediumRisk ? '#D97706' : '#65A30D';
      const vulnBadgeBg = isHighRisk ? '#FEE2E2' : isMediumRisk ? '#FEF3C7' : '#EBF0DC';

      return `
        <div style="padding: 10px 12px; min-width: 240px; font-family: Outfit, sans-serif; background: #FFFFFF; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.12); border: 1px solid rgba(91,123,16,0.2);">
          <div style="font-weight: 800; font-size: 13px; color: #1F2E0A; margin-bottom: 2px;">${m.mandi_name}</div>
          <div style="font-size: 11px; color: #7A8F59; margin-bottom: 8px;">📍 ${m.district}, ${m.state} (Lat ${m.latitude.toFixed(2)}°N, Lng ${m.longitude.toFixed(2)}°E)</div>

          <div style="display: inline-block; padding: 3px 8px; border-radius: 6px; background: ${driverBg}; color: ${driverColor}; font-weight: 700; font-size: 10px; margin-bottom: 8px; border: 1px solid ${driverColor}40;">
            PRIMARY RISK: ${driverLabel.toUpperCase()}
          </div>

          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #DC2626; font-weight: 600;">🔴 Price Pressure:</span>
              <span style="font-weight: 700; color: #1F2E0A;">${pScore}/100 <span style="font-size: 10px; color: #7A8F59; font-weight: 500;">(${belowMsp}% &lt; MSP)</span></span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #D97706; font-weight: 600;">🟠 Arrival Instability:</span>
              <span style="font-weight: 700; color: #1F2E0A;">${aScore}/100 <span style="font-size: 10px; color: #7A8F59; font-weight: 500;">(${volQtl} Qtl)</span></span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #2563EB; font-weight: 600;">🔵 Logistics Delay:</span>
              <span style="font-weight: 700; color: #1F2E0A;">${lScore}/100 <span style="font-size: 10px; color: #7A8F59; font-weight: 500;">(${delayHrs}h delay)</span></span>
            </div>
          </div>

          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed rgba(91,123,16,0.25); display: flex; justify-content: space-between; font-size: 11px; align-items: center;">
            <span style="color: #526633; font-weight: 600;">Composite Vulnerability:</span>
            <span style="font-weight: 800; color: ${vulnColor}; background: ${vulnBadgeBg}; padding: 2px 7px; border-radius: 4px;">${rScore}/100 (${m.risk_level || (rScore >= 75 ? 'Critical' : 'Normal')})</span>
          </div>
          <div style="margin-top: 6px; font-size: 10px; color: #5B7B10; font-weight: 700; text-align: center;">
            Click node to inspect Mandi Detail &rarr;
          </div>
        </div>
      `;
    };

    // Uncluttered, clean Indian Geographic Scatter Base Config
    const baseConfig = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        padding: 0,
        backgroundColor: 'transparent',
        borderWidth: 0,
        shadowBlur: 0,
        formatter: tooltipFormatter
      },
      grid: { left: 45, right: 25, top: 35, bottom: 35, containLabel: true },
      xAxis: {
        type: 'value',
        name: 'Longitude (°E)',
        nameLocation: 'middle',
        nameGap: 22,
        nameTextStyle: { color: '#526633', fontSize: 10, fontWeight: '700' },
        min: 68,
        max: 92,
        scale: true,
        splitLine: { show: false }, // Completely removed intrusive gridlines
        axisTick: { show: false },
        axisLabel: { formatter: '{value}°E', color: '#7A8F59', fontSize: 9 },
        axisLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.2)' } }
      },
      yAxis: {
        type: 'value',
        name: 'Latitude (°N)',
        nameLocation: 'end',
        nameGap: 10,
        nameTextStyle: { color: '#526633', fontSize: 10, fontWeight: '700', align: 'left', padding: [0, 0, 8, -5] },
        min: 15,
        max: 35,
        scale: true,
        splitLine: { show: false }, // Completely removed intrusive gridlines
        axisTick: { show: false },
        axisLabel: { formatter: '{value}°N', color: '#7A8F59', fontSize: 9 },
        axisLine: { lineStyle: { color: 'rgba(91, 123, 16, 0.2)' } }
      }
    };

    // 1. Dominant Driver Multi-Series Mode
    if (activeLens === 'drivers') {
      const pricePoints = validPoints.filter(m => (m.primary_risk_driver || 'price') === 'price');
      const arrivalPoints = validPoints.filter(m => m.primary_risk_driver === 'arrival');
      const logisticsPoints = validPoints.filter(m => m.primary_risk_driver === 'logistics');
      const baselinePoints = validPoints.filter(m => m.primary_risk_driver === 'baseline');

      return {
        ...baseConfig,
        legend: {
          show: true,
          top: 0,
          left: 'center',
          textStyle: { color: '#1F2E0A', fontSize: 10, fontWeight: 'bold' },
          itemGap: 14,
          data: [
            { name: 'Price Pressure Hotspots', icon: 'circle' },
            { name: 'Arrival Volatility Hotspots', icon: 'triangle' },
            { name: 'Logistics Bottlenecks', icon: 'diamond' },
            { name: 'Operational Baseline', icon: 'circle' }
          ]
        },
        series: [
          {
            name: 'Price Pressure Hotspots',
            type: 'scatter',
            symbol: 'circle',
            symbolSize: (data) => Math.max(12, Math.min(24, (data[2] || 25) * 0.7)),
            data: pricePoints.map(m => ({
              name: m.mandi_name,
              value: [m.longitude, m.latitude, m.price_pressure_score || 25],
              mandiData: m
            })),
            itemStyle: {
              color: '#DC2626',
              borderColor: '#FFFFFF',
              borderWidth: 1.5,
              shadowBlur: 6,
              shadowColor: 'rgba(220, 38, 38, 0.4)'
            }
          },
          {
            name: 'Arrival Volatility Hotspots',
            type: 'scatter',
            symbol: 'triangle',
            symbolSize: (data) => Math.max(12, Math.min(24, (data[2] || 30) * 0.65)),
            data: arrivalPoints.map(m => ({
              name: m.mandi_name,
              value: [m.longitude, m.latitude, m.arrival_instability_score || 30],
              mandiData: m
            })),
            itemStyle: {
              color: '#D97706',
              borderColor: '#FFFFFF',
              borderWidth: 1.5,
              shadowBlur: 6,
              shadowColor: 'rgba(217, 119, 6, 0.4)'
            }
          },
          {
            name: 'Logistics Bottlenecks',
            type: 'scatter',
            symbol: 'diamond',
            symbolSize: (data) => Math.max(12, Math.min(24, (data[2] || 30) * 0.65)),
            data: logisticsPoints.map(m => ({
              name: m.mandi_name,
              value: [m.longitude, m.latitude, m.logistics_delay_score || 30],
              mandiData: m
            })),
            itemStyle: {
              color: '#2563EB',
              borderColor: '#FFFFFF',
              borderWidth: 1.5,
              shadowBlur: 6,
              shadowColor: 'rgba(37, 99, 235, 0.4)'
            }
          },
          {
            name: 'Operational Baseline',
            type: 'scatter',
            symbol: 'circle',
            symbolSize: 10,
            data: baselinePoints.map(m => ({
              name: m.mandi_name,
              value: [m.longitude, m.latitude, m.risk_score || 18],
              mandiData: m
            })),
            itemStyle: {
              color: '#65A30D', // Green for baseline/low risk
              borderColor: '#FFFFFF',
              borderWidth: 1.5,
              opacity: 0.85
            }
          }
        ]
      };
    }

    // 2. Continuous Metric Lenses Mode
    // Low and Medium vulnerability scores are consistently Green (#65A30D / #5B7B10), while High/Critical is Red (#DC2626)
    const seriesData = validPoints.map(m => {
      let score = m.risk_score ?? 20;
      if (activeLens === 'price') score = m.price_pressure_score ?? 20;
      else if (activeLens === 'arrival') score = m.arrival_instability_score ?? 20;
      else if (activeLens === 'logistics') score = m.logistics_delay_score ?? 20;

      // Color consistency rule: Low & Medium (score < 75) = Green; High/Critical (score >= 75) = Red
      const isHigh = score >= 75 || (m.risk_level || '').toLowerCase() === 'critical' || (m.risk_level || '').toLowerCase() === 'high';
      const isMed = !isHigh && (score >= 50 || (m.risk_level || '').toLowerCase() === 'medium' || (m.risk_level || '').toLowerCase() === 'warning');

      const nodeColor = activeLens === 'drivers'
        ? (isHigh ? '#DC2626' : isMed ? '#D97706' : '#65A30D')
        : activeLens === 'price'
        ? '#DC2626'
        : activeLens === 'arrival'
        ? '#D97706'
        : activeLens === 'logistics'
        ? '#2563EB'
        : (isHigh ? '#DC2626' : isMed ? '#D97706' : '#65A30D');

      return {
        name: m.mandi_name,
        value: [m.longitude, m.latitude, score],
        mandiData: m,
        itemStyle: {
          color: nodeColor,
          borderColor: '#FFFFFF',
          borderWidth: 1.5,
          shadowBlur: 5,
          shadowColor: `${nodeColor}55`
        }
      };
    });

    return {
      ...baseConfig,
      legend: { show: false },
      series: [
        {
          name: 'APMC Nodes',
          type: 'scatter',
          symbolSize: (data) => Math.max(10, Math.min(22, 10 + (data[2] || 20) * 0.18)),
          data: seriesData
        }
      ]
    };
  }, [validPoints, activeLens]);

  const onChartClick = (params) => {
    if (params.data?.mandiData && onSelectMandi) {
      onSelectMandi(params.data.mandiData);
    }
  };

  return (
    <div className="agro-card p-5 space-y-4 border-[#5B7B10]/20 shadow-sm bg-gradient-to-b from-white to-[#FAFBF6]">
      {/* Map Header with Lens Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#5B7B10]/15 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[#5B7B10]" />
              Indian Mandi Geographic Vulnerability Map
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#5B7B10]/10 text-[#364E00] border border-[#5B7B10]/20">
              57 Indian APMC Hubs
            </span>
          </div>
          <p className="text-[11px] text-[#6B7C4B] mt-0.5">
            Geospatial tracking of agricultural vulnerability across <strong>7 Indian States</strong> (Punjab, Haryana, UP, MP, MH, GJ, WB)
          </p>
        </div>

        {/* Operational Lens Selector Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#F4F6EC] p-1 rounded-xl border border-[#5B7B10]/15 text-xs">
          <button
            onClick={() => setActiveLens('drivers')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 text-[11px] ${
              activeLens === 'drivers'
                ? 'bg-[#5B7B10] text-white shadow-xs'
                : 'text-[#526633] hover:text-[#1F2E0A] hover:bg-white/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Primary Drivers</span>
          </button>

          <button
            onClick={() => setActiveLens('price')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 text-[11px] ${
              activeLens === 'price'
                ? 'bg-[#DC2626] text-white shadow-xs'
                : 'text-red-700 hover:bg-red-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            <span>Price Pressure</span>
          </button>

          <button
            onClick={() => setActiveLens('arrival')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 text-[11px] ${
              activeLens === 'arrival'
                ? 'bg-[#D97706] text-white shadow-xs'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            <span>Arrival Volatility</span>
          </button>

          <button
            onClick={() => setActiveLens('logistics')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 text-[11px] ${
              activeLens === 'logistics'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'text-blue-700 hover:bg-blue-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            <span>Logistics Delay</span>
          </button>

          <button
            onClick={() => setActiveLens('composite')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all text-[11px] ${
              activeLens === 'composite'
                ? 'bg-[#1F2E0A] text-white shadow-xs'
                : 'text-[#6B7C4B] hover:text-[#1F2E0A] hover:bg-white/60'
            }`}
          >
            Composite Score
          </button>
        </div>
      </div>

      {/* Driver Metric Quick Filter Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div
          onClick={() => setActiveLens('price')}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            activeLens === 'price'
              ? 'bg-red-100/70 border-red-400 shadow-xs'
              : 'bg-red-50/50 border-red-200/70 hover:bg-red-100/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
              Price Pressure
            </span>
            <span className="text-xs font-bold text-red-900 font-mono">{driverCounts.price} Mandis</span>
          </div>
          <p className="text-[10px] text-red-700/80 mt-1">
            Peak: Khandwa (39.5% &lt; MSP)
          </p>
        </div>

        <div
          onClick={() => setActiveLens('arrival')}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            activeLens === 'arrival'
              ? 'bg-amber-100/70 border-amber-400 shadow-xs'
              : 'bg-amber-50/50 border-amber-200/70 hover:bg-amber-100/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Arrival Volatility
            </span>
            <span className="text-xs font-bold text-amber-900 font-mono">{driverCounts.arrival} Mandis</span>
          </div>
          <p className="text-[10px] text-amber-700/80 mt-1">
            Peak: Orai (34.4/100 score)
          </p>
        </div>

        <div
          onClick={() => setActiveLens('logistics')}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            activeLens === 'logistics'
              ? 'bg-blue-100/70 border-blue-400 shadow-xs'
              : 'bg-blue-50/50 border-blue-200/70 hover:bg-blue-100/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
              Logistics Delays
            </span>
            <span className="text-xs font-bold text-blue-900 font-mono">{driverCounts.logistics} Mandis</span>
          </div>
          <p className="text-[10px] text-blue-700/80 mt-1">
            Peak: Patiala (154.4h delay)
          </p>
        </div>

        <div
          onClick={() => setActiveLens('drivers')}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            activeLens === 'drivers'
              ? 'bg-[#EBF0DC] border-[#5B7B10]/40 shadow-xs'
              : 'bg-[#F4F6EC] border-[#5B7B10]/20 hover:bg-[#EBF0DC]/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#364E00] uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#65A30D] inline-block" />
              Operational Baseline
            </span>
            <span className="text-xs font-bold text-[#1F2E0A] font-mono">{driverCounts.baseline} Mandis</span>
          </div>
          <p className="text-[10px] text-[#526633] mt-1">
            Normal operational limits
          </p>
        </div>
      </div>

      {/* Indian Geo-Canvas Scatter Map (De-cluttered) */}
      <div className="relative">
        {validPoints.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[320px]">
            <MapPin className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="text-base font-bold text-slate-700">Location Data Unavailable</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Geographic coordinates are currently not mapped for the selected filters. All analytical risk calculations remain accessible via the directory table below.
            </p>
          </div>
        ) : (
          <ReactECharts
            option={option}
            notMerge={true}
            style={{ height: '390px', width: '100%' }}
            onEvents={{ click: onChartClick }}
          />
        )}

        {unmappedCount > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center space-x-1 text-[10px] text-amber-800 bg-amber-50/90 backdrop-blur-xs px-2.5 py-1 rounded-full border border-amber-200">
            <Info className="w-3 h-3 text-amber-600" />
            <span>{unmappedCount} mandis unmapped</span>
          </div>
        )}
      </div>

      {/* Necessary Indian Geographic Telemetry Insights Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-3 border-t border-[#5B7B10]/15">
        <div className="p-3 bg-red-50/80 rounded-xl border border-red-200 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-red-900 text-xs">
            <Flame className="w-3.5 h-3.5 text-red-600" />
            <span>Gangetic Price Floor Failure</span>
          </div>
          <p className="text-[11px] text-red-800">
            Khandwa & Baranagar APMCs exhibit severe price pressure with <strong>39.5%</strong> trades failing floor MSP.
          </p>
        </div>

        <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <span>North Transit Bottlenecks</span>
          </div>
          <p className="text-[11px] text-blue-800">
            Patiala & Ambala corridors experiencing peak transit delays averaging <strong>44.6 hours</strong> per shipment.
          </p>
        </div>

        <div className="p-3 bg-[#F4F6EC] rounded-xl border border-[#5B7B10]/20 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-[#1F2E0A] text-xs">
            <ShieldAlert className="w-3.5 h-3.5 text-[#5B7B10]" />
            <span>Western APMC Stability</span>
          </div>
          <p className="text-[11px] text-[#526633]">
            Gujarat & Maharashtra hubs maintaining optimal <strong>98.1%</strong> on-time SLA delivery and stable floor prices.
          </p>
        </div>
      </div>
    </div>
  );
}
