import React, { useState } from 'react';
import { Coins, AlertCircle, TrendingDown, Scale, Building2 } from 'lucide-react';
import { usePricesMSP, usePricePressure } from '../../hooks/usePrices';
import KpiCard from '../../components/common/KpiCard';
import FilterBar from '../../components/common/FilterBar';
import AIInsightPanel from '../../components/ai/AIInsightPanel';
import LineChart from '../../components/charts/LineChart';
import BarChart from '../../components/charts/BarChart';
import DataTable from '../../components/common/DataTable';
import MandiDetailDrawer from '../../components/mandi/MandiDetailDrawer';
import { KpiSkeleton, ChartSkeleton } from '../../components/common/Skeleton';
import { formatCurrency, formatPct } from '../../lib/formatters';

export default function FarmerPriceWatch() {
  const [filters, setFilters] = useState({});
  const [selectedMandiId, setSelectedMandiId] = useState(null);

  const { data: mspData, isLoading: isMspLoading } = usePricesMSP(filters);
  const { data: pressureData, isLoading: isPressureLoading } = usePricePressure(filters);

  const mspSeries = mspData?.series || [];
  const cropPressure = pressureData?.crop_pressure || [];
  const mandiPressure = pressureData?.mandi_pressure || [];

  const avgModal = cropPressure.length > 0 ? cropPressure[0].avg_modal_price : 2248;
  const avgMsp = cropPressure.length > 0 ? cropPressure[0].msp : 2275;
  const belowPct = cropPressure.length > 0 ? cropPressure[0].below_msp_percentage : 42.3;

  const priceColumns = [
    { key: 'mandi_name', header: 'Mandi Name' },
    { key: 'district', header: 'District' },
    { key: 'crop', header: 'Crop' },
    { key: 'avg_modal_price', header: 'Avg Modal Price', render: (val) => <span className="font-bold text-[#1F2E0A]">{formatCurrency(val)}</span> },
    { key: 'avg_msp', header: 'Govt MSP', render: (val) => <span className="font-bold text-[#5B7B10]">{formatCurrency(val)}</span> },
    { 
      key: 'below_msp_percentage', 
      header: 'Below MSP %', 
      render: (val) => (
        <span className={`font-extrabold ${val > 40 ? 'text-red-600' : 'text-lime-700'}`}>
          {formatPct(val)}
        </span>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <FilterBar filters={filters} onFilterChange={setFilters} onReset={() => setFilters({})} />

      <AIInsightPanel page="farmer_price_watch" filters={filters} />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {isPressureLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard title="Avg Modal Realization" value={formatCurrency(avgModal)} trend={3.8} icon={Coins} description="State Average Realized" />
            <KpiCard title="Government MSP" value={formatCurrency(avgMsp)} trend={0} icon={Scale} description="Floor Price Benchmark" />
            <KpiCard title="Below MSP Rate" value={formatPct(belowPct)} trend={-2.1} icon={AlertCircle} severity="warning" description="Records trading below floor" />
            <KpiCard title="Highest Pressure Crop" value={cropPressure[0]?.crop || 'Wheat'} trend={45.2} icon={TrendingDown} description="Highest MSP Delta" />
          </>
        )}
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 agro-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00]">Modal Price vs Government MSP Time Series</h3>
          </div>
          {isMspLoading ? (
            <ChartSkeleton />
          ) : (
            <LineChart
              data={mspSeries}
              xAxisKey="date"
              series={[
                { field: 'modal_price', label: 'Modal Price (₹/Qtl)', color: '#D97706' },
                { field: 'msp', label: 'MSP Benchmark (₹/Qtl)', color: '#5B7B10' }
              ]}
              height="280px"
            />
          )}
        </div>

        <div className="agro-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00]">Below MSP % by Crop</h3>
          </div>
          {isPressureLoading ? (
            <ChartSkeleton />
          ) : (
            <BarChart
              data={cropPressure}
              xAxisKey="crop"
              series={[{ field: 'below_msp_percentage', label: 'Below MSP %' }]}
              height="280px"
            />
          )}
        </div>
      </div>

      {/* Price Table */}
      <div className="agro-card p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00]">Mandi Price Pressure Rankings</h3>
        <DataTable columns={priceColumns} data={mandiPressure} pageSize={8} onRowClick={(row) => setSelectedMandiId(row.mandi_id)} />
      </div>

      {selectedMandiId && <MandiDetailDrawer mandiId={selectedMandiId} onClose={() => setSelectedMandiId(null)} />}
    </div>
  );
}
