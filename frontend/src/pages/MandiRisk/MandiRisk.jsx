import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Building2, Activity, BarChart2, Radio } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchRiskMandis, fetchRiskMap, fetchRiskDistribution, fetchRiskDrivers, fetchEmergingRisks } from '../../api/risk';
import KpiCard from '../../components/common/KpiCard';
import FilterBar from '../../components/common/FilterBar';
import AIInsightPanel from '../../components/ai/AIInsightPanel';
import DataTable from '../../components/common/DataTable';
import MandiRiskMap from '../../components/mandi/MandiRiskMap';
import MandiDetail from '../../components/mandi/MandiDetail';
import BarChart from '../../components/charts/BarChart';
import ScatterChart from '../../components/charts/ScatterChart';
import { KpiSkeleton } from '../../components/common/Skeleton';
import { Badge } from '../../components/common/Badge';

export default function MandiRisk() {
  const [filters, setFilters] = useState({});
  const [selectedMandi, setSelectedMandi] = useState(null);

  const { data: riskMandisRes, isLoading: isMandisLoading } = useQuery({
    queryKey: ['risk-mandis', filters],
    queryFn: () => fetchRiskMandis(filters)
  });

  const { data: riskMapRes } = useQuery({
    queryKey: ['risk-map', filters],
    queryFn: () => fetchRiskMap(filters)
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
  const mapPoints = riskMapRes?.data || mandisList;
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

  const riskColumns = [
    { key: 'mandi_name', header: 'Mandi Name' },
    { key: 'district', header: 'District' },
    { key: 'state', header: 'State' },
    { 
      key: 'risk_score', 
      header: 'Vulnerability Score', 
      render: (val) => (
        <div className="flex items-center gap-2">
          <span className={`text-base font-extrabold font-['Outfit'] ${val >= 75 ? 'text-red-600' : val >= 50 ? 'text-amber-600' : 'text-lime-700'}`}>
            {val}
          </span>
          <div className="w-16 bg-gray-100 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${val >= 75 ? 'bg-red-600' : val >= 50 ? 'bg-amber-500' : 'bg-lime-600'}`}
              style={{ width: `${val}%` }}
            />
          </div>
        </div>
      )
    },
    { 
      key: 'risk_level', 
      header: 'Risk Level', 
      render: (val) => {
        const vLower = (val || '').toLowerCase();
        let variant = 'success';
        if (vLower === 'critical' || vLower === 'high') variant = 'danger';
        else if (vLower === 'medium' || vLower === 'warning') variant = 'warning';
        return <Badge variant={variant}>{val?.toUpperCase()}</Badge>;
      }
    },
    { key: 'recommended_action', header: 'Recommended Intervention' }
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

      {/* Flagship Mandi Vulnerability Map */}
      <MandiRiskMap mandis={mapPoints} onSelectMandi={setSelectedMandi} />

      {/* NEW: Risk Driver Matrix (Scatter Bubble: X=Price Pressure, Y=Logistics Delay) */}
      <div className="agro-card p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#5B7B10]" />
              Risk Driver Matrix (Price Pressure vs Logistics Delay)
            </h3>
            <p className="text-[11px] text-[#7A8F59]">
              X: Price Pressure Score | Y: Logistics Delay Score | Bubble size: Arrival Instability Score | Color: Severity
            </p>
          </div>
          <span className="text-[10px] text-[#7A8F59] font-medium">Click node to inspect mandi</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[#6B7C4B] bg-[#F4F6EC] px-3 py-1.5 rounded-lg border border-[#5B7B10]/15 w-full sm:w-fit">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] inline-block" />
            <span className="font-semibold text-[#1F2E0A]">Price Pressure Hotspot</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] inline-block" />
            <span className="font-semibold text-[#1F2E0A]">Arrival Volatility</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] inline-block" />
            <span className="font-semibold text-[#1F2E0A]">Logistics Bottleneck</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5B7B10] inline-block" />
            <span className="font-semibold text-[#1F2E0A]">Baseline</span>
          </div>
        </div>

        <ScatterChart
          data={mandisList.map((m) => {
            const p = m.price_pressure_score || 0;
            const a = m.arrival_instability_score || 0;
            const l = m.logistics_delay_score || 0;
            const belowPct = m.below_msp_percentage || 0;
            const delayHrs = m.avg_delay_hours || 0;

            let color = '#5B7B10';
            if (belowPct >= 32.0 || p >= 23.5) {
              color = '#DC2626';
            } else if (delayHrs >= 50.0 || l >= 31.5) {
              color = '#2563EB';
            } else if (a >= 31.8) {
              color = '#D97706';
            }

            return {
              x: p,
              y: l,
              size: Math.max(12, Math.round((a || 10) * 0.8)),
              mandiName: m.mandi_name,
              mandiData: m,
              pointColor: color
            };
          })}
          xKey="x"
          yKey="y"
          xName="Price Pressure"
          yName="Logistics Delay"
          xUnit="/100"
          yUnit="/100"
          pointColor={(val, item) => item?.pointColor || '#5B7B10'}
          height="300px"
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

      {/* Comprehensive Risk Directory */}
      <div className="agro-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00]">
            Comprehensive Mandi Risk Directory
          </h3>
          <span className="text-xs text-[#7A8F59] font-medium">
            {mandisList.length} Monitored Mandi Nodes
          </span>
        </div>
        <DataTable
          columns={riskColumns}
          data={mandisList}
          onRowClick={(row) => setSelectedMandi(row)}
        />
      </div>

      {/* Mandi Detail Side Drawer */}
      <MandiDetail mandi={selectedMandi} onClose={() => setSelectedMandi(null)} />
    </div>
  );
}
