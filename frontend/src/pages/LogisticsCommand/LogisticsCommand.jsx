import React, { useState } from 'react';
import { Truck, Clock, AlertTriangle, MapPin, Route } from 'lucide-react';
import { useLogisticsSummary, useLogisticsDelays, useLogisticsByMandi } from '../../hooks/useLogistics';
import KpiCard from '../../components/common/KpiCard';
import FilterBar from '../../components/common/FilterBar';
import AIInsightPanel from '../../components/ai/AIInsightPanel';
import LineChart from '../../components/charts/LineChart';
import BarChart from '../../components/charts/BarChart';
import DataTable from '../../components/common/DataTable';
import MandiDetailDrawer from '../../components/mandi/MandiDetailDrawer';
import { KpiSkeleton, ChartSkeleton } from '../../components/common/Skeleton';
import { formatHours, formatPct, formatKm } from '../../lib/formatters';

export default function LogisticsCommand() {
  const [filters, setFilters] = useState({});
  const [selectedMandiId, setSelectedMandiId] = useState(null);

  const { data: summaryData, isLoading: isSummaryLoading } = useLogisticsSummary(filters);
  const { data: delaysData, isLoading: isDelaysLoading } = useLogisticsDelays(filters);
  const { data: mandiData, isLoading: isMandiLoading } = useLogisticsByMandi(filters);

  const summary = summaryData?.summary || {};
  const delaySeries = delaysData?.series || [];
  const mandiList = mandiData?.by_mandi || [];
  const routeList = mandiData?.routes || [];

  const routeColumns = [
    { key: 'mandi_name', header: 'Origin Mandi' },
    { key: 'destination_warehouse', header: 'Destination Warehouse' },
    { key: 'trip_count', header: 'Total Trips' },
    { key: 'distance_km', header: 'Distance', render: (val) => formatKm(val) },
    { key: 'avg_transit_hours', header: 'Avg Transit', render: (val) => formatHours(val) },
    { key: 'avg_delay_hours', header: 'Avg Delay', render: (val) => <span className="font-bold text-red-600">{formatHours(val)}</span> },
    { key: 'delayed_trip_percentage', header: 'Delayed %', render: (val) => <span className="font-bold text-amber-700">{formatPct(val)}</span> },
  ];

  return (
    <div className="space-y-6">
      <FilterBar filters={filters} onFilterChange={setFilters} onReset={() => setFilters({})} showCrop={false} />

      <AIInsightPanel page="logistics_command" filters={filters} />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {isSummaryLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard title="Total Transport Trips" value={summary.total_trips?.toLocaleString() || 10000} trend={5.1} icon={Truck} description="Active Dispatch Logs" />
            <KpiCard title="Avg Transit Duration" value={formatHours(summary.average_transit_hours || 14.8)} trend={-1.2} icon={Clock} description="Network Average" />
            <KpiCard title="Avg Delay Hours" value={formatHours(summary.average_delay_hours || 4.2)} trend={2.4} icon={AlertTriangle} severity="warning" description="Above Expected Time" />
            <KpiCard title="Delayed Trip Rate" value={formatPct(summary.delayed_trip_percentage || 14.2)} trend={-3.1} icon={Route} description="> 2 Hrs Delay" />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 agro-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00]">Daily Average Delay Hours Trend</h3>
          </div>
          {isDelaysLoading ? <ChartSkeleton /> : <LineChart data={delaySeries} xAxisKey="date" series={[{ field: 'average_delay_hours', label: 'Avg Delay Hours', color: '#EF4444' }]} height="260px" />}
        </div>

        <div className="agro-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00]">Delayed Trip Rate by Mandi</h3>
          </div>
          {isMandiLoading ? <ChartSkeleton /> : <BarChart data={mandiList.slice(0, 7)} xAxisKey="mandi_name" series={[{ field: 'delayed_trip_percentage', label: 'Delayed %' }]} height="260px" />}
        </div>
      </div>

      {/* Routes Bottleneck Table */}
      <div className="agro-card p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00]">Transport Bottlenecks by Route</h3>
        <DataTable columns={routeColumns} data={routeList} pageSize={8} onRowClick={(row) => setSelectedMandiId(row.mandi_id)} />
      </div>

      {selectedMandiId && <MandiDetailDrawer mandiId={selectedMandiId} onClose={() => setSelectedMandiId(null)} />}
    </div>
  );
}
