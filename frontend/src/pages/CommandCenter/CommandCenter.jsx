import React, { useState } from 'react';
import { 
  TrendingUp, 
  Coins, 
  Truck, 
  ShieldAlert, 
  CloudSun, 
  Layers, 
  Activity, 
  ArrowUpRight, 
  AlertCircle, 
  CheckCircle2,
  Building2
} from 'lucide-react';
import { useOverview } from '../../hooks/useOverview';
import KpiCard from '../../components/common/KpiCard';
import FilterBar from '../../components/common/FilterBar';
import AIInsightPanel from '../../components/ai/AIInsightPanel';
import AreaChart from '../../components/charts/AreaChart';
import BarChart from '../../components/charts/BarChart';
import DonutChart from '../../components/charts/DonutChart';
import DataTable from '../../components/common/DataTable';
import MandiPerformanceMatrix from '../../components/charts/MandiPerformanceMatrix';
import MandiSupplyConcentration from '../../components/charts/MandiSupplyConcentration';
import MandiDetailDrawer from '../../components/mandi/MandiDetailDrawer';
import { KpiSkeleton } from '../../components/common/Skeleton';
import { formatCurrency, formatQtl, formatPct } from '../../lib/formatters';

export default function CommandCenter() {
  const [filters, setFilters] = useState({});
  const [selectedMandiId, setSelectedMandiId] = useState(null);
  const { data, isLoading } = useOverview(filters);

  const kpis = data?.kpis || {};
  const pricePressure = data?.mandis_under_price_pressure || [];
  const arrivalTrend = data?.arrival_trend || [];
  const performanceMatrix = data?.mandi_performance_matrix || [];
  const supplyConcentration = data?.mandi_supply_concentration || [];

  // Simulated 6x12 Mandi Array Output Grid from Mockup 2
  const mandiGrid = Array.from({ length: 72 }, (_, i) => {
    const id = `M${String(i + 1).padStart(2, '0')}`;
    let status = 'normal'; // green
    if (i === 18 || i === 23 || i === 41 || i === 67) status = 'warning'; // amber
    if (i === 39 || i === 57) status = 'alert'; // red
    return { id, status, code: `MANDI0${(i % 55) + 1}` };
  });

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
      render: (val, row) => {
        const v = val ?? row?.below_msp_rate ?? 0;
        return (
          <span className={`font-bold ${v > 40 ? 'text-red-600' : 'text-lime-700'}`}>
            {formatPct(v)}
          </span>
        );
      }
    },
    { 
      key: 'avg_msp_gap', 
      header: 'Avg MSP Gap',
      render: (val) => (
        <span className="font-semibold text-[#1F2E0A]">{formatCurrency(val)}</span>
      )
    },
  ];

  const totalArrivalsVal = kpis.total_arrivals_qtl || 5597535.54;
  const avgModalVal = kpis.avg_modal_price || 3798.71;
  const belowMspVal = kpis.below_msp_rate ?? kpis.below_msp_percentage ?? 30.55;
  const onTimeDeliveryVal = kpis.on_time_delivery_rate ?? 98.08;

  const displayTrend = React.useMemo(() => {
    if (!arrivalTrend || arrivalTrend.length === 0) {
      return [
        { date: 'Day 1', arrival_qtl: 340 },
        { date: 'Day 3', arrival_qtl: 480 },
        { date: 'Day 5', arrival_qtl: 490 },
        { date: 'Day 7', arrival_qtl: 410 },
        { date: 'Day 9', arrival_qtl: 320 },
        { date: 'Day 11', arrival_qtl: 400 },
        { date: 'Day 13', arrival_qtl: 530 },
        { date: 'Day 15', arrival_qtl: 620 },
        { date: 'Day 17', arrival_qtl: 580 },
        { date: 'Day 19', arrival_qtl: 460 },
        { date: 'Day 21', arrival_qtl: 480 },
        { date: 'Day 23', arrival_qtl: 590 },
        { date: 'Day 25', arrival_qtl: 650 },
        { date: 'Day 27', arrival_qtl: 680 },
        { date: 'Day 29', arrival_qtl: 640 },
      ];
    }
    const count = 15;
    const step = Math.max(1, Math.floor(arrivalTrend.length / count));
    const sampled = arrivalTrend.filter((_, idx) => idx % step === 0).slice(0, count);
    return sampled.map((d, i) => {
      const val = d.rolling_7d_arrival_qtl || d.daily_arrival_qtl || d.arrival_qtl || 450;
      return {
        date: `Day ${i * 2 + 1}`,
        arrival_qtl: Math.round(val > 2000 ? val / 100 : val)
      };
    });
  }, [arrivalTrend]);

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

      {/* TOP SECTION: 2-Cols (Current Output Hero Card + Supply Flow Distribution) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left 8-cols: Dark Green Hero Card with Area Chart */}
        <div className="lg:col-span-8 bg-[#172208] text-white p-4 sm:p-6 rounded-2xl shadow-md border border-[#2D3F14] flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2D3F14] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#84CC16] animate-pulse" />
                <span className="text-[10px] tracking-widest uppercase font-bold text-[#A3E635]">
                  CURRENT OUTPUT • LIVE
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-white">
                {formatQtl(totalArrivalsVal)}
              </h2>
              <p className="text-xs text-[#8FA866] mt-0.5">
                {kpis.mandi_count || 57} Mandis connected • DuckDB Analytics Online
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div>
                <p className="text-[#8FA866] text-[10px] uppercase font-bold">PEAK TODAY</p>
                <p className="text-white font-bold text-sm">24.8k Qtl</p>
              </div>
              <div className="border-l border-[#2D3F14] pl-4">
                <p className="text-[#8FA866] text-[10px] uppercase font-bold">PERFORMANCE</p>
                <p className="text-[#84CC16] font-bold text-sm">102.4% vs forecast</p>
              </div>
            </div>
          </div>

          {/* Large Area Chart inside Dark Card */}
          <div className="flex-1 w-full min-h-[180px] sm:min-h-[220px]">
            <AreaChart
              data={displayTrend}
              xAxisKey="date"
              seriesKey="arrival_qtl"
              series={[{ field: 'arrival_qtl', label: 'Arrival Volume (Qtl)', color: '#84CC16', smooth: 0.5, width: 3.5 }]}
              color="#84CC16"
              height="220px"
              dark={true}
            />
          </div>
        </div>

        {/* Right 4-cols: Supply Flow Distribution Card */}
        <div className="lg:col-span-4 agro-card p-4 sm:p-6 flex flex-col justify-between space-y-4">
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

      {/* EXECUTIVE KPI CARDS ROW (4 Primary KPIs as per Implementation Plan) */}
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
              title="Total Arrivals"
              value={formatQtl(totalArrivalsVal)}
              trend={8.2}
              trendLabel="vs yesterday"
              icon={TrendingUp}
              description={`${kpis.mandi_count || 57} Mandis Active`}
            />
            <KpiCard
              title="Avg Modal Price"
              value={formatCurrency(avgModalVal)}
              trend={3.8}
              trendLabel="vs baseline"
              icon={Coins}
              description="State Average Realized"
            />
            <KpiCard
              title="Below MSP Rate"
              value={formatPct(belowMspVal)}
              trend={-2.1}
              trendLabel="gap improvement"
              icon={ShieldAlert}
              severity={belowMspVal > 30 ? 'warning' : 'normal'}
              description="Records Below Floor Price"
            />
            <KpiCard
              title="On-Time Delivery"
              value={formatPct(onTimeDeliveryVal)}
              trend={1.8}
              trendLabel="transit performance"
              icon={Truck}
              description="Fleet SLA Adherence"
            />
          </>
        )}
      </div>

      {/* MANDI INTELLIGENCE LAYER: Performance Matrix + Supply Concentration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7-cols: Mandi Performance Matrix (⭐⭐ Most Valuable) */}
        <div className="lg:col-span-7">
          <MandiPerformanceMatrix 
            mandis={performanceMatrix} 
            onSelectMandi={(mandiId) => setSelectedMandiId(mandiId)} 
          />
        </div>

        {/* Right 5-cols: Mandi Supply Concentration (⭐ Supporting) */}
        <div className="lg:col-span-5">
          <MandiSupplyConcentration 
            mandis={supplyConcentration} 
            onSelectMandi={(mandiId) => setSelectedMandiId(mandiId)}
            onViewAll={() => window.location.href = '#'}
          />
        </div>
      </div>

      {/* MAIN MIDDLE SECTION (Mandi Health Grid + Donut Gauge + Forecast Bar Chart from Mockup 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left 6-cols: Mandi Array Output Matrix Grid */}
        <div className="lg:col-span-6 agro-card p-4 sm:p-5 space-y-4 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#5B7B10]/15 pb-3 gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#5B7B10]" />
                Mandi Array Health Output
              </h3>
              <p className="text-[10px] text-[#7A8F59]">State Mandi Telemetry Array • Real-time health status</p>
            </div>
            <div className="flex items-center gap-2.5 text-[10px] font-bold flex-wrap">
              <span className="flex items-center gap-1 text-[#364E00]">
                <span className="w-2 h-2 rounded-full bg-[#84CC16]" /> 66 Normal
              </span>
              <span className="flex items-center gap-1 text-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> 4 Warning
              </span>
              <span className="flex items-center gap-1 text-red-800">
                <span className="w-2 h-2 rounded-full bg-red-500" /> 2 Alert
              </span>
            </div>
          </div>

          {/* Interactive 6x12 Matrix Grid */}
          <div className="grid grid-cols-8 sm:grid-cols-12 gap-1 sm:gap-1.5 p-1.5 sm:p-2 bg-[#F6F8EF] rounded-xl border border-[#5B7B10]/15">
            {mandiGrid.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMandiId(m.code)}
                title={`${m.id} (${m.code}): ${m.status}`}
                className={`h-6 sm:h-7 rounded-md text-[8px] sm:text-[9px] font-extrabold transition-all flex items-center justify-center border shadow-2xs cursor-pointer ${
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
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-semibold text-[#1F2E0A] text-[11px] sm:text-xs">
                2 mandis flagged — MANDI023 underperforming (-12%), MANDI019 delayed transit
              </span>
            </div>
          </div>
        </div>

        {/* Center 3-cols: MSP Pressure Donut Gauge */}
        <div className="lg:col-span-3 agro-card p-4 sm:p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00]">
              MSP Capacity Watch
            </h3>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
              BEING MONITORED
            </span>
          </div>

          <DonutChart
            percentage={Math.round(belowMspVal)}
            valueText={`${formatPct(belowMspVal)}`}
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
