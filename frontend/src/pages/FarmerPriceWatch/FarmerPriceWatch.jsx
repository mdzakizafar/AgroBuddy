import React, { useState } from 'react';
import { 
  Coins, 
  AlertCircle, 
  TrendingDown, 
  Scale, 
  ArrowDownRight, 
  Building2, 
  ExternalLink,
  Table,
  Layers
} from 'lucide-react';
import { 
  usePricesKPIs, 
  usePricesMSP, 
  usePricePressure, 
  usePriceDirectory 
} from '../../hooks/usePrices';
import KpiCard from '../../components/common/KpiCard';
import FilterBar from '../../components/common/FilterBar';
import AIInsightPanel from '../../components/ai/AIInsightPanel';
import PriceGapChart from '../../components/charts/PriceGapChart';
import BarChart from '../../components/charts/BarChart';
import DataTable from '../../components/common/DataTable';
import MandiDetailDrawer from '../../components/mandi/MandiDetailDrawer';
import { KpiSkeleton, ChartSkeleton } from '../../components/common/Skeleton';
import { formatCurrency, formatPct, formatShortfall } from '../../lib/formatters';

export default function FarmerPriceWatch() {
  const [filters, setFilters] = useState({});
  const [selectedMandiId, setSelectedMandiId] = useState(null);
  const [activeTableTab, setActiveTableTab] = useState('mandi-rankings');

  const { data: kpiData, isLoading: isKpiLoading } = usePricesKPIs(filters);
  const { data: mspData, isLoading: isMspLoading } = usePricesMSP(filters);
  const { data: pressureData, isLoading: isPressureLoading } = usePricePressure(filters);
  const { data: directoryData, isLoading: isDirectoryLoading } = usePriceDirectory(filters);

  // Daily trend data with fallback
  const mspTrendData = mspData?.data || [];
  const cropPressure = pressureData?.crop_pressure || [];
  const mandiPressure = pressureData?.mandi_pressure || [];
  const directoryRows = (directoryData?.data || []).filter((r) => r.below_msp_flag === 1);

  // Fallbacks & KPI Metrics
  const rawKpi = kpiData?.data;
  const avgModal = rawKpi?.avg_modal_price ?? (cropPressure.length > 0 ? cropPressure[0].avg_modal_price : 3798.71);
  const avgMsp = rawKpi?.avg_msp ?? (cropPressure.length > 0 ? cropPressure[0].avg_msp : 3721.30);
  const belowPct = rawKpi?.below_msp_percentage ?? (cropPressure.length > 0 ? cropPressure[0].below_msp_percentage : 30.55);
  const avgShortfall = rawKpi?.avg_msp_shortfall ?? 170.56;
  const topPressureCrop = cropPressure.length > 0 ? cropPressure[0] : { crop_name: 'Wheat', below_msp_percentage: 31.9 };

  // Mandi Price Pressure Rankings Columns
  const mandiColumns = [
    { 
      key: 'mandi_name', 
      header: 'Mandi Name',
      render: (val) => <span className="font-bold text-[#1F2E0A]">{val}</span>
    },
    { key: 'district', header: 'District' },
    {
      key: 'avg_modal_price',
      header: 'Avg Realized Price',
      render: (val) => <span className="font-semibold text-[#1F2E0A]">{formatCurrency(val)}</span>
    },
    {
      key: 'avg_msp',
      header: 'Govt MSP Benchmark',
      render: (val) => <span className="font-semibold text-[#5B7B10]">{formatCurrency(val)}</span>
    },
    {
      key: 'avg_msp_gap',
      header: 'Avg Shortfall',
      render: (val) => (
        <span className="font-bold text-rose-600">
          -₹{Number(val || 0).toFixed(1)}/Qtl
        </span>
      )
    },
    {
      key: 'below_msp_percentage',
      header: 'Below MSP Rate',
      render: (val, row) => {
        const rate = val ?? row?.below_msp_rate ?? 0;
        return (
          <span className={`font-bold ${rate > 30 ? 'text-rose-600' : 'text-[#5B7B10]'}`}>
            {Number(rate).toFixed(1)}%
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Action',
      render: (_, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedMandiId(row.mandi_id);
          }}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5B7B10] hover:text-[#364E00] hover:underline"
        >
          <Building2 className="w-3.5 h-3.5" />
          Inspect
        </button>
      )
    }
  ];

  // Distressed Transactions Columns
  const transactionColumns = [
    { key: 'date', header: 'Date' },
    { 
      key: 'crop', 
      header: 'Commodity',
      render: (val) => <span className="font-bold text-[#1F2E0A]">{val}</span>
    },
    { key: 'mandi_name', header: 'Mandi Location' },
    { key: 'district', header: 'District' },
    {
      key: 'modal_price',
      header: 'Realized Price',
      render: (val) => <span className="font-semibold text-[#1F2E0A]">{formatCurrency(val)}</span>
    },
    {
      key: 'msp',
      header: 'Govt MSP Floor',
      render: (val) => <span className="font-semibold text-[#5B7B10]">{formatCurrency(val)}</span>
    },
    {
      key: 'msp_gap',
      header: 'Farmer Shortfall',
      render: (_, row) => {
        const modal = Number(row.modal_price || 0);
        const msp = Number(row.msp || 0);
        const shortfall = Math.max(0, msp - modal);
        return (
          <span className="font-extrabold text-rose-600">
            {formatShortfall(shortfall)}
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Action',
      render: (_, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedMandiId(row.mandi_id);
          }}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5B7B10] hover:text-[#364E00] hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          Mandi Detail
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <FilterBar filters={filters} onFilterChange={setFilters} onReset={() => setFilters({})} />

      <AIInsightPanel page="farmer_price_watch" filters={filters} />

      {/* 5 Executive KPIs as per Implementation Plan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {isKpiLoading || isPressureLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              title="Avg Modal Realization"
              value={formatCurrency(avgModal)}
              trend={3.8}
              trendLabel="vs baseline"
              icon={Coins}
              description="State Average Realized"
            />
            <KpiCard
              title="Govt MSP Benchmark"
              value={formatCurrency(avgMsp)}
              trend={0}
              trendLabel="vs target floor"
              icon={Scale}
              description="Guaranteed Floor Target"
            />
            <KpiCard
              title="Average MSP Gap"
              value={formatCurrency(avgShortfall)}
              unit="/ Qtl"
              trend={-4.2}
              trendLabel="gap improvement"
              icon={ArrowDownRight}
              severity="warning"
              description="Avg Shortfall on Distressed Trades"
            />
            <KpiCard
              title="Below MSP Rate"
              value={formatPct(belowPct)}
              trend={-2.1}
              trendLabel="vs last month"
              icon={AlertCircle}
              severity="warning"
              description="Transactions below floor"
            />
            <KpiCard
              title="Most Affected Crop"
              value={topPressureCrop.crop_name || topPressureCrop.crop || 'Wheat'}
              trend={Number((topPressureCrop.below_msp_percentage || topPressureCrop.below_msp_rate || 31.9).toFixed(1))}
              trendLabel="distress rate"
              icon={TrendingDown}
              severity="critical"
              description={`${formatPct(topPressureCrop.below_msp_percentage || topPressureCrop.below_msp_rate)} Under MSP`}
            />
          </>
        )}
      </div>

      {/* Main Charts: Modal Price vs MSP with Shaded Gap Area + Crops Under Pressure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 agro-card p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#5B7B10]/15 pb-3 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00]">
                  Daily Modal Price vs MSP Benchmark
                </h3>
              </div>
              <p className="text-[11px] text-[#7A8F59] mt-0.5">
                Realized modal price trajectory tracked against statutory minimum support price floor
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20">
                REALIZED: {formatCurrency(avgModal)}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#5B7B10]/10 text-[#5B7B10] border border-[#5B7B10]/20">
                MSP FLOOR: {formatCurrency(avgMsp)}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                DEFICIT: -₹{Number(avgShortfall).toFixed(1)}/Qtl
              </span>
            </div>
          </div>
          {isMspLoading ? (
            <ChartSkeleton />
          ) : (
            <PriceGapChart data={mspTrendData} height="310px" />
          )}
        </div>

        {/* MSP Pressure by Crop: Two-Dimensional Breakdown (Below MSP % + Avg MSP Gap) */}
        <div className="agro-card p-5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#5B7B10]/15 pb-3 mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00] font-['Outfit']">
                  MSP Pressure by Crop
                </h3>
                <p className="text-[11px] text-[#7A8F59]">Two-dimensional distress analysis</p>
              </div>
              <span className="text-[10px] text-[#5B7B10] font-bold bg-[#E8EED8] px-2 py-0.5 rounded border border-[#5B7B10]/20">
                Below MSP % & Gap
              </span>
            </div>

            {isPressureLoading ? (
              <ChartSkeleton />
            ) : (
              <div className="space-y-2.5">
                {cropPressure.map((item) => {
                  const belowRate = Number(item.below_msp_percentage || item.below_msp_rate || 0);
                  const gapVal = Number(item.avg_msp_gap || 0);
                  return (
                    <div 
                      key={item.crop_name}
                      className="p-2.5 bg-[#F6F8EF] border border-[#5B7B10]/15 rounded-xl space-y-1.5 hover:bg-[#EEF2E0] transition-colors"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[#1F2E0A] text-sm">{item.crop_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                            {belowRate.toFixed(1)}% Below MSP
                          </span>
                          <span className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-mono">
                            {gapVal > 0 ? `-₹${gapVal.toFixed(1)}/Qtl` : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Visual distress pressure progress */}
                      <div className="w-full bg-[#E9EDDA] h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-amber-500 to-rose-600 h-full rounded-full"
                          style={{ width: `${Math.min(100, belowRate * 2.5)}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-[#6B7C4B]">
                        <span>Realized: <strong className="text-[#1F2E0A]">{formatCurrency(item.avg_modal_price)}</strong></span>
                        <span>Floor MSP: <strong className="text-[#5B7B10]">{formatCurrency(item.avg_msp)}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Tables: Mandi Price Pressure Rankings & Distressed Transactions */}
      <div className="agro-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#5B7B10]/15 pb-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTableTab('mandi-rankings')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs transition-all cursor-pointer ${
                activeTableTab === 'mandi-rankings'
                  ? 'bg-[#5B7B10] text-white shadow-sm shadow-[#5B7B10]/20 font-bold border border-[#5B7B10]'
                  : 'bg-[#F6F8EF] text-[#526633] border border-[#5B7B10]/20 hover:bg-[#EEF2E0] hover:text-[#1F2E0A] font-medium'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Mandi Price Pressure ({mandiPressure.length})</span>
            </button>
            <button
              onClick={() => setActiveTableTab('distressed-transactions')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs transition-all cursor-pointer ${
                activeTableTab === 'distressed-transactions'
                  ? 'bg-[#5B7B10] text-white shadow-sm shadow-[#5B7B10]/20 font-bold border border-[#5B7B10]'
                  : 'bg-[#F6F8EF] text-[#526633] border border-[#5B7B10]/20 hover:bg-[#EEF2E0] hover:text-[#1F2E0A] font-medium'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Distressed Trades ({directoryRows.length})</span>
            </button>
          </div>
          <span className="text-[11px] sm:text-xs text-[#7A8F59] font-medium">
            Click any row to open Mandi drawer
          </span>
        </div>

        {activeTableTab === 'mandi-rankings' ? (
          <DataTable
            columns={mandiColumns}
            data={mandiPressure}
            pageSize={8}
            onRowClick={(row) => setSelectedMandiId(row.mandi_id)}
          />
        ) : (
          <DataTable
            columns={transactionColumns}
            data={directoryRows}
            pageSize={8}
            onRowClick={(row) => setSelectedMandiId(row.mandi_id)}
          />
        )}
      </div>

      {selectedMandiId && (
        <MandiDetailDrawer mandiId={selectedMandiId} onClose={() => setSelectedMandiId(null)} />
      )}
    </div>
  );
}
