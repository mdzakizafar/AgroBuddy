import React, { useState, useEffect } from 'react';
import { BarChart3, Maximize2, Minimize2, X, Activity } from 'lucide-react';
import AreaChart from './AreaChart';
import BarChart from './BarChart';
import LineChart from './LineChart';
import DonutChart from './DonutChart';
import ScatterChart from './ScatterChart';
import DataTable from '../common/DataTable';

export default function DynamicChart({ visualizationSpec, data }) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  if (!visualizationSpec || !data || data.length === 0) return null;

  const { chart_type, title, x_axis, series, horizontal, options = {} } = visualizationSpec;
  const xAxisKey = options.xKey || x_axis?.field || 'date';
  const isHorizontal = horizontal || options.horizontal || false;

  const renderChartCanvas = (canvasHeight = '280px') => {
    switch (chart_type) {
      case 'bar':
      case 'histogram':
        return (
          <BarChart
            data={data}
            xAxisKey={xAxisKey}
            series={series}
            horizontal={isHorizontal}
            height={canvasHeight}
          />
        );

      case 'scatter':
        return (
          <ScatterChart
            data={data}
            xKey={xAxisKey}
            yKey={options.yKey || (series && series[0] ? series[0].field : 'y')}
            xName={options.xName || x_axis?.label || 'X Axis'}
            yName={options.yName || (series && series[0]?.label ? series[0].label : 'Y Axis')}
            height={canvasHeight}
          />
        );

      case 'area':
        return (
          <AreaChart
            data={data}
            xAxisKey={xAxisKey}
            seriesKey={(series && series[0]?.field) || 'arrival_qtl'}
            height={canvasHeight}
          />
        );

      case 'table':
        return (
          <DataTable
            columns={Object.keys(data[0] || {}).map((key) => ({
              key,
              header: key.replace(/_/g, ' ').toUpperCase()
            }))}
            data={data}
            pageSize={isFullScreen ? 12 : 5}
          />
        );

      case 'donut':
        return (
          <DonutChart
            percentage={75}
            valueText={String(data[0]?.arrival_qtl || '75%')}
            label={title}
            height={canvasHeight}
          />
        );

      case 'line':
      default:
        return (
          <LineChart
            data={data}
            xAxisKey={xAxisKey}
            series={series}
            height={canvasHeight}
          />
        );
    }
  };

  return (
    <>
      {/* Standard Inline Chart View */}
      <div className="agro-card p-4 space-y-3 bg-white border-[#5B7B10]/20 shadow-sm relative group">
        {/* Chart Header */}
        <div className="flex items-center justify-between gap-2 border-b border-[#5B7B10]/10 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <BarChart3 className="w-4 h-4 text-[#5B7B10] shrink-0" />
            <h4 className="text-xs font-bold text-[#1F2E0A] uppercase tracking-wide truncate">
              {title}
            </h4>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsFullScreen(true)}
              title="View in Full Screen"
              className="p-1.5 rounded-lg text-[#526633] hover:text-[#1F2E0A] hover:bg-[#F4F6EC] border border-transparent hover:border-[#5B7B10]/20 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#5B7B10]" />
              <span className="hidden sm:inline">Full Screen</span>
            </button>
          </div>
        </div>

        {/* Inline Canvas */}
        <div>
          {renderChartCanvas('280px')}
        </div>
      </div>

      {/* Full Screen Modal Overlay */}
      {isFullScreen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 md:p-8 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl border border-[#5B7B10]/30 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAF2]/80">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#5B7B10]/10 text-[#5B7B10]">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F2E0A] uppercase tracking-wide">
                    {title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-[#526633]">
                    <Activity className="w-3.5 h-3.5 text-[#5B7B10]" />
                    <span>{data.length} Data Points • Full Resolution Analytical View</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFullScreen(false)}
                  className="px-3 py-1.5 rounded-xl bg-white text-[#1F2E0A] hover:bg-[#F4F6EC] border border-[#5B7B10]/20 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-[#5B7B10]" />
                  <span>Exit Full Screen</span>
                </button>
                <button
                  onClick={() => setIsFullScreen(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Chart Body */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col justify-center">
              <div className="w-full">
                {renderChartCanvas('520px')}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAF2]/50 flex items-center justify-between text-xs text-[#6B7C4B]">
              <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono text-gray-700">ESC</kbd> or click Exit to return</span>
              <span className="font-semibold text-[#5B7B10]">AgroBuddy Intelligence Analytics</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
