import React, { useState } from 'react';
import { 
  TrendingUp, 
  Coins, 
  Truck, 
  ShieldAlert, 
  CloudSun, 
  Zap, 
  Layers, 
  Activity, 
  ArrowUpRight, 
  AlertCircle, 
  CheckCircle2,
  Building2,
  Calendar
} from 'lucide-react';
import { useOverview } from '../../hooks/useOverview';
import KpiCard from '../../components/common/KpiCard';
import FilterBar from '../../components/common/FilterBar';
import AIInsightPanel from '../../components/ai/AIInsightPanel';
import AreaChart from '../../components/charts/AreaChart';
import BarChart from '../../components/charts/BarChart';
import DonutChart from '../../components/charts/DonutChart';
import DataTable from '../../components/common/DataTable';
import MandiDetailDrawer from '../../components/mandi/MandiDetailDrawer';
import { KpiSkeleton, ChartSkeleton } from '../../components/common/Skeleton';
import { formatCurrency, formatQtl, formatPct, formatHours } from '../../lib/formatters';

export default function CommandCenter() {
  const [filters, setFilters] = useState({});
  const [selectedMandiId, setSelectedMandiId] = useState(null);
  const { data, isLoading, refetch } = useOverview(filters);

  const kpis = data?.kpis || {};
  const topCrops = data?.top_arrival_crops || [];
  const pricePressure = data?.mandis_under_price_pressure || [];
  const worstLogistics = data?.worst_logistics_mandis || [];

  // Simulated 6x12 Mandi Array Output Grid from Mockup 2
  const mandiGrid = Array.from({ length: 72 }, (_, i) => {
    const id = `M${String(i + 1).padStart(2, '0')}`;
    let status = 'normal'; // green
    if (i === 18 || i === 23 || i === 41 || i === 67) status = 'warning'; // amber
    if (i === 39 || i === 57) status = 'alert'; // red
    return { id, status, code: `MANDI0${(i % 55) + 1}` };
  });

  // Sample Arrival Trend for Hero Area Chart
  const sampleTrend = Array.from({ length: 30 }, (_, i) => ({
    date: `Day ${i + 1}`,
    arrival_qtl: Math.round(350 + Math.sin(i / 2) * 120 + (i * 8))
  }));

  const forecastData = [
    { hour: '08:00', val: 842 },
    { hour: '10:00', val: 895 },
    { hour: '12:00', val: 860 },
    { hour: '14:00', val: 712 },
    { hour: '16:00', val: 548 },
    { hour: '18:00', val: 381 },
    { hour: '20:00', val: 384 },
  ];

  const columns = [
    { key: 'mandi_name', header: 'Mandi Name' },
    { key: 'district', header: 'District' },
    { 
      key: 'below_msp_percentage', 
      header: 'Below MSP %',
      render: (val) => (
        <span className={`font-bold ${val > 40 ? 'text-red-600' : 'text-lime-700'}`}>
          {formatPct(val)}
        </span>
      )
    },
    { 
      key: 'avg_msp_gap', 
      header: 'Avg MSP Gap',
      render: (val) => (
        <span className="font-semibold text-[#1F2E0A]">{formatCurrency(val)}</span>
      )
    },
  ];

  return (
    <div className="space-y-6">
      {/* Global Context Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        onReset={() => setFilters({})}
      />

      {/* Passive AI Insight Panel */}
      <AIInsightPanel page="command_center" filters={filters} />

      {/* TOP SECTION (Replicating Hero Dark Dashboard Card from Mockup 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Hero Card: Current Output / Live Arrivals */}
        <div className="lg:col-span-2 agro-card-dark p-6 flex flex-col justify-between relative overflow-hidden">
          {/* Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-lime-500/20 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#84CC16] bg-[#84CC16]/20 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#84CC16] live-dot animate-pulse" />
                  CURRENT OUTPUT • LIVE
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold font-['Outfit'] tracking-tight text-white">
                  {formatQtl(kpis.total_arrivals_qtl || 21460)}
                </span>
                <span className="text-xs text-[#A3B882]">
                  73% of 29.5k Qtl capacity • {kpis.mandi_count || 56} mandis active
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3B882]">PEAK TODAY</p>
                <p className="text-lg font-bold text-white">24.8k Qtl</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3B882]">PERFORMANCE</p>
                <p className="text-lg font-bold text-[#84CC16]">102.4% <span className="text-xs text-[#A3B882]">vs forecast</span></p>
              </div>
            </div>
          </div>

          {/* Curved Area Chart from Mockup 2 */}
          <div className="w-full relative">
            <AreaChart data={sampleTrend} xAxisKey="date" seriesKey="arrival_qtl" height="220px" color="#84CC16" dark={true} />
          </div>
        </div>

        {/* Right Top Panel: Supply & Logistics Distribution */}
        <div className="agro-card p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#5B7B10]" />
              Supply Flow Distribution
            </h3>
            <span className="text-[10px] font-semibold text-[#7A8F59]">NOW</span>
          </div>

          <div className="space-y-3.5 flex-1 justify-center flex flex-col">
            {/* Flow 1 */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-[#1F2E0A]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#5B7B10]" />
                  To Central Warehouses
                </span>
                <span>8.2k Qtl <span className="text-[#6B7C4B] font-normal">(38%)</span></span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-[#5B7B10] h-full rounded-full" style={{ width: '38%' }} />
              </div>
            </div>

            {/* Flow 2 */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-[#1F2E0A]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#D97706]" />
                  To Regional Processing
                </span>
                <span>3.2k Qtl <span className="text-[#6B7C4B] font-normal">(15%)</span></span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-[#D97706] h-full rounded-full" style={{ width: '15%' }} />
              </div>
            </div>

            {/* Flow 3 */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-[#1F2E0A]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#2563EB]" />
                  To Export Terminals
                </span>
                <span>10.1k Qtl <span className="text-[#6B7C4B] font-normal">(47%)</span></span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-[#2563EB] h-full rounded-full" style={{ width: '47%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE KPI CARDS ROW (4 KPI Cards from Mockup 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {isLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              title="Today's Arrivals"
              value={formatQtl(kpis.total_arrivals_qtl || 14280)}
              trend={8.2}
              trendLabel="vs yesterday"
              icon={TrendingUp}
              description="56 mandis active"
            />
            <KpiCard
              title="Average Modal Price"
              value={formatCurrency(kpis.avg_modal_price || 2248)}
              trend={11.4}
              trendLabel="vs last week"
              icon={Coins}
              description="State average realization"
            />
            <KpiCard
              title="MSP Gap Pressure"
              value={formatCurrency(kpis.avg_msp ? kpis.avg_msp - kpis.avg_modal_price : 27)}
              trend={-4.2}
              trendLabel="gap reduction"
              icon={ShieldAlert}
              description={`${formatPct(kpis.below_msp_percentage || 42.3)} below MSP`}
            />
            <KpiCard
              title="Logistics Delay Rate"
              value={formatPct(kpis.delayed_trip_percentage || 14.2)}
              trend={-3.1}
              trendLabel="transit improvement"
              icon={Truck}
              description={`${formatHours(kpis.average_delay_hours || 4.8)} avg delay`}
            />
          </>
        )}
      </div>

      {/* MAIN MIDDLE SECTION (Mandi Health Grid + Donut Gauge + Forecast Bar Chart from Mockup 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6-cols: Mandi Array Output Matrix Grid */}
        <div className="lg:col-span-6 agro-card p-5 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#5B7B10]" />
                Mandi Array Health Output
              </h3>
              <p className="text-[10px] text-[#7A8F59]">56 Active Mandi Nodes • Real-time Monitoring</p>
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-[#5B7B10]/10 text-[#364E00] rounded-md border border-[#5B7B10]/20">
              6 STRINGS • 72 MODULES
            </span>
          </div>

          {/* 6x12 Matrix Blocks from Mockup 2 */}
          <div className="grid grid-cols-12 gap-1.5 p-2 bg-[#F6F8EF] rounded-xl border border-[#5B7B10]/15">
            {mandiGrid.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMandiId(m.code)}
                title={`${m.id} (${m.code}): ${m.status}`}
                className={`h-7 rounded-md text-[9px] font-extrabold transition-all flex items-center justify-center border shadow-2xs ${
                  m.status === 'alert'
                    ? 'bg-red-500 text-white border-red-600 animate-pulse'
                    : m.status === 'warning'
                    ? 'bg-amber-400 text-amber-950 border-amber-500'
                    : 'bg-[#84CC16] text-[#1C270A] border-[#65A30D] hover:scale-105'
                }`}
              >
                {m.id}
              </button>
            ))}
          </div>

          {/* Grid Footer status message from Mockup 2 */}
          <div className="flex items-center justify-between text-xs text-[#526633] pt-2 border-t border-[#5B7B10]/10">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="font-semibold text-[#1F2E0A]">
                2 mandis flagged — MANDI023 underperforming (-12%), MANDI019 delayed transit
              </span>
            </div>
          </div>
        </div>

        {/* Center 3-cols: MSP Pressure Donut Gauge */}
        <div className="lg:col-span-3 agro-card p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00]">
              MSP Capacity Watch
            </h3>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
              BEING MONITORED
            </span>
          </div>

          <DonutChart
            percentage={82}
            valueText={`${formatPct(kpis.below_msp_percentage || 42.3)}`}
            subText="Below MSP Rate"
            height="180px"
          />

          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold text-[#364E00] pt-2 border-t border-[#5B7B10]/10">
            <div className="bg-[#F4F6EC] p-1.5 rounded-lg border border-[#5B7B10]/10">
              <p className="text-[#7A8F59]">FULL BY</p>
              <p className="text-[#1F2E0A]">15:40</p>
            </div>
            <div className="bg-[#F4F6EC] p-1.5 rounded-lg border border-[#5B7B10]/10">
              <p className="text-[#7A8F59]">CYCLES</p>
              <p className="text-[#1F2E0A]">412</p>
            </div>
            <div className="bg-[#F4F6EC] p-1.5 rounded-lg border border-[#5B7B10]/10">
              <p className="text-[#7A8F59]">TEMP</p>
              <p className="text-[#1F2E0A]">28°C</p>
            </div>
          </div>
        </div>

        {/* Right 3-cols: Irradiance / Arrival Forecast Vertical Bar Chart */}
        <div className="lg:col-span-3 agro-card p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00]">
              Arrival Forecast
            </h3>
            <span className="text-[10px] text-[#7A8F59] font-semibold">Qtl / hr</span>
          </div>

          <BarChart
            data={forecastData}
            xAxisKey="hour"
            series={[{ field: 'val', label: 'Expected Arrivals' }]}
            height="180px"
          />

          <div className="bg-[#F4F6EC] p-2.5 rounded-xl border border-[#5B7B10]/15 text-xs text-[#2A3B0F] flex items-center gap-2">
            <CloudSun className="w-4 h-4 text-[#D97706] shrink-0" />
            <div>
              <p className="font-bold text-[#1F2E0A]">Tomorrow — partly cloudy</p>
              <p className="text-[10px] text-[#6B7C4B]">Est. yield 118 Qtl • peak 21Qtl around 12:30</p>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION (Mandi Operations Table + Live AI Alerts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2-cols: Price Pressure Mandi Table */}
        <div className="lg:col-span-2 agro-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#5B7B10]" />
                Mandis Under Price Pressure
              </h3>
              <p className="text-[10px] text-[#7A8F59]">Priority interventions required for Mandis below MSP</p>
            </div>
            <button className="text-xs font-bold text-[#5B7B10] hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <DataTable
            columns={columns}
            data={pricePressure.length > 0 ? pricePressure : [
              { mandi_name: 'Amritsar Mandi', district: 'Amritsar', below_msp_percentage: 45.2, avg_msp_gap: 320.0 },
              { mandi_name: 'Patiala Grain Market', district: 'Patiala', below_msp_percentage: 42.0, avg_msp_gap: 280.0 },
              { mandi_name: 'Bathinda APMC', district: 'Bathinda', below_msp_percentage: 38.5, avg_msp_gap: 210.0 },
              { mandi_name: 'Ludhiana Mandi', district: 'Ludhiana', below_msp_percentage: 35.1, avg_msp_gap: 190.0 },
            ]}
            pageSize={5}
            onRowClick={(row) => setSelectedMandiId(row.mandi_id || 'MANDI001')}
          />
        </div>

        {/* Right 1-col: Live AI Operations Alerts List */}
        <div className="agro-card p-5 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#EF4444]" />
              Operations Alerts
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
              3 OPEN
            </span>
          </div>

          <div className="space-y-3 flex-1">
            <div className="p-3 bg-red-50/80 border border-red-200 rounded-xl space-y-1">
              <div className="flex justify-between items-center text-xs font-bold text-red-900">
                <span>MANDI023 offline — no output</span>
                <span className="text-[10px] text-red-600">2h ago</span>
              </div>
              <p className="text-[11px] text-red-700">Arrival reports halted. Logistics delayed by 4.2 hours.</p>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
              <div className="flex justify-between items-center text-xs font-bold text-amber-900">
                <span>MANDI031 derating — high MSP gap</span>
                <span className="text-[10px] text-amber-600">50m ago</span>
              </div>
              <p className="text-[11px] text-amber-700">Modal price dropped 12% below MSP for Wheat.</p>
            </div>

            <div className="p-3 bg-[#F4F6EC] border border-[#5B7B10]/20 rounded-xl space-y-1">
              <div className="flex justify-between items-center text-xs font-bold text-[#1F2E0A]">
                <span>Weather Alert SEN048</span>
                <span className="text-[10px] text-[#7A8F59]">1h ago</span>
              </div>
              <p className="text-[11px] text-[#526633]">Heavy rain sensor alert (43.9 mm) logged.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mandi Drill-down Detail Drawer */}
      {selectedMandiId && (
        <MandiDetailDrawer mandiId={selectedMandiId} onClose={() => setSelectedMandiId(null)} />
      )}
    </div>
  );
}
