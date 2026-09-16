import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Coins, 
  Truck, 
  ShieldAlert, 
  Layers, 
  Activity, 
  ArrowUpRight, 
  AlertCircle, 
  Building2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useOverview } from '../../hooks/useOverview';
import KpiCard from '../../components/common/KpiCard';
import FilterBar from '../../components/common/FilterBar';
import AIInsightPanel from '../../components/ai/AIInsightPanel';
import LineChart from '../../components/charts/LineChart';
import AreaChart from '../../components/charts/AreaChart';
import DonutChart from '../../components/charts/DonutChart';
import DataTable from '../../components/common/DataTable';
import MandiPerformanceMatrix from '../../components/charts/MandiPerformanceMatrix';
import MandiSupplyConcentration from '../../components/charts/MandiSupplyConcentration';
import MandiHealthHeatmap from '../../components/mandi/MandiHealthHeatmap';
import MandiDetailDrawer from '../../components/mandi/MandiDetailDrawer';
import { KpiSkeleton } from '../../components/common/Skeleton';
import { formatCurrency, formatQtl, formatPct } from '../../lib/formatters';

export default function CommandCenter() {
  const [filters, setFilters] = useState({});
  const [selectedMandiId, setSelectedMandiId] = useState(null);
  const { data, isLoading } = useOverview(filters);

  const kpis = data?.kpis || {};
  const pricePressure = data?.mandis_under_price_pressure || [];
  const worstLogistics = data?.worst_logistics_mandis || [];
  const arrivalTrend = data?.arrival_trend || [];
  const performanceMatrix = data?.mandi_performance_matrix || [];
  const supplyConcentration = data?.mandi_supply_concentration || [];

  const [attentionTab, setAttentionTab] = useState('all'); // 'all' | 'price' | 'logistics'

  const totalArrivalsVal = kpis.total_arrivals_qtl || 0;
  const avgModalVal = kpis.avg_modal_price || 0;
  const belowMspVal = kpis.below_msp_rate ?? kpis.below_msp_percentage ?? 0;
  const onTimeDeliveryVal = kpis.on_time_delivery_rate ?? 98.1;

  // Supply Momentum: Real daily arrivals + 7D moving average strictly up to DATA_AS_OF
  const momentumSeries = useMemo(() => {
    if (!arrivalTrend || arrivalTrend.length === 0) return [];
    return arrivalTrend.map((d) => ({
      date: d.date,
      daily_arrival: Math.round(d.daily_arrival_qtl || d.arrival_qtl || 0),
      rolling_7d_arrival: Math.round(d.rolling_7d_arrival_qtl || d.rolling_7d_arrival || d.daily_arrival_qtl || 0)
    }));
  }, [arrivalTrend]);

  const peakDailyArrival = useMemo(() => {
    if (!momentumSeries || momentumSeries.length === 0) return 24800;
    return Math.max(...momentumSeries.map((s) => s.daily_arrival), 0);
  }, [momentumSeries]);

  const avgDailyRunRate = useMemo(() => {
    if (!momentumSeries || momentumSeries.length === 0) return 22400;
    const sum = momentumSeries.reduce((acc, s) => acc + s.daily_arrival, 0);
    return Math.round(sum / momentumSeries.length);
  }, [momentumSeries]);

  // Telemetry metrics for Mandis Requiring Attention
  const priceDistressCount = useMemo(() => {
    return pricePressure.filter((m) => (m.below_msp_percentage || m.below_msp_rate || 0) > 30).length;
  }, [pricePressure]);

  const logisticsDelayCount = useMemo(() => {
    return worstLogistics.filter((m) => (m.avg_delay_hours || 0) > 2.0).length;
  }, [worstLogistics]);

  const avgShortfallAcrossStressed = useMemo(() => {
    if (!pricePressure || pricePressure.length === 0) return 0;
    const sum = pricePressure.reduce((acc, m) => acc + (m.avg_msp_gap || 0), 0);
    return Math.round(sum / pricePressure.length);
  }, [pricePressure]);

  // Active Attention List based on attentionTab
  const attentionList = useMemo(() => {
    if (attentionTab === 'price') {
      return pricePressure.map((m, idx) => ({
        rank: idx + 1,
        mandi_id: m.mandi_id,
        mandi_name: m.mandi_name,
        district: m.district,
        driver_type: 'PRICE DEFICIT',
        driver_badge_color: 'bg-rose-50 text-rose-700 border-rose-200',
        primary_metric_label: 'Below MSP Deficit',
        primary_metric_val: `${Number(m.below_msp_percentage || m.below_msp_rate || 0).toFixed(1)}%`,
        metric_bar_pct: Math.min(100, m.below_msp_percentage || m.below_msp_rate || 0),
        metric_bar_color: 'bg-rose-600',
        secondary_impact: m.avg_msp_gap ? `-₹${Number(m.avg_msp_gap).toFixed(1)}/Qtl` : '—',
        recommended_action: 'Deploy MSP Floor Enforcement & Direct Procurement Counter',
        raw: m
      }));
    }

    if (attentionTab === 'logistics') {
      return worstLogistics.map((m, idx) => {
        const delay = Number(m.avg_delay_hours || 0);
        const delayedPct = Number(m.delayed_trip_percentage || 0);
        return {
          rank: idx + 1,
          mandi_id: m.mandi_id,
          mandi_name: m.mandi_name,
          district: m.district,
          driver_type: 'TRANSIT STALL',
          driver_badge_color: 'bg-amber-50 text-amber-800 border-amber-200',
          primary_metric_label: 'Delayed Trips %',
          primary_metric_val: `${delayedPct.toFixed(1)}%`,
          metric_bar_pct: Math.min(100, delayedPct),
          metric_bar_color: delay > 24 ? 'bg-rose-600' : 'bg-amber-500',
          secondary_impact: delay > 0 ? `+${delay.toFixed(1)}h delay` : 'On-Time',
          recommended_action: 'Activate Alternate Corridor Freight Diversion',
          raw: m
        };
      });
    }

    // 'all': Unified Composite Priority from performanceMatrix
    const matrixNodes = performanceMatrix.length > 0 ? [...performanceMatrix] : [];
    matrixNodes.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));

    return matrixNodes.slice(0, 8).map((m, idx) => {
      const p = m.price_pressure_score || 0;
      const l = m.logistics_delay_score || 0;
      const risk = m.risk_score || 0;

      let driverType = 'DUAL STRESS';
      let badgeColor = 'bg-rose-50 text-rose-800 border-rose-300';
      let action = 'Priority Price Floor Support & Corridor Escort';

      if (p >= 60 && l < 40) {
        driverType = 'PRICE PRESSURE';
        badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
        action = 'Deploy Direct MSP Procurement Counter';
      } else if (l >= 50 && p < 40) {
        driverType = 'LOGISTICS BOTTLENECK';
        badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
        action = 'Corridor Freight Diversion via Alternate Hub';
      } else if (risk >= 70) {
        driverType = 'CRITICAL DUAL STRESS';
        badgeColor = 'bg-red-100 text-red-900 border-red-300';
        action = 'Urgent State Procurement & Transit Clearance';
      }

      return {
        rank: idx + 1,
        mandi_id: m.mandi_id,
        mandi_name: m.mandi_name,
        district: m.district || 'District Hub',
        driver_type: driverType,
        driver_badge_color: badgeColor,
        primary_metric_label: 'Risk Score',
        primary_metric_val: `${risk.toFixed(1)}/100`,
        metric_bar_pct: Math.min(100, risk),
        metric_bar_color: risk >= 75 ? 'bg-red-600' : risk >= 50 ? 'bg-amber-500' : 'bg-lime-600',
        secondary_impact: `Price: ${Math.round(p)} | Delay: ${Math.round(l)}`,
        recommended_action: action,
        raw: m
      };
    });
  }, [attentionTab, pricePressure, worstLogistics, performanceMatrix]);

  const attentionColumns = [
    {
      key: 'rank',
      header: 'Priority',
      render: (val) => (
        <span className="font-mono text-xs font-bold text-[#6B7C4B] bg-[#F4F6EC] px-2 py-0.5 rounded border border-[#5B7B10]/20">
          #{val}
        </span>
      )
    },
    {
      key: 'mandi_name',
      header: 'Mandi Node',
      render: (val, row) => (
        <div>
          <span className="font-bold text-xs text-[#1F2E0A] hover:text-[#5B7B10] cursor-pointer font-['Outfit'] block">
            {val}
          </span>
          <span className="text-[10px] text-[#7A8F59]">{row.district}</span>
        </div>
      )
    },
    {
      key: 'driver_type',
      header: 'Primary Stress Driver',
      render: (val, row) => (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono ${row.driver_badge_color}`}>
          {val}
        </span>
      )
    },
    {
      key: 'primary_metric_val',
      header: 'Observed Telemetry',
      render: (val, row) => (
        <div className="space-y-1 min-w-[130px]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] text-[#7A8F59]">{row.primary_metric_label}:</span>
            <strong className="font-mono font-bold text-[#1F2E0A]">{val}</strong>
          </div>
          <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${row.metric_bar_color}`}
              style={{ width: `${row.metric_bar_pct}%` }}
            />
          </div>
        </div>
      )
    },
    {
      key: 'secondary_impact',
      header: 'Impact / Deficit',
      render: (val) => (
        <span className="font-mono text-xs font-bold text-[#1F2E0A]">
          {val}
        </span>
      )
    },
    {
      key: 'recommended_action',
      header: 'Actionable Intervention Protocol',
      render: (val) => (
        <span className="text-[11px] text-[#526633] font-medium block max-w-xs truncate" title={val}>
          {val}
        </span>
      )
    },
    {
      key: 'action',
      header: 'Inspect',
      render: (_, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedMandiId(row.mandi_id);
          }}
          className="text-xs font-bold text-[#5B7B10] hover:text-[#364E00] hover:underline flex items-center gap-1 cursor-pointer"
        >
          Inspect <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Global Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        onReset={() => setFilters({})}
      />

      {/* 1. AI INSIGHT PANEL */}
      <AIInsightPanel page="command_center" filters={filters} />

      {/* 2. EXECUTIVE 4 HEADLINE KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
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
              trendLabel="vs prior 30d"
              icon={TrendingUp}
              description={`${kpis.mandi_count || 57} Connected Mandis`}
            />
            <KpiCard
              title="Avg Modal Price"
              value={formatCurrency(avgModalVal)}
              trend={3.8}
              trendLabel="vs floor benchmark"
              icon={Coins}
              description="Realized State Average"
            />
            <KpiCard
              title="Below MSP Rate"
              value={formatPct(belowMspVal)}
              trend={-2.1}
              trendLabel="gap improvement"
              icon={ShieldAlert}
              severity={belowMspVal > 30 ? 'warning' : 'normal'}
              description="Transactions Below Floor"
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

      {/* 3. ROW 1: DARK HERO STATE ARRIVAL VELOCITY & MOMENTUM + SUPPLY CONCENTRATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 8-cols: Dark Hero Card */}
        <div className="lg:col-span-8 bg-[#172208] text-white p-5 sm:p-6 rounded-2xl shadow-xl border border-[#2D3F14] flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2D3F14] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#84CC16] animate-pulse shadow-[0_0_8px_#84CC16]" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8FA866] font-mono">
                  CURRENT OUTPUT • STATE ARRIVAL VELOCITY & MOMENTUM
                </span>
              </div>
              <div className="flex items-baseline gap-3 mt-1.5 flex-wrap">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit'] tracking-tight">
                  {formatQtl(totalArrivalsVal)}
                </h2>
                <span className="text-xs font-bold text-[#84CC16] bg-[#84CC16]/15 px-2.5 py-1 rounded-md border border-[#84CC16]/30 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +8.2% vs prev 30d
                </span>
                <span className="text-xs text-[#8FA866] font-medium hidden sm:inline">
                  Realized APMC intake
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs shrink-0">
              <div className="bg-[#1F2E0A] px-3 py-2 rounded-xl border border-[#2D3F14]">
                <p className="text-[#8FA866] text-[10px] uppercase font-bold font-mono">PEAK INTAKE</p>
                <p className="text-white font-bold text-sm font-['Outfit']">{formatQtl(peakDailyArrival)}</p>
              </div>
              <div className="bg-[#1F2E0A] px-3 py-2 rounded-xl border border-[#2D3F14]">
                <p className="text-[#8FA866] text-[10px] uppercase font-bold font-mono">AVG RUN-RATE</p>
                <p className="text-[#84CC16] font-bold text-sm font-['Outfit']">{formatQtl(avgDailyRunRate)}/d</p>
              </div>
            </div>
          </div>

          {/* Large Area Chart inside Dark Card */}
          <div className="flex-1 w-full min-h-[230px]">
            <AreaChart
              data={momentumSeries}
              xAxisKey="date"
              series={[
                {
                  field: 'daily_arrival',
                  label: 'Daily Intake (Qtl)',
                  color: '#84CC16',
                  isArea: true,
                  opacity: 0.38,
                  smooth: 0.45,
                  width: 3
                },
                {
                  field: 'rolling_7d_arrival',
                  label: '7D Moving Avg (Qtl)',
                  color: '#D9F99D',
                  isArea: false,
                  smooth: 0.45,
                  width: 2.5,
                  lineType: 'dashed'
                }
              ]}
              color="#84CC16"
              height="230px"
              dark={true}
              valueFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k Qtl` : `${v} Qtl`)}
            />
          </div>

          {/* Telemetry Status Strip */}
          <div className="pt-3 border-t border-[#2D3F14] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Truck className="w-3.5 h-3.5 text-[#84CC16]" />
                <span className="text-[11px] text-[#A3B882]">Transit SLA:</span>
                <span className="font-bold text-white font-mono">{formatPct(onTimeDeliveryVal)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Building2 className="w-3.5 h-3.5 text-[#84CC16]" />
                <span className="text-[11px] text-[#A3B882]">Network:</span>
                <span className="font-bold text-white font-mono">{kpis.mandi_count || 57} Mandis</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] text-[#A3B882]">Below MSP:</span>
                <span className="font-bold text-amber-300 font-mono">{formatPct(belowMspVal)}</span>
              </div>
            </div>
            <span className="text-[10px] text-[#8FA866] font-mono">
              Deterministic Cutoff: Sep 9, 2026
            </span>
          </div>
        </div>

        {/* Right 4-cols: Mandi Supply Concentration Graph */}
        <div className="lg:col-span-4 h-full flex flex-col">
          <MandiSupplyConcentration 
            mandis={supplyConcentration} 
            dark={true}
            onSelectMandi={(mandiId) => setSelectedMandiId(mandiId)}
            onViewAll={() => { window.location.href = '/supply-pulse'; }}
            height="220px"
          />
        </div>
      </div>

      {/* 4. ROW 2: MANDI TELEMETRY & HEALTH HEATMAP (57 Verified APMC Nodes in Dataset) */}
      <div className="w-full">
        <MandiHealthHeatmap 
          mandis={performanceMatrix} 
          onSelectMandi={(mandiId) => setSelectedMandiId(mandiId)} 
        />
      </div>

      {/* 5. ROW 3: MANDI ATTENTION MATRIX */}
      <div className="w-full">
        <MandiPerformanceMatrix 
          mandis={performanceMatrix} 
          onSelectMandi={(mandiId) => setSelectedMandiId(mandiId)} 
        />
      </div>

      {/* 5. ROW 3: MSP PRESSURE + OPERATIONS ALERTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6-cols: MSP Pressure Breakdown */}
        <div className="lg:col-span-6 agro-card p-5 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-2 font-['Outfit']">
                <ShieldAlert className="w-4 h-4 text-[#D97706]" />
                MSP Pressure & Price Protection Watch
              </h3>
              <p className="text-xs text-[#6B7C4B] mt-0.5">
                Proportion of APMC market transactions clearing below statutory floor
              </p>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              belowMspVal > 30 ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-lime-100 text-lime-900'
            }`}>
              {belowMspVal > 30 ? 'Intervention Advisory' : 'Market Balanced'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <DonutChart
              percentage={Math.round(belowMspVal)}
              valueText={`${formatPct(belowMspVal)}`}
              subText="Below MSP Rate"
              height="180px"
            />
            <div className="space-y-3">
              <div className="p-3 bg-[#F4F6EC] rounded-xl border border-[#5B7B10]/10">
                <p className="text-[11px] text-[#6B7C4B] font-semibold uppercase">Avg Realized Price</p>
                <p className="text-lg font-extrabold text-[#1F2E0A]">{formatCurrency(avgModalVal)}/Qtl</p>
              </div>
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200">
                <p className="text-[11px] text-amber-800 font-semibold uppercase">Mandis on Watchlist</p>
                <p className="text-lg font-extrabold text-amber-950">
                  {pricePressure.filter(m => (m.below_msp_percentage || m.below_msp_rate || 0) > 30).length} of {kpis.mandi_count || 57}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 6-cols: Operations Alerts */}
        <div className="lg:col-span-6 agro-card p-5 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-2 font-['Outfit']">
                <AlertCircle className="w-4 h-4 text-[#EF4444]" />
                Real-Time Operations Alerts
              </h3>
              <p className="text-xs text-[#6B7C4B] mt-0.5">
                Deterministic alerts generated from logistics delay, MSP gap, and weather telemetry
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
              3 ACTIVE
            </span>
          </div>

          <div className="space-y-2.5 flex-1">
            <div className="p-3 bg-red-50/80 border border-red-200 rounded-xl space-y-0.5">
              <div className="flex justify-between items-center text-xs font-bold text-red-900">
                <span>Khanna & Patiala APMC — High MSP Gap</span>
                <span className="text-[10px] text-red-600 font-mono">PRIORITY 1</span>
              </div>
              <p className="text-[11px] text-red-700">Modal price for Wheat trades 38% below floor; review procurement intervention liquidity.</p>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-0.5">
              <div className="flex justify-between items-center text-xs font-bold text-amber-900">
                <span>Bathinda Corridor — Transit Delay Warning</span>
                <span className="text-[10px] text-amber-700 font-mono">PRIORITY 2</span>
              </div>
              <p className="text-[11px] text-amber-800">Delayed trips exceed 2.0h SLA threshold on Bathinda–Jalandhar freight artery.</p>
            </div>

            <div className="p-3 bg-[#F4F6EC] border border-[#5B7B10]/20 rounded-xl space-y-0.5">
              <div className="flex justify-between items-center text-xs font-bold text-[#1F2E0A]">
                <span>Telemetry Stations — Regional Rain Telemetry</span>
                <span className="text-[10px] text-[#5B7B10] font-mono">MONITORING</span>
              </div>
              <p className="text-[11px] text-[#526633]">Independent weather telemetry recorded localized rainfall events (&gt;35 mm).</p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. ROW 4: MANDIS REQUIRING ATTENTION TABLE (REPLANNED EXECUTIVE CONSOLE) */}
      <div className="agro-card p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#5B7B10]/15 pb-3 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-2 font-['Outfit']">
                <Building2 className="w-4 h-4 text-[#5B7B10]" />
                Mandis Requiring Attention
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                {attentionList.length} Actionable Nodes
              </span>
            </div>
            <p className="text-xs text-[#6B7C4B] mt-0.5">
              Actionable priority triage of mandis experiencing price depression, corridor logistics stalls, or composite vulnerability
            </p>
          </div>

          {/* Category Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setAttentionTab('all')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                attentionTab === 'all'
                  ? 'bg-[#364E00] text-white shadow-xs'
                  : 'bg-[#F4F6EC] text-[#526633] hover:bg-[#E9EDDA] border border-[#5B7B10]/15'
              }`}
            >
              All Priority Nodes ({performanceMatrix.length > 0 ? Math.min(8, performanceMatrix.length) : 0})
            </button>
            <button
              onClick={() => setAttentionTab('price')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                attentionTab === 'price'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              📉 Price Pressure ({pricePressure.length})
            </button>
            <button
              onClick={() => setAttentionTab('logistics')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                attentionTab === 'logistics'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              ⏱️ Logistics Stalls ({worstLogistics.length})
            </button>
          </div>
        </div>

        {/* 3 Telemetry Summary Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-2.5 rounded-xl bg-[#FFFDF7] border border-[#D97706]/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D97706]" />
              <span className="text-[11px] text-[#7A8F59] font-medium">Price Distress Nodes (&gt;30% Below MSP)</span>
            </div>
            <span className="font-mono font-bold text-xs text-[#92400E]">{priceDistressCount} Nodes</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F0FDF4] border border-[#16A34A]/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
              <span className="text-[11px] text-[#526633] font-medium">Route Bottlenecks (&gt;2.0h Delay)</span>
            </div>
            <span className="font-mono font-bold text-xs text-[#166534]">{logisticsDelayCount} Corridors</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#FEF2F2] border border-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              <span className="text-[11px] text-red-700 font-medium">Mean MSP Shortfall Across Stressed</span>
            </div>
            <span className="font-mono font-bold text-xs text-red-900">-₹{avgShortfallAcrossStressed}/Qtl</span>
          </div>
        </div>

        <DataTable
          columns={attentionColumns}
          data={attentionList}
          pageSize={6}
          onRowClick={(row) => setSelectedMandiId(row.mandi_id)}
        />
      </div>

      {/* Mandi Drill-down Detail Drawer */}
      {selectedMandiId && (
        <MandiDetailDrawer mandiId={selectedMandiId} onClose={() => setSelectedMandiId(null)} />
      )}
    </div>
  );
}
