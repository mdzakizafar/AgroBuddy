import React, { useState, useMemo } from 'react';
import { ShieldAlert, AlertTriangle, Building2, Activity, BarChart2, Radio, Search, ArrowUpRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchRiskMandis, fetchRiskDistribution, fetchRiskDrivers, fetchEmergingRisks } from '../../api/risk';
import KpiCard from '../../components/common/KpiCard';
import FilterBar from '../../components/common/FilterBar';
import AIInsightPanel from '../../components/ai/AIInsightPanel';
import DataTable from '../../components/common/DataTable';
import MandiRiskDistribution from '../../components/mandi/MandiRiskDistribution';
import MandiDetail from '../../components/mandi/MandiDetail';
import BarChart from '../../components/charts/BarChart';
import ScatterChart from '../../components/charts/ScatterChart';
import { KpiSkeleton } from '../../components/common/Skeleton';
import { Badge } from '../../components/common/Badge';

export default function MandiRisk() {
  const [filters, setFilters] = useState({});
  const [selectedMandi, setSelectedMandi] = useState(null);
  const [directorySearch, setDirectorySearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all'); // 'all' | 'critical' | 'high' | 'medium' | 'low'
  const [driverFilter, setDriverFilter] = useState('all'); // 'all' | 'price' | 'logistics' | 'arrival'

  const { data: riskMandisRes, isLoading: isMandisLoading } = useQuery({
    queryKey: ['risk-mandis', filters],
    queryFn: () => fetchRiskMandis(filters)
  });

  const { data: riskDistRes } = useQuery({
    queryKey: ['risk-distribution', filters],
    queryFn: () => fetchRiskDistribution(filters)
  });

  const { data: riskDriversRes } = useQuery({
    queryKey: ['risk-drivers', filters],
    queryFn: () => fetchRiskDrivers(filters)
  });

  const { data: emergingRes } = useQuery({
    queryKey: ['risk-emerging', filters],
    queryFn: () => fetchEmergingRisks(filters)
  });

  const mandisList = riskMandisRes?.data || [];
  const distBins = riskDistRes?.data || [];
  const driverData = riskDriversRes?.data || {};
  const emergingList = emergingRes?.top_emerging || emergingRes?.data?.top_emerging || emergingRes?.data || [];

  const totalAssessed = mandisList.length;
  const avgRiskScore = totalAssessed > 0
    ? (mandisList.reduce((acc, m) => acc + (m.risk_score || 0), 0) / totalAssessed).toFixed(1)
    : 0;
  const maxRiskScore = totalAssessed > 0
    ? Math.max(...mandisList.map(m => m.risk_score || 0)).toFixed(1)
    : 0;
  const criticalCount = mandisList.filter(m => (m.risk_level || '').toLowerCase() === 'critical').length;
  const emergingCount = emergingList.length;

  const filteredDirectoryMandis = useMemo(() => {
    return mandisList.filter((m) => {
      // 1. Text search
      if (directorySearch.trim()) {
        const query = directorySearch.toLowerCase().trim();
        const matchName = (m.mandi_name || '').toLowerCase().includes(query);
        const matchDist = (m.district || '').toLowerCase().includes(query);
        const matchState = (m.state || '').toLowerCase().includes(query);
        const matchId = (m.mandi_id || '').toLowerCase().includes(query);
        if (!matchName && !matchDist && !matchState && !matchId) return false;
      }

      // 2. Severity filter
      const score = m.risk_score || 0;
      const level = (m.risk_level || '').toLowerCase();
      if (severityFilter === 'critical') {
        if (score < 75 && level !== 'critical') return false;
      } else if (severityFilter === 'high') {
        if ((score < 50 || score >= 75) && level !== 'high') return false;
      } else if (severityFilter === 'medium') {
        if ((score < 25 || score >= 50) && level !== 'medium') return false;
      } else if (severityFilter === 'low') {
        if (score >= 25 && level !== 'low') return false;
      }

      // 3. Driver filter
      const p = m.price_pressure_score || 0;
      const a = m.arrival_instability_score || 0;
      const l = m.logistics_delay_score || 0;
      if (driverFilter === 'price') {
        if (p < 35 && (m.below_msp_percentage || 0) < 30) return false;
      } else if (driverFilter === 'logistics') {
        if (l < 35 && (m.avg_delay_hours || 0) < 2.0) return false;
      } else if (driverFilter === 'arrival') {
        if (a < 35) return false;
      }

      return true;
    });
  }, [mandisList, directorySearch, severityFilter, driverFilter]);

  const riskColumns = [
    {
      key: 'mandi_name',
      header: 'Mandi Node',
      render: (val, row) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs text-[#1F2E0A] hover:text-[#5B7B10] cursor-pointer font-['Outfit']">
              {val}
            </span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-stone-100 text-stone-600 border border-stone-200">
              {row.mandi_id}
            </span>
          </div>
          <span className="text-[10px] text-[#7A8F59]">
            {row.district}{row.state ? `, ${row.state}` : ''}
          </span>
        </div>
      )
    },
    {
      key: 'risk_score',
      header: 'Vulnerability Index',
      render: (val, row) => {
        const score = Number(val || 0);
        const level = (row.risk_level || 'Medium').toUpperCase();
        const isCritical = score >= 75 || level === 'CRITICAL';
        const isHigh = (score >= 50 && score < 75) || level === 'HIGH';
        const isMedium = (score >= 25 && score < 50) || level === 'MEDIUM';

        const badgeStyle = isCritical
          ? 'bg-red-100 text-red-800 border-red-200'
          : isHigh
          ? 'bg-amber-100 text-amber-900 border-amber-200'
          : isMedium
          ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
          : 'bg-emerald-50 text-emerald-800 border-emerald-200';

        const barColor = isCritical
          ? 'bg-red-600'
          : isHigh
          ? 'bg-amber-600'
          : isMedium
          ? 'bg-yellow-500'
          : 'bg-emerald-600';

        return (
          <div className="space-y-1 min-w-[110px]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-extrabold text-sm font-['Outfit'] text-[#1F2E0A]">
                {score.toFixed(1)}
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border font-mono ${badgeStyle}`}>
                {level}
              </span>
            </div>
            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                style={{ width: `${Math.min(100, score)}%` }}
              />
            </div>
          </div>
        );
      }
    },
    {
      key: 'driver_breakdown',
      header: '3-Factor Risk Driver Breakdown',
      render: (_, row) => {
        const p = Math.round(row.price_pressure_score || 0);
        const a = Math.round(row.arrival_instability_score || 0);
        const l = Math.round(row.logistics_delay_score || 0);

        const pWeighted = p * 0.45;
        const aWeighted = a * 0.25;
        const lWeighted = l * 0.30;
        const totalW = Math.max(1, pWeighted + aWeighted + lWeighted);

        const pPct = Math.round((pWeighted / totalW) * 100);
        const aPct = Math.round((aWeighted / totalW) * 100);
        const lPct = Math.max(0, 100 - pPct - aPct);

        return (
          <div className="space-y-1 min-w-[150px]">
            {/* Segmented Micro-Bar */}
            <div className="w-full h-2 rounded-full overflow-hidden flex bg-stone-100 border border-stone-200" title={`Price: ${p}/100 (45%) | Arrival: ${a}/100 (25%) | Logistics: ${l}/100 (30%)`}>
              <div style={{ width: `${pPct}%` }} className="bg-red-500 h-full" title={`Price: ${p}`} />
              <div style={{ width: `${aPct}%` }} className="bg-amber-500 h-full" title={`Arrival: ${a}`} />
              <div style={{ width: `${lPct}%` }} className="bg-blue-500 h-full" title={`Logistics: ${l}`} />
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono text-[#6B7C4B]">
              <span className="text-red-700 font-bold" title="Price Score (45% weight)">P:{p}</span>
              <span className="text-amber-700 font-bold" title="Arrival Instability (25% weight)">A:{a}</span>
              <span className="text-blue-700 font-bold" title="Logistics Delay (30% weight)">L:{l}</span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'operational_telemetry',
      header: 'Operational Telemetry',
      render: (_, row) => {
        const vol = row.arrival_volume ? `${(row.arrival_volume / 1000).toFixed(1)}k Qtl` : '—';
        const belowMsp = row.below_msp_percentage != null ? `${row.below_msp_percentage.toFixed(1)}%` : '—';
        const delay = row.avg_delay_hours != null ? `${row.avg_delay_hours.toFixed(1)}h` : '0h';

        return (
          <div className="text-[11px] space-y-0.5 min-w-[120px]">
            <div className="flex justify-between gap-2">
              <span className="text-[#7A8F59] text-[10px]">Volume:</span>
              <span className="font-mono font-bold text-[#1F2E0A]">{vol}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#7A8F59] text-[10px]">Below MSP:</span>
              <span className={`font-mono font-bold ${row.below_msp_percentage > 30 ? 'text-rose-600' : 'text-[#5B7B10]'}`}>
                {belowMsp}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#7A8F59] text-[10px]">Delay:</span>
              <span className={`font-mono font-bold ${row.avg_delay_hours > 2 ? 'text-amber-700' : 'text-[#1F2E0A]'}`}>
                {delay}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'recommended_action',
      header: 'Intervention Protocol',
      render: (val) => (
        <div className="max-w-[200px]">
          <span className="text-[11px] text-[#526633] font-medium line-clamp-2" title={val}>
            {val || 'Routine operational monitoring'}
          </span>
        </div>
      )
    },
    {
      key: 'action',
      header: 'Inspect',
      render: (_, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedMandi(row);
          }}
          className="text-xs font-bold text-[#5B7B10] hover:text-[#364E00] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
        >
          Inspect <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-[#1F2E0A] flex items-center gap-2 font-['Outfit']">
          <ShieldAlert className="w-5 h-5 text-red-600" />
          MANDI RISK ENGINE
        </h2>
        <p className="text-xs text-[#6B7C4B] mt-0.5">
          Identify emerging operational vulnerabilities across mandis before critical supply disruption
        </p>
      </div>

      <FilterBar filters={filters} onFilterChange={setFilters} onReset={() => setFilters({})} showCrop={false} />

      <AIInsightPanel page="mandi_risk" filters={filters} />

      {/* KPI Row (5 KPIs as per Implementation Plan) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {isMandisLoading ? (
          <>
            <KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard title="Mandis Assessed" value={totalAssessed} trend={0} trendLabel="active state grid" icon={Building2} description="Monitored Mandi Nodes" />
            <KpiCard title="Average Risk Score" value={avgRiskScore} trend={-1.5} trendLabel="vs 30d baseline" icon={Activity} description="Network Risk Baseline" />
            <KpiCard title="Maximum Risk Score" value={maxRiskScore} trend={2.1} trendLabel="vs 30d max" icon={ShieldAlert} severity="danger" description="Peak Vulnerability Node" />
            <KpiCard title="Emerging Risks" value={emergingCount} trend={-2} trendLabel="vs prior week" icon={AlertTriangle} severity="warning" description="Watchlist Mandis" />
            <KpiCard title="Critical Mandis" value={criticalCount} trend={-1} trendLabel="vs prior week" icon={ShieldAlert} severity="danger" description="Urgent Action Required" />
          </>
        )}
      </div>

      {/* Deterministic Scoring Formula Callout */}
      <div className="agro-card p-4 bg-gradient-to-r from-[#F4F8EC] via-white to-[#F4F8EC] border-[#5B7B10]/25">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-[#5B7B10] text-white">
                Formula Specification
              </span>
              <h4 className="text-xs font-bold text-[#1F2E0A] font-['Outfit']">
                Deterministic Composite Vulnerability Scoring Model
              </h4>
            </div>
            <p className="text-[11px] text-[#526633]">
              Audit-ready, non-heuristic scoring grounded directly in factual APMC market and transport transactions:
            </p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-[#5B7B10]/20 text-xs font-mono font-bold text-[#1F2E0A] shadow-xs shrink-0">
            Risk = 0.45 × Price + 0.25 × Arrival + 0.30 × Logistics
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-[#5B7B10]/15 text-[11px]">
          <div className="p-2.5 rounded-lg bg-red-50/70 border border-red-200/70">
            <div className="font-bold text-red-900 flex items-center justify-between">
              <span>Price Pressure (45%)</span>
              <span className="text-[10px] bg-red-200/60 text-red-800 px-1.5 py-0.2 rounded font-mono">0.45</span>
            </div>
            <p className="text-[10px] text-red-800/80 mt-1">
              Reflects below-MSP distress sales & price depression directly impacting farmer livelihood.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/70">
            <div className="font-bold text-amber-900 flex items-center justify-between">
              <span>Arrival Instability (25%)</span>
              <span className="text-[10px] bg-amber-200/60 text-amber-800 px-1.5 py-0.2 rounded font-mono">0.25</span>
            </div>
            <p className="text-[10px] text-amber-800/80 mt-1">
              Measures coefficient of variation & sudden intraday supply surges creating market congestion.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200/70">
            <div className="font-bold text-blue-900 flex items-center justify-between">
              <span>Logistics Delay (30%)</span>
              <span className="text-[10px] bg-blue-200/60 text-blue-800 px-1.5 py-0.2 rounded font-mono">0.30</span>
            </div>
            <p className="text-[10px] text-blue-800/80 mt-1">
              Quantifies corridor transit bottlenecks and shipment delays leading to commodity spoilage.
            </p>
          </div>
        </div>
      </div>

      {/* Flagship Mandi Vulnerability Distribution by District / State (Replaces unverified coordinate map) */}
      <MandiRiskDistribution mandis={mandisList} onSelectMandi={setSelectedMandi} />

      {/* Differentiated Risk Driver Matrix (Scatter Bubble: X=Price Pressure, Y=Logistics Delay, Size=Arrival Instability, Color=Risk Level) */}
      <div className="agro-card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#5B7B10]/15 pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#5B7B10]" />
              Risk Driver Matrix (Price Score vs Logistics Score)
            </h3>
            <p className="text-[11px] text-[#7A8F59]">
              X: Price Pressure Score (0-100) | Y: Logistics Delay Score (0-100) | Bubble Size: Arrival Instability (CV) | Color: Composite Risk Level
            </p>
          </div>
          <span className="text-[10px] text-[#7A8F59] font-medium">Click node to inspect mandi</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[#6B7C4B] bg-[#F4F6EC] px-3 py-1.5 rounded-lg border border-[#5B7B10]/15 w-full sm:w-fit">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] inline-block" />
            <span className="font-semibold text-[#1F2E0A]">Critical Risk (&ge; 75)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] inline-block" />
            <span className="font-semibold text-[#1F2E0A]">Watchlist / High (50 - 74)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#65A30D] inline-block" />
            <span className="font-semibold text-[#1F2E0A]">Operational Baseline (&lt; 50)</span>
          </div>
        </div>

        <ScatterChart
          data={mandisList.map((m) => {
            const p = m.price_pressure_score || 0;
            const a = m.arrival_instability_score || 0;
            const l = m.logistics_delay_score || 0;
            const rScore = m.risk_score || 0;
            const rLevel = (m.risk_level || '').toLowerCase();

            let color = '#65A30D'; // Stable / Baseline
            if (rScore >= 75 || rLevel === 'critical') {
              color = '#DC2626'; // Critical
            } else if (rScore >= 50 || rLevel === 'warning' || rLevel === 'medium' || rLevel === 'high') {
              color = '#D97706'; // Watchlist
            }

            return {
              x: p,
              y: l,
              size: Math.max(10, Math.min(26, Math.round((a || 10) * 0.75))),
              mandiName: m.mandi_name,
              mandiData: m,
              pointColor: color
            };
          })}
          xKey="x"
          yKey="y"
          xName="Price Pressure Score"
          yName="Logistics Delay Score"
          xUnit="/100"
          yUnit="/100"
          pointColor={(val, item) => item?.pointColor || '#65A30D'}
          height="320px"
          onPointClick={(point) => setSelectedMandi(point.mandiData || point)}
        />
      </div>

      {/* Risk Driver Breakdown & Top Emerging Vulnerabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Driver Breakdown Cards & Histogram */}
        <div className="agro-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-[#5B7B10]" />
              <span>Network Risk Driver Breakdown & Distribution</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div className="bg-red-50/60 border border-red-100 rounded-xl p-3">
              <span className="text-[10px] text-red-700 font-bold uppercase tracking-wider">Price Pressure</span>
              <div className="text-xl font-bold text-red-950 font-mono mt-1">
                {driverData.avg_price_pressure ?? 28}/100
              </div>
            </div>

            <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3">
              <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Arrival Instability</span>
              <div className="text-xl font-bold text-amber-950 font-mono mt-1">
                {driverData.avg_arrival_instability ?? 31}/100
              </div>
            </div>

            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3">
              <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">Logistics Delay</span>
              <div className="text-xl font-bold text-blue-950 font-mono mt-1">
                {driverData.avg_logistics_delay ?? 18}/100
              </div>
            </div>
          </div>

          {/* Histogram Distribution Chart */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-[#364E00] mb-2">Risk Score Frequency Distribution</h4>
            <BarChart
              data={distBins}
              xAxisKey="score_bin"
              series={[{ field: 'count', label: 'Mandis', color: '#5B7B10' }]}
              height="200px"
            />
          </div>
        </div>

        {/* Top 10 Emerging Vulnerabilities */}
        <div className="agro-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#D97706]" />
              <span>Top 10 Emerging Vulnerabilities</span>
            </h3>
            <span className="text-[10px] text-[#7A8F59] font-medium">Click to inspect mandi</span>
          </div>

          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {emergingList.map((m) => (
              <div
                key={m.mandi_id}
                onClick={() => setSelectedMandi(m)}
                className="p-3 bg-[#FAFDF5] hover:bg-[#F4F8EC] border border-[#5B7B10]/15 hover:border-[#5B7B10]/40 rounded-xl transition-all cursor-pointer flex items-center justify-between group shadow-xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-[#1F2E0A] group-hover:text-[#364E00]">{m.mandi_name}</span>
                    <span className="text-[10px] text-[#7A8F59]">({m.district}, {m.state})</span>
                  </div>
                  <p className="text-[11px] text-[#6B7C4B] line-clamp-1 mt-0.5">
                    {Array.isArray(m.explanation) ? m.explanation[0] : m.explanation || m.recommended_action || 'Operational monitoring recommended'}
                  </p>
                </div>
                <div className="text-right pl-3">
                  <span className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full ${
                    m.risk_score >= 75 ? 'bg-red-100 text-red-700' : m.risk_score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-[#EBF3DA] text-[#364E00]'
                  }`}>
                    {m.risk_score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comprehensive Mandi Risk Directory (Replanned Interactive Registry) */}
      <div className="agro-card p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#5B7B10]/15 pb-3 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] font-['Outfit']">
                Comprehensive Mandi Risk Directory
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#5B7B10]/15 text-[#364E00]">
                {filteredDirectoryMandis.length} of {mandisList.length} Nodes
              </span>
            </div>
            <p className="text-[11px] text-[#7A8F59] mt-0.5">
              Deterministic APMC vulnerability index with tri-factor decomposition (Price 45%, Arrival 25%, Logistics 30%)
            </p>
          </div>

          {/* Instant Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A8F59]" />
            <input
              type="text"
              placeholder="Search mandi, district..."
              value={directorySearch}
              onChange={(e) => setDirectorySearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F7F9F2] border border-[#5B7B10]/20 rounded-lg text-[#1F2E0A] placeholder-[#7A8F59] focus:outline-none focus:border-[#5B7B10]"
            />
          </div>
        </div>

        {/* Filter Controls Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Severity Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[10px] uppercase font-bold text-[#7A8F59] mr-1">Severity:</span>
            <button
              onClick={() => setSeverityFilter('all')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                severityFilter === 'all'
                  ? 'bg-[#364E00] text-white shadow-xs'
                  : 'bg-[#F4F6EC] text-[#526633] hover:bg-[#E9EDDA] border border-[#5B7B10]/15'
              }`}
            >
              All ({mandisList.length})
            </button>
            <button
              onClick={() => setSeverityFilter('critical')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                severityFilter === 'critical'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              ● Critical ({mandisList.filter(m => (m.risk_score || 0) >= 75).length})
            </button>
            <button
              onClick={() => setSeverityFilter('high')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                severityFilter === 'high'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              ● High ({mandisList.filter(m => (m.risk_score || 0) >= 50 && (m.risk_score || 0) < 75).length})
            </button>
            <button
              onClick={() => setSeverityFilter('medium')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                severityFilter === 'medium'
                  ? 'bg-yellow-600 text-white shadow-xs'
                  : 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 border border-yellow-200'
              }`}
            >
              ● Medium ({mandisList.filter(m => (m.risk_score || 0) >= 25 && (m.risk_score || 0) < 50).length})
            </button>
            <button
              onClick={() => setSeverityFilter('low')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                severityFilter === 'low'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              ● Low ({mandisList.filter(m => (m.risk_score || 0) < 25).length})
            </button>
          </div>

          {/* Primary Driver Filter Chips */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[10px] uppercase font-bold text-[#7A8F59] mr-1">Driver:</span>
            <button
              onClick={() => setDriverFilter('all')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                driverFilter === 'all' ? 'bg-[#5B7B10] text-white' : 'bg-[#F4F6EC] text-[#526633] border border-[#5B7B10]/15'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setDriverFilter('price')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                driverFilter === 'price' ? 'bg-red-700 text-white' : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              Price Pressure
            </button>
            <button
              onClick={() => setDriverFilter('logistics')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                driverFilter === 'logistics' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              Logistics Delay
            </button>
            <button
              onClick={() => setDriverFilter('arrival')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                driverFilter === 'arrival' ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              Arrival Flux
            </button>
          </div>
        </div>

        <DataTable
          columns={riskColumns}
          data={filteredDirectoryMandis}
          pageSize={10}
          onRowClick={(row) => setSelectedMandi(row)}
        />
      </div>

      {/* Mandi Detail Side Drawer */}
      <MandiDetail mandi={selectedMandi} onClose={() => setSelectedMandi(null)} />
    </div>
  );
}
