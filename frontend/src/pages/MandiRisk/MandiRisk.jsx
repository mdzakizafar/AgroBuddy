import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Building2, ChevronRight, Activity } from 'lucide-react';
import { useRiskMandis } from '../../hooks/useRisk';
import KpiCard from '../../components/common/KpiCard';
import FilterBar from '../../components/common/FilterBar';
import AIInsightPanel from '../../components/ai/AIInsightPanel';
import DataTable from '../../components/common/DataTable';
import MandiDetailDrawer from '../../components/mandi/MandiDetailDrawer';
import { KpiSkeleton } from '../../components/common/Skeleton';
import { Badge } from '../../components/common/Badge';

export default function MandiRisk() {
  const [filters, setFilters] = useState({});
  const [selectedMandiId, setSelectedMandiId] = useState(null);

  const { data: riskData, isLoading } = useRiskMandis(filters);
  const mandisList = riskData?.mandis || [];

  const highRiskCount = mandisList.filter((m) => m.risk_level === 'high').length;
  const mediumRiskCount = mandisList.filter((m) => m.risk_level === 'medium').length;

  const riskColumns = [
    { key: 'mandi_name', header: 'Mandi Name' },
    { key: 'district', header: 'District' },
    { key: 'state', header: 'State' },
    { 
      key: 'risk_score', 
      header: 'Vulnerability Score', 
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <span className={`text-base font-extrabold font-['Outfit'] ${val >= 70 ? 'text-red-600' : val >= 40 ? 'text-amber-600' : 'text-lime-700'}`}>
            {val}
          </span>
          <div className="w-16 bg-gray-100 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${val >= 70 ? 'bg-red-500' : val >= 40 ? 'bg-amber-500' : 'bg-[#84CC16]'}`}
              style={{ width: `${val}%` }}
            />
          </div>
        </div>
      )
    },
    { 
      key: 'risk_level', 
      header: 'Risk Level', 
      render: (val) => (
        <Badge variant={val === 'high' ? 'danger' : val === 'medium' ? 'warning' : 'success'}>
          {val?.toUpperCase()}
        </Badge>
      )
    },
    { key: 'recommended_action', header: 'Recommended Intervention' },
  ];

  return (
    <div className="space-y-6">
      <FilterBar filters={filters} onFilterChange={setFilters} onReset={() => setFilters({})} showCrop={false} />

      <AIInsightPanel page="mandi_risk" filters={filters} />

      {/* KPIs */}
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
            <KpiCard title="Mandis Assessed" value={mandisList.length} trend={0} icon={Building2} description="Total Monitored Nodes" />
            <KpiCard title="High Risk Mandis" value={highRiskCount} trend={highRiskCount > 0 ? 12.5 : 0} icon={ShieldAlert} severity="danger" description="Immediate Priority" />
            <KpiCard title="Medium Risk Mandis" value={mediumRiskCount} trend={-4.1} icon={AlertTriangle} severity="warning" description="Operational Concern" />
            <KpiCard title="Low Risk Baseline" value={mandisList.length - highRiskCount - mediumRiskCount} trend={8.2} icon={CheckCircle2} description="Healthy Markets" />
          </>
        )}
      </div>

      {/* Top Vulnerable Mandis Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#EF4444]" />
          Top Mandi Vulnerability Rankings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mandisList.slice(0, 3).map((m) => (
            <div
              key={m.mandi_id}
              onClick={() => setSelectedMandiId(m.mandi_id)}
              className="agro-card p-5 space-y-3 cursor-pointer hover:border-[#5B7B10] group transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#1F2E0A]">{m.mandi_name}</span>
                <Badge variant={m.risk_level === 'high' ? 'danger' : 'warning'}>
                  Score: {m.risk_score}
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs text-[#526633]">
                <div className="flex justify-between">
                  <span>Price Pressure:</span>
                  <span className="font-bold text-[#1F2E0A]">{m.components.price_pressure}</span>
                </div>
                <div className="flex justify-between">
                  <span>Arrival Instability:</span>
                  <span className="font-bold text-[#1F2E0A]">{m.components.arrival_instability}</span>
                </div>
                <div className="flex justify-between">
                  <span>Logistics Delay:</span>
                  <span className="font-bold text-[#1F2E0A]">{m.components.logistics_delay}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#5B7B10]/15 flex items-center justify-between text-xs font-bold text-[#5B7B10]">
                <span>Inspect Mandi State</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Table */}
      <div className="agro-card p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00]">Comprehensive Risk Directory</h3>
        <DataTable columns={riskColumns} data={mandisList} pageSize={8} onRowClick={(row) => setSelectedMandiId(row.mandi_id)} />
      </div>

      {selectedMandiId && <MandiDetailDrawer mandiId={selectedMandiId} onClose={() => setSelectedMandiId(null)} />}
    </div>
  );
}
