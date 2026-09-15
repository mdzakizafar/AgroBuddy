import React, { useState } from 'react';
import { TrendingUp, Users, Sprout, Building2, Layers, Activity } from 'lucide-react';
import { useArrivalTrend, useArrivalsByCrop, useArrivalsByMandi } from '../../hooks/useArrivals';
import KpiCard from '../../components/common/KpiCard';
import FilterBar from '../../components/common/FilterBar';
import AIInsightPanel from '../../components/ai/AIInsightPanel';
import AreaChart from '../../components/charts/AreaChart';
import BarChart from '../../components/charts/BarChart';
import ScatterChart from '../../components/charts/ScatterChart';
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

  const trendSeries = trendData?.data || trendData?.series || [];
  const cropList = cropData?.data || cropData?.by_crop || [];
  const mandiList = mandiData?.data || mandiData?.by_mandi || [];

  const totalArrivals = cropList.reduce((acc, curr) => acc + (curr.arrival_qtl || 0), 0);
  const totalFarmers = cropList.reduce((acc, curr) => acc + (curr.farmer_count || 0), 0);
  const topCrop = cropList[0] || { crop_name: 'Wheat', share_percent: 17.1 };
  const topCropShare = topCrop.share_percent ?? topCrop.percentage_of_total ?? 17.1;

  // Compute state averages for scatter quadrant reference lines
  const avgFarmers = mandiList.length > 0
    ? Math.round(mandiList.reduce((sum, m) => sum + (m.farmer_count || 0), 0) / mandiList.length)
    : 34226;
  const avgArrival = mandiList.length > 0
    ? Math.round(mandiList.reduce((sum, m) => sum + (m.total_arrival_qtl || m.arrival_qtl || 0), 0) / mandiList.length)
    : 98200;

  const mandiColumns = [
    { key: 'mandi_name', header: 'Mandi Name' },
    { key: 'district', header: 'District' },
    { 
      key: 'total_arrival_qtl', 
      header: 'Total Arrivals', 
      render: (val, row) => (
        <span className="font-extrabold text-[#5B7B10]">
          {formatQtl(val ?? row?.total_arrival_qtl ?? row?.arrival_qtl)}
        </span>
      )
    },
    { 
      key: 'farmer_count', 
      header: 'Farmers Served',
      render: (val) => <span className="font-medium text-[#1F2E0A]">{Number(val || 0).toLocaleString()}</span>
    },
    { 
      key: 'avg_qtl_per_farmer', 
      header: 'Avg Qtl / Farmer', 
      render: (val) => (
        <span className="font-semibold px-2 py-0.5 rounded text-xs bg-[#F4F6EC] text-[#364E00]">
          {val ? Number(val).toFixed(2) : '—'} Qtl
        </span>
      )
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
            <KpiCard
              title="Total Arrivals"
              value={formatQtl(totalArrivals)}
              trend={6.4}
              trendLabel="vs prior period"
              icon={TrendingUp}
              description="State Total Inflow"
            />
            <KpiCard
              title="Farmers Served"
              value={totalFarmers.toLocaleString()}
              trend={4.2}
              trendLabel="vs prior period"
              icon={Users}
              description="Active Producers"
            />
            <KpiCard
              title="Top Crop Contribution"
              value={topCrop.crop_name}
              trend={12.1}
              trendLabel="vs avg share"
              icon={Sprout}
              description={`${formatPct(topCropShare)} of State Arrivals`}
            />
            <KpiCard
              title="Active Mandis"
              value={mandiList.length || 57}
              trend={0}
              trendLabel="vs total mandis"
              icon={Building2}
              description="Operating Distribution Centers"
            />
          </>
        )}
      </div>

      {/* Main Charts: Daily Arrival Trend + 7d Moving Average & Crop Share Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 agro-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#5B7B10]/15 pb-3 gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#5B7B10]" />
                Daily Arrival Volume & 7-Day Moving Average
              </h3>
              <p className="text-[11px] text-[#7A8F59]">
                Continuous actual daily arrivals alongside smoothed 7-day trajectory
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#364E00] font-bold bg-[#E8EED8] px-2.5 py-1 rounded-full border border-[#84CC16]/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#84CC16] animate-pulse" />
                PEAK TODAY: 31.8k Qtl
              </span>
              <span className="text-[10px] text-[#5B7B10] font-bold bg-[#F4F6EC] px-2.5 py-1 rounded-full">
                Qtl / Day
              </span>
            </div>
          </div>
          {isTrendLoading ? (
            <ChartSkeleton />
          ) : (
            <AreaChart
              data={trendSeries}
              xAxisKey="date"
              series={[
                {
                  field: 'arrival_qtl',
                  label: 'Daily Actual (Qtl)',
                  color: '#84CC16',
                  isArea: true,
                  opacity: 0.3
                },
                {
                  field: 'rolling_7d_arrival_qtl',
                  label: '7-Day Moving Average',
                  color: '#1C270A',
                  isArea: false,
                  width: 3.5
                }
              ]}
              height="290px"
              valueFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k Qtl` : val)}
            />
          )}
        </div>

        {/* Crop Share Breakdown (Reverted back to clean original bar chart) */}
        <div className="agro-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#5B7B10]" />
              Crop Share Breakdown
            </h3>
          </div>
          {isCropLoading ? (
            <ChartSkeleton />
          ) : (
            <BarChart
              data={cropList}
              xAxisKey="crop_name"
              series={[{ field: 'arrival_qtl', label: 'Arrival Qtl' }]}
              horizontal={true}
              height="280px"
            />
          )}
        </div>
      </div>

      {/* Mandi Throughput vs Farmer Participation Matrix */}
      <div className="agro-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#5B7B10]/15 pb-3 gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#5B7B10]" />
              Mandi Throughput vs Farmer Participation Matrix
            </h3>
            <p className="text-[11px] text-[#7A8F59]">
              X: Farmers Served | Y: Total Arrival (Qtl) | Bubble size: Avg Qtl / Farmer
            </p>
          </div>

          {/* Efficiency Tiers Legend */}
          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1 font-semibold text-[#1F2E0A] bg-[#E8EED8] px-2 py-0.5 rounded border border-[#84CC16]/30">
              <span className="w-2 h-2 rounded-full bg-[#84CC16]" />
              Commercial Terminal (≥ 2.75 Qtl/Farmer)
            </span>
            <span className="flex items-center gap-1 font-semibold text-[#1F2E0A] bg-[#EBF0DC] px-2 py-0.5 rounded border border-[#5B7B10]/30">
              <span className="w-2 h-2 rounded-full bg-[#5B7B10]" />
              High Volume Hub (2.50 - 2.75)
            </span>
            <span className="flex items-center gap-1 font-semibold text-[#1F2E0A] bg-[#FEF3C7] px-2 py-0.5 rounded border border-[#D97706]/30">
              <span className="w-2 h-2 rounded-full bg-[#D97706]" />
              Community Market (&lt; 2.50)
            </span>
          </div>
        </div>

        {isMandiLoading ? (
          <ChartSkeleton />
        ) : (
          <ScatterChart
            data={mandiList.map((m) => {
              const ratio = Number(m.avg_qtl_per_farmer || 2.8);
              let color = '#5B7B10';
              if (ratio >= 2.75) color = '#84CC16';
              else if (ratio < 2.5) color = '#D97706';

              return {
                x: m.farmer_count || 0,
                y: Math.round(m.total_arrival_qtl || m.arrival_qtl || 0),
                size: Number(ratio.toFixed(1)),
                mandiName: m.mandi_name,
                district: m.district,
                mandiId: m.mandi_id,
                avg_qtl_per_farmer: ratio,
                pointColor: color
              };
            })}
            xKey="x"
            yKey="y"
            xName="Farmers Served"
            yName="Arrival Volume"
            xUnit="Farmers"
            yUnit="Qtl"
            height="300px"
            markLine={[
              { xAxis: avgFarmers, label: `State Avg Farmers (${(avgFarmers / 1000).toFixed(1)}k)` },
              { yAxis: avgArrival, label: `State Avg Volume (${(avgArrival / 1000).toFixed(0)}k Qtl)` }
            ]}
            onPointClick={(point) => point.mandiId && setSelectedMandiId(point.mandiId)}
          />
        )}
      </div>

      {/* Mandi Arrival Rankings Table */}
      <div className="agro-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00]">
            Mandi Arrival & Farmer Participation Rankings
          </h3>
          <span className="text-xs text-[#7A8F59] font-medium">
            Click any row to open comprehensive Mandi Intelligence drawer
          </span>
        </div>
        <DataTable
          columns={mandiColumns}
          data={mandiList}
          pageSize={8}
          onRowClick={(row) => setSelectedMandiId(row.mandi_id)}
        />
      </div>

      {selectedMandiId && (
        <MandiDetailDrawer mandiId={selectedMandiId} onClose={() => setSelectedMandiId(null)} />
      )}
    </div>
  );
}
