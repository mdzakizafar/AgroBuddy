import React, { useState } from 'react';
import { LineChart as LineIcon, Calendar, Info, AlertCircle, Building2, Sprout } from 'lucide-react';
import { useForecastArrivals } from '../../hooks/useForecast';
import FilterBar from '../../components/common/FilterBar';
import AIInsightPanel from '../../components/ai/AIInsightPanel';
import LineChart from '../../components/charts/LineChart';
import { ChartSkeleton } from '../../components/common/Skeleton';
import { Badge } from '../../components/common/Badge';

export default function ForecastPlanning() {
  const [filters, setFilters] = useState({ horizon: 7 });

  const { data: forecastData, isLoading } = useForecastArrivals(filters);

  const status = forecastData?.status || 'not_available';
  const historical = forecastData?.historical || [];
  const forecast = forecastData?.forecast || [];

  return (
    <div className="space-y-6">
      <FilterBar filters={filters} onFilterChange={setFilters} onReset={() => setFilters({ horizon: 7 })} />

      <AIInsightPanel page="forecast_planning" filters={filters} />

      {/* Main Forecast Chart Card */}
      <div className="agro-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#5B7B10]/15 pb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#364E00] flex items-center gap-2">
              <LineIcon className="w-4 h-4 text-[#5B7B10]" />
              Historical Arrivals & Horizon Forecast
            </h3>
            <p className="text-xs text-[#7A8F59] font-medium">7-Day Predictive Horizon Contract</p>
          </div>

          <Badge variant={status === 'available' ? 'success' : 'warning'}>
            Status: {status === 'available' ? 'MODEL ATTACHED' : 'UNAVAILABLE (BASELINE HISTORICAL)'}
          </Badge>
        </div>

        {/* Forecast Unavailable Warning Notice (Section 17 rule) */}
        {status === 'not_available' && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2.5 font-medium">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Forecasting ML pipeline is not yet connected to backend. Displaying historical baseline arrivals for context. Predictions are not fabricated.</span>
          </div>
        )}

        {isLoading ? (
          <ChartSkeleton height="320px" />
        ) : (
          <LineChart
            data={historical}
            xAxisKey="date"
            series={[{ field: 'arrival_qtl', label: 'Historical Arrivals (Qtl)', color: '#5B7B10' }]}
            height="320px"
          />
        )}
      </div>
    </div>
  );
}
