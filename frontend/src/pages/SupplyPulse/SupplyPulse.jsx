import React, { useState } from 'react';
import { TrendingUp, Users, Scale, AlertTriangle, Sprout, Building2 } from 'lucide-react';
import { useArrivalTrend, useArrivalsByCrop, useArrivalsByMandi } from '../../hooks/useArrivals';
import KpiCard from '../../components/common/KpiCard';
import FilterBar from '../../components/common/FilterBar';
import AIInsightPanel from '../../components/ai/AIInsightPanel';
import AreaChart from '../../components/charts/AreaChart';
import BarChart from '../../components/charts/BarChart';
import DataTable from '../../components/common/DataTable';
import MandiDetailDrawer from '../../components/mandi/MandiDetailDrawer';
import { KpiSkeleton, ChartSkeleton } from '../../components/common/Skeleton';
import { formatQtl, formatPct } from '../../lib/formatters';

export default function SupplyPulse() {
  const [filters, setFilters] = useState({});
  const [selectedMandiId, setSelectedMandiId] = useState(null);

  const { data: trendData, isLoading: isTrendLoading } = useArrivalTrend(filters);
  const { data: cropData, isLoading: isCropLoading } = useArrivalsByCrop(filters);
  const { data: mandiData, isLoading: isMandiLoading } = useArrivalsByMandi(filters);

  const trendSeries = trendData?.series || [];
  const cropList = cropData?.by_crop || [];
  const mandiList = mandiData?.by_mandi || [];

  const totalArrivals = cropList.reduce((acc, curr) => acc + (curr.arrival_qtl || 0), 0);
  const totalFarmers = cropList.reduce((acc, curr) => acc + (curr.farmer_count || 0), 0);

  const mandiColumns = [
    { key: 'mandi_name', header: 'Mandi Name' },
    { key: 'district', header: 'District' },
    { 
      key: 'arrival_qtl', 
      header: 'Total Arrivals', 
      render: (val) => <span className="font-extrabold text-[#5B7B10]">{formatQtl(val)}</span> 
    },
    { key: 'farmer_count', header: 'Farmers Served' },
    { 
      key: 'avg_qtl_per_farmer', 
      header: 'Avg Qtl / Farmer', 
      render: (val) => <span className="font-semibold text-[#1F2E0A]">{val ? Number(val).toFixed(2) : '—'}</span> 
    },
  ];

  return (
    <div className="space-y-6">
      <FilterBar filters={filters} onFilterChange={setFilters} onReset={() => setFilters({})} />

      <AIInsightPanel page="supply_pulse" filters={filters} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {isCropLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard title="Total Arrivals" value={formatQtl(totalArrivals)} trend={6.4} icon={TrendingUp} description="State Total Inflow" />
            <KpiCard title="Farmers Served" value={totalFarmers.toLocaleString()} trend={4.2} icon={Users} description="Active Producers" />
            <KpiCard title="Top Crop Contribution" value={cropList[0]?.crop_name || 'Wheat'} trend={12.1} icon={Sprout} description={formatPct(cropList[0]?.percentage_of_total || 45)} />
            <KpiCard title="Active Mandis" value={mandiList.length} trend={0} icon={Building2} description="Receiving centers" />
          </>
        )}
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 agro-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00]">Daily Arrival Volume Trend</h3>
            <span className="text-[10px] text-[#7A8F59] font-semibold">Qtl / Day</span>
          </div>
          {isTrendLoading ? <ChartSkeleton /> : <AreaChart data={trendSeries} xAxisKey="date" seriesKey="arrival_qtl" height="260px" />}
        </div>

        <div className="agro-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00]">Crop Share Distribution</h3>
          </div>
          {isCropLoading ? <ChartSkeleton /> : <BarChart data={cropList} xAxisKey="crop_name" series={[{ field: 'arrival_qtl', label: 'Arrival Qtl' }]} horizontal={true} height="260px" />}
        </div>
      </div>

      {/* Mandi Arrival Table */}
      <div className="agro-card p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00]">Mandi Arrival Rankings</h3>
        <DataTable columns={mandiColumns} data={mandiList} pageSize={8} onRowClick={(row) => setSelectedMandiId(row.mandi_id)} />
      </div>

      {selectedMandiId && <MandiDetailDrawer mandiId={selectedMandiId} onClose={() => setSelectedMandiId(null)} />}
    </div>
  );
}
