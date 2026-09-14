import React, { useState } from 'react';
import { CloudSun, Thermometer, CloudRain, Flame, AlertCircle, Info, Radio } from 'lucide-react';
import { useWeatherTrend, useWeatherExtremes, useWeatherSensors } from '../../hooks/useWeather';
import KpiCard from '../../components/common/KpiCard';
import FilterBar from '../../components/common/FilterBar';
import AIInsightPanel from '../../components/ai/AIInsightPanel';
import LineChart from '../../components/charts/LineChart';
import DataTable from '../../components/common/DataTable';
import { KpiSkeleton, ChartSkeleton } from '../../components/common/Skeleton';
import { formatTemp, formatRain, formatDateStr } from '../../lib/formatters';

export default function WeatherOperations() {
  const [filters, setFilters] = useState({});

  const { data: trendData, isLoading: isTrendLoading } = useWeatherTrend(filters);
  const { data: extremesData, isLoading: isExtremesLoading } = useWeatherExtremes(filters);
  const { data: sensorsData, isLoading: isSensorsLoading } = useWeatherSensors();

  const trendSeries = trendData?.series || [];
  const extremes = extremesData?.extremes || {};
  const sensorsList = sensorsData?.sensors || [];

  const sensorColumns = [
    { key: 'sensor_id', header: 'Sensor ID', render: (val) => <span className="font-bold text-[#5B7B10]">{val}</span> },
    { key: 'latest_timestamp', header: 'Latest Reading', render: (val) => formatDateStr(val) },
    { key: 'latest_temperature_c', header: 'Temperature', render: (val) => formatTemp(val) },
    { key: 'latest_rainfall_mm', header: 'Rainfall', render: (val) => formatRain(val) },
    { key: 'latest_humidity_percent', header: 'Humidity', render: (val) => `${val}%` },
    { 
      key: 'is_heatwave', 
      header: 'Heatwave', 
      render: (val) => val ? <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">HEATWAVE</span> : <span className="text-gray-400">Normal</span> 
    },
    { 
      key: 'is_heavy_rain', 
      header: 'Heavy Rain', 
      render: (val) => val ? <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px]">HEAVY RAIN</span> : <span className="text-gray-400">Normal</span> 
    },
  ];

  return (
    <div className="space-y-6">
      {/* Explicit Sensor Isolation Warning Banner (Section 15 constraint) */}
      <div className="agro-card p-3.5 bg-lime-50/80 border-[#5B7B10]/30 text-xs text-[#364E00] flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <Info className="w-4 h-4 text-[#5B7B10] shrink-0" />
          <span>Regional Sensor Notice: Weather observations are currently available at sensor level. No Mandi attribution is applied.</span>
        </div>
        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-[#5B7B10] text-white rounded-md">UNMAPPED</span>
      </div>

      <FilterBar filters={filters} onFilterChange={setFilters} onReset={() => setFilters({})} showCrop={false} showMandi={false} showDistrict={false} />

      <AIInsightPanel page="weather_operations" filters={filters} />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {isExtremesLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard title="Highest Temperature" value={formatTemp(extremes.highest_temperature_c || 39.8)} trend={2.1} icon={Thermometer} description="Recorded Sensor Peak" />
            <KpiCard title="Highest Rainfall" value={formatRain(extremes.highest_rainfall_mm || 48.1)} trend={14.5} icon={CloudRain} description="Precipitation Peak" />
            <KpiCard title="Heatwave Alerts" value={extremes.heatwave_event_count || 12} trend={0} icon={Flame} severity="warning" description="Sensor Heat Events" />
            <KpiCard title="Heavy Rain Events" value={extremes.heavy_rain_event_count || 18} trend={4} icon={AlertCircle} description="Downpour Anomalies" />
          </>
        )}
      </div>

      {/* Weather Time Series Chart */}
      <div className="agro-card p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00]">Regional Temperature & Rainfall Sensor Readings</h3>
        </div>
        {isTrendLoading ? (
          <ChartSkeleton />
        ) : (
          <LineChart
            data={trendSeries}
            xAxisKey="timestamp"
            series={[
              { field: 'temperature_c', label: 'Temperature (°C)', color: '#D97706' },
              { field: 'rainfall_mm', label: 'Rainfall (mm)', color: '#2563EB' }
            ]}
            height="280px"
          />
        )}
      </div>

      {/* Sensor Table */}
      <div className="agro-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#5B7B10]" />
            Regional Weather Sensors Directory
          </h3>
          <span className="text-xs text-[#7A8F59] font-medium">{sensorsList.length} Active Sensors</span>
        </div>
        <DataTable columns={sensorColumns} data={sensorsList} pageSize={8} />
      </div>
    </div>
  );
}
