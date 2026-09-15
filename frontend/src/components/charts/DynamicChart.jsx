import React from 'react';
import AreaChart from './AreaChart';
import BarChart from './BarChart';
import LineChart from './LineChart';
import DonutChart from './DonutChart';
import ScatterChart from './ScatterChart';
import DataTable from '../common/DataTable';

export default function DynamicChart({ visualizationSpec, data }) {
  if (!visualizationSpec || !data || data.length === 0) return null;

  const { chart_type, title, x_axis, series } = visualizationSpec;
  const xAxisKey = x_axis?.field || 'date';

  if (chart_type === 'bar' || chart_type === 'histogram') {
    return (
      <div className="agro-card p-4 space-y-2">
        <h4 className="text-xs font-bold text-[#1F2E0A]">{title}</h4>
        <BarChart data={data} xAxisKey={xAxisKey} series={series} />
      </div>
    );
  }

  if (chart_type === 'scatter') {
    const sFieldY = series && series[0] ? series[0].field : 'y';
    return (
      <div className="agro-card p-4 space-y-2">
        <h4 className="text-xs font-bold text-[#1F2E0A]">{title}</h4>
        <ScatterChart
          data={data}
          xKey={xAxisKey}
          yKey={sFieldY}
          xName={x_axis?.label || 'X'}
          yName={series && series[0]?.label ? series[0].label : 'Y'}
        />
      </div>
    );
  }

  if (chart_type === 'area') {
    const sField = (series && series[0]?.field) || 'arrival_qtl';
    return (
      <div className="agro-card p-4 space-y-2">
        <h4 className="text-xs font-bold text-[#1F2E0A]">{title}</h4>
        <AreaChart data={data} xAxisKey={xAxisKey} seriesKey={sField} />
      </div>
    );
  }

  if (chart_type === 'table') {
    const columns = Object.keys(data[0] || {}).map((key) => ({
      key,
      header: key.replace(/_/g, ' ').toUpperCase()
    }));
    return (
      <div className="agro-card p-4 space-y-2">
        <h4 className="text-xs font-bold text-[#1F2E0A]">{title}</h4>
        <DataTable columns={columns} data={data} pageSize={5} />
      </div>
    );
  }

  if (chart_type === 'donut') {
    return (
      <div className="agro-card p-4 space-y-2">
        <h4 className="text-xs font-bold text-[#1F2E0A]">{title}</h4>
        <DonutChart percentage={75} valueText={String(data[0]?.arrival_qtl || '75%')} label={title} />
      </div>
    );
  }

  // Default: line chart
  return (
    <div className="agro-card p-4 space-y-2">
      <h4 className="text-xs font-bold text-[#1F2E0A]">{title}</h4>
      <LineChart data={data} xAxisKey={xAxisKey} series={series} />
    </div>
  );
}
