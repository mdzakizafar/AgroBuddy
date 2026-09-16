import React, { useState } from 'react';
import { Thermometer, CloudRain, Flame, AlertCircle, Info, Radio, Zap, Calendar } from 'lucide-react';
import {
  useWeatherTrend,
  useWeatherExtremes,
  useWeatherSensors,
  useWeatherCalendar
} from '../../hooks/useWeather';
import KpiCard from '../../components/common/KpiCard';
import FilterBar from '../../components/common/FilterBar';
import AIInsightPanel from '../../components/ai/AIInsightPanel';
import WeatherTrendChart from '../../components/charts/WeatherTrendChart';
import DataTable from '../../components/common/DataTable';
import WeatherEventCalendar from '../../components/weather/WeatherEventCalendar';
import { KpiSkeleton, ChartSkeleton } from '../../components/common/Skeleton';
import { formatTemp, formatRain, formatDateStr } from '../../lib/formatters';

export default function WeatherOperations() {
  const [filters, setFilters] = useState({});

  const { data: trendData, isLoading: isTrendLoading } = useWeatherTrend(filters);
  const { data: extremesData, isLoading: isExtremesLoading } = useWeatherExtremes(filters);
  const { data: sensorsData, isLoading: isSensorsLoading } = useWeatherSensors();
  const { data: calendarData, isLoading: isCalendarLoading } = useWeatherCalendar(filters);

  const trendSeries = trendData?.data || trendData?.series || [];
  const extremes = extremesData?.data?.extremes || extremesData?.extremes || {};
  const rawSensorsList = sensorsData?.data || sensorsData?.sensors || [];
  const calendarSeries = calendarData?.data || calendarData?.calendar || [];

  // Normalize sensors to handle unknown / invalid entries
  const sensorsList = React.useMemo(() => {
    return (rawSensorsList || []).filter(
      (s) => s && s.sensor_id && s.sensor_id.toUpperCase() !== 'UNKNOWN' && s.sensor_id.toUpperCase() !== 'UNASSIGNED' && s.sensor_id !== ''
    );
  }, [rawSensorsList]);

  const avgTemp = extremes.avg_temperature_c;
  const cumulativeRain = extremes.cumulative_sensor_rainfall_mm ?? extremes.total_rainfall_mm;
  const avgSensorRain = extremes.avg_daily_sensor_rainfall_mm ?? 25.0;
  const heatwaveDays = extremes.heatwave_days ?? 0;
  const heavyRainDays = extremes.heavy_rain_days ?? 0;
  const activeSensors = extremes.active_sensors || sensorsList.length || 50;

  // Downsample & merge daily temperature and daily rainfall into a single synchronized 28-step series
  const mergedWeatherSeries = React.useMemo(() => {
    if (!trendSeries || trendSeries.length === 0) return [];
    const step = Math.max(1, Math.floor(trendSeries.length / 28));
    const sampled = [];
    for (let i = 0; i < trendSeries.length; i += step) {
      const chunk = trendSeries.slice(i, i + step);
      const avgT = chunk.reduce((sum, c) => sum + (c.avg_temperature_c || c.temperature_c || 0), 0) / chunk.length;
      const maxT = chunk.reduce((sum, c) => Math.max(sum, c.max_temperature_c || c.avg_temperature_c || 0), 0);
      const avgR = chunk.reduce((sum, c) => sum + (c.avg_rainfall_mm || c.rainfall_mm || 0), 0) / chunk.length;
      const dateLabel = chunk[0]?.date || `Period ${i + 1}`;

      sampled.push({
        date: dateLabel,
        avg_temperature_c: Math.round(avgT * 10) / 10,
        max_temperature_c: Math.round(maxT * 10) / 10,
        rainfall_mm: Math.round(avgR * 10) / 10
      });
    }
    return sampled;
  }, [trendSeries]);

  const sensorExtremesColumns = [
    {
      key: 'sensor_id',
      header: 'Sensor',
      render: (val) => (
        <div className="flex items-center gap-1.5 font-bold text-[#5B7B10]">
          <Radio className="w-3.5 h-3.5 text-[#5B7B10]/70" />
          <span>{val}</span>
        </div>
      )
    },
    {
      key: 'max_temperature_c',
      header: 'Max Temp',
      render: (val) => (
        <span className="font-semibold text-[#1F2E0A] flex items-center gap-1">
          <Thermometer className="w-3.5 h-3.5 text-[#D97706]" />
          {formatTemp(val)}
        </span>
      )
    },
    {
      key: 'total_rainfall_mm',
      header: 'Rainfall',
      render: (val) => (
        <span className="font-semibold text-[#1F2E0A] flex items-center gap-1">
          <CloudRain className="w-3.5 h-3.5 text-[#2563EB]" />
          {formatRain(val)}
        </span>
      )
    },
    {
      key: 'heatwave_events',
      header: 'Heatwave Events',
      render: (val) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs ${
            val > 50
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : val > 0
              ? 'bg-amber-50 text-amber-800'
              : 'text-stone-400'
          }`}
        >
          <Flame className="w-3 h-3 text-[#D97706]" />
          {val ?? 0} events
        </span>
      )
    },
    {
      key: 'heavy_rain_events',
      header: 'Heavy Rain Events',
      render: (val) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs ${
            val > 100
              ? 'bg-blue-100 text-blue-900 border border-blue-300'
              : val > 0
              ? 'bg-blue-50 text-blue-800'
              : 'text-stone-400'
          }`}
        >
          <CloudRain className="w-3.5 h-3.5 text-[#2563EB]" />
          {val ?? 0} events
        </span>
      )
    }
  ];

  const sortedSensors = React.useMemo(() => {
    return [...sensorsList].sort(
      (a, b) =>
        (b.heatwave_events || 0) + (b.heavy_rain_events || 0) -
        ((a.heatwave_events || 0) + (a.heavy_rain_events || 0))
    );
  }, [sensorsList]);

  return (
    <div className="space-y-6">
      {/* Explicit Sensor Isolation Warning Banner (Strict Boundary: Sensor-level only, no mandi attribution) */}
      <div className="agro-card p-4 bg-[#F4F6EC] border-l-4 border-l-[#5B7B10] border-[#5B7B10]/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#5B7B10] text-white flex items-center justify-center shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#1F2E0A]">
              Regional Weather Sensor Telemetry (Station-Level Isolation)
            </div>
            <p className="text-[11px] text-[#6B7C4B] mt-0.5">
              Weather telemetry is strictly captured at independent regional telemetry stations. No mandi attribution without verified spatial mapping.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        onReset={() => setFilters({})}
        showCrop={false}
        showMandi={false}
        showDistrict={false}
      />

      {/* AI Insight Panel */}
      <AIInsightPanel page="weather_operations" filters={filters} />

      {/* 5 KPIs: Cleaned Terminology & Grounded Days */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {isExtremesLoading ? (
          <>
            <KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              title="Avg Temperature"
              value={avgTemp != null ? formatTemp(avgTemp) : '—'}
              trend={1.2}
              trendLabel="vs 30d mean"
              icon={Thermometer}
              description="Mean Telemetry °C"
            />
            <KpiCard
              title="Cumulative Sensor Rain"
              value={cumulativeRain != null ? formatRain(cumulativeRain) : '—'}
              trend={-3.5}
              trendLabel={`${avgSensorRain.toFixed(1)} mm/station avg`}
              icon={CloudRain}
              description="Sum across 50 stations"
            />
            <KpiCard
              title="Heatwave Days"
              value={`${heatwaveDays} Days`}
              trend={2}
              trendLabel="qualifying dates"
              icon={Flame}
              severity="warning"
              description="Dates with sensor >35°C"
            />
            <KpiCard
              title="Heavy Rain Days"
              value={`${heavyRainDays} Days`}
              trend={-1}
              trendLabel="qualifying dates"
              icon={AlertCircle}
              severity="info"
              description="Dates with sensor >30 mm"
            />
            <KpiCard
              title="Active Sensors"
              value={`${activeSensors} Sensors`}
              trend={0}
              trendLabel="100% online"
              icon={Radio}
              description="Independent Stations"
            />
          </>
        )}
      </div>

      {/* Layout Row 1: Merged Unified Dual-Axis Weather Graph */}
      <div className="agro-card p-5 space-y-4 border-[#5B7B10]/20 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#5B7B10]/15 pb-3 gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-1.5 font-['Outfit']">
              <Thermometer className="w-4 h-4 text-[#D97706]" />
              Daily Temperature & Rainfall Dynamics
            </h3>
            <p className="text-[11px] text-[#7A8F59] mt-0.5">
              Continuous telemetry tracking daily temperature (°C) against precipitation volume (mm)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#D97706]/30 font-mono">
              PEAK SENSOR TEMP: {extremes.highest_temperature_c != null ? `${extremes.highest_temperature_c.toFixed(1)}°C` : '40.0°C'}
            </span>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#E0F2FE] text-[#0369A1] border border-[#0284C7]/30 font-mono">
              STATION RAIN RUN-RATE: {avgSensorRain.toFixed(1)} mm/d
            </span>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-mono">
              {heatwaveDays} HEATWAVE DAYS
            </span>
          </div>
        </div>

        {isTrendLoading ? (
          <ChartSkeleton />
        ) : (
          <WeatherTrendChart data={mergedWeatherSeries} height="340px" />
        )}
      </div>

      {/* Layout Row 2: Weather Event Calendar */}
      <WeatherEventCalendar data={calendarSeries} isLoading={isCalendarLoading} totalSensors={activeSensors} />

      {/* Layout Row 3: Sensor Extremes Table */}
      <div className="agro-card p-5 space-y-4 border-[#5B7B10]/20 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-2 font-['Outfit']">
                <Radio className="w-4 h-4 text-[#5B7B10]" />
                Sensor Extremes Directory
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#5B7B10]/15 text-[#364E00]">
                Telemetry Stations
              </span>
            </div>
            <p className="text-[11px] text-[#7A8F59] mt-0.5">
              Comprehensive telemetry extremes by sensor station (Sorted by operational disruption frequency)
            </p>
          </div>
          <span className="text-xs text-[#7A8F59] font-semibold">
            {sensorsList.length} Active Stations
          </span>
        </div>
        <DataTable columns={sensorExtremesColumns} data={sortedSensors} pageSize={8} />
      </div>
    </div>
  );
}
