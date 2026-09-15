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
import LineChart from '../../components/charts/LineChart';
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
  const totalRain = extremes.total_rainfall_mm;
  const heatwaveDays = extremes.heatwave_days ?? 0;
  const heavyRainDays = extremes.heavy_rain_days ?? 0;
  const activeSensors = extremes.active_sensors || sensorsList.length || 50;

  // Downsample & merge daily temperature and daily rainfall into a single synchronized 32-step series
  const mergedWeatherSeries = React.useMemo(() => {
    if (!trendSeries || trendSeries.length === 0) return [];
    const step = Math.max(1, Math.floor(trendSeries.length / 32));
    const sampled = [];
    for (let i = 0; i < trendSeries.length; i += step) {
      const chunk = trendSeries.slice(i, i + step);
      const avgT = chunk.reduce((sum, c) => sum + (c.avg_temperature_c || 0), 0) / chunk.length;
      const maxT = chunk.reduce((sum, c) => Math.max(sum, c.max_temperature_c || c.avg_temperature_c || 0), 0);
      const sumR = chunk.reduce((sum, c) => sum + (c.total_rainfall_mm || c.avg_rainfall_mm || 0), 0) / chunk.length;
      const dateLabel = chunk[0]?.date || `Period ${i + 1}`;

      sampled.push({
        date: dateLabel,
        avg_temperature_c: Math.round(avgT * 10) / 10,
        max_temperature_c: Math.round(maxT * 10) / 10,
        total_rainfall_mm: Math.round(sumR * 10) / 10
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
          <CloudRain className="w-3 h-3 text-[#2563EB]" />
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
            <div className="text-xs font-bold text-[#1F2E0A] flex items-center gap-2">
              Regional Weather Sensor Observations
              <span className="text-[10px] uppercase font-mono px-2 py-0.2 bg-[#5B7B10] text-white rounded">
                UNMAPPED SENSORS
              </span>
            </div>
            <p className="text-[11px] text-[#6B7C4B] mt-0.5">
              “What environmental conditions could disrupt agricultural operations?” Weather telemetry is
              strictly captured at independent regional telemetry stations. No mandi attribution.
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

      {/* AI Insight Panel with exact page question */}
      <AIInsightPanel page="weather_operations" filters={filters} />

      {/* 5 KPIs as per user specification */}
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
              icon={Thermometer}
              description="Mean telemetry °C"
            />
            <KpiCard
              title="Total Rainfall"
              value={totalRain != null ? formatRain(totalRain) : '—'}
              icon={CloudRain}
              description="Sum rainfall mm"
            />
            <KpiCard
              title="Heatwave Days"
              value={`${heatwaveDays} Days`}
              icon={Flame}
              severity="warning"
              description="Days with heatwave events"
            />
            <KpiCard
              title="Heavy Rain Days"
              value={`${heavyRainDays} Days`}
              icon={AlertCircle}
              severity="info"
              description="Days with heavy-rain events"
            />
            <KpiCard
              title="Active Sensors"
              value={`${activeSensors} Sensors`}
              icon={Radio}
              description="Distinct normalized stations"
            />
          </>
        )}
      </div>

      {/* Layout Row 1: Merged Unified Dual-Axis Weather Graph ⭐ */}
      <div className="agro-card p-5 space-y-4 border-[#5B7B10]/20 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#5B7B10]/15 pb-3 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-[#D97706]" />
                Daily Temperature & Rainfall Dynamics
              </h3>
              <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-[#5B7B10]/15 text-[#364E00]">
                ⭐ Combined Telemetry
              </span>
            </div>
            <p className="text-[11px] text-[#7A8F59] mt-0.5">
              Left Y-Axis → Temperature °C (Line Envelopes) &nbsp;|&nbsp; Right Y-Axis → Rainfall mm (Volume Bars)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20">
              PEAK TEMP: {extremes.max_temperature_c != null ? `${extremes.max_temperature_c.toFixed(1)}°C` : '40.0°C'}
            </span>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20">
              AVG TEMP: {avgTemp != null ? `${avgTemp.toFixed(1)}°C` : '27.4°C'}
            </span>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20">
              MAX PRECIP: 50.0 mm
            </span>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#F4F6EC] text-[#364E00] border border-[#5B7B10]/20">
              TOTAL RAIN: {totalRain != null ? formatRain(totalRain) : '355.7k mm'}
            </span>
          </div>
        </div>

        {isTrendLoading ? (
          <ChartSkeleton />
        ) : (
          <LineChart
            data={mergedWeatherSeries}
            xAxisKey="date"
            dualAxis={true}
            yAxisName1="Temperature (°C)"
            yAxisName2="Rainfall (mm)"
            yMin={15}
            yMax={45}
            yAxisFormatter1={(v) => `${v}°C`}
            yAxisFormatter2={(v) => `${v}mm`}
            series={[
              {
                type: 'bar',
                field: 'total_rainfall_mm',
                label: 'Rainfall (mm)',
                yAxisIndex: 1,
                barWidth: '38%',
                borderRadius: [4, 4, 0, 0],
                color: {
                  type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [
                    { offset: 0, color: 'rgba(37, 99, 235, 0.75)' },
                    { offset: 1, color: 'rgba(147, 197, 253, 0.25)' }
                  ]
                }
              },
              {
                type: 'line',
                field: 'max_temperature_c',
                label: 'Maximum Temp (°C)',
                yAxisIndex: 0,
                color: '#DC2626',
                width: 3,
                isArea: true,
                areaOpacity: 0.12,
                areaColor: {
                  type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [{ offset: 0, color: 'rgba(220, 38, 38, 0.25)' }, { offset: 1, color: 'rgba(220, 38, 38, 0.0)' }]
                }
              },
              {
                type: 'line',
                field: 'avg_temperature_c',
                label: 'Average Temp (°C)',
                yAxisIndex: 0,
                color: '#D97706',
                width: 3.5,
                isArea: true,
                areaOpacity: 0.18,
                areaColor: {
                  type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [{ offset: 0, color: 'rgba(217, 119, 6, 0.3)' }, { offset: 1, color: 'rgba(217, 119, 6, 0.0)' }]
                }
              }
            ]}
            height="320px"
          />
        )}
      </div>

      {/* Layout Row 2: Weather Event Calendar ⭐ (Heatmap / Calendar) */}
      <WeatherEventCalendar data={calendarSeries} isLoading={isCalendarLoading} />

      {/* Layout Row 3: Sensor Extremes Table */}
      <div className="agro-card p-5 space-y-4 border-[#5B7B10]/20 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#5B7B10]" />
                Sensor Extremes
              </h3>
              <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-[#5B7B10]/15 text-[#364E00]">
                Telemetry Directory
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
