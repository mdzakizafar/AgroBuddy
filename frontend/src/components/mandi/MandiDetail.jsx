import React, { useEffect } from 'react';
import { X, AlertTriangle, ShieldCheck, MapPin, TrendingUp, Clock, AlertCircle } from 'lucide-react';

export default function MandiDetail({ mandi, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!mandi) return null;

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'bg-red-600 text-white';
      case 'medium':
      case 'warning':
        return 'bg-yellow-400 text-slate-950 font-bold';
      default:
        return 'bg-emerald-600 text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-full sm:max-w-md bg-white shadow-2xl flex flex-col border-l border-emerald-100">
          
          {/* Header */}
          <div className="p-4 sm:p-6 bg-emerald-950 text-white flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${getRiskColor(mandi.risk_level)}`}>
                  {mandi.risk_level || 'Low'} Risk
                </span>
                <span className="text-emerald-300 text-xs font-mono">Score: {mandi.risk_score || 0}/100</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold mt-2 text-white truncate">{mandi.mandi_name}</h2>
              <div className="flex items-center space-x-2 text-xs text-emerald-300 mt-1 truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{mandi.district}, {mandi.state}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">

            {/* Coordinates Badge */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Geographic Location:</span>
              <span className="font-mono text-slate-800 text-[11px] sm:text-xs">
                {mandi.latitude && mandi.longitude
                  ? `${mandi.latitude.toFixed(2)}°N, ${mandi.longitude.toFixed(2)}°E`
                  : 'Location data unavailable'}
              </span>
            </div>

            {/* Risk Component Driver Breakdown */}
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 mb-2.5 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Risk Driver Decomposition</span>
              </h3>
              
              <div className="space-y-3 bg-slate-50 border border-slate-100 rounded-xl p-3.5 sm:p-4">
                {/* Price Pressure */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">Price Pressure</span>
                    <span className="text-slate-900 font-mono">{mandi.price_pressure_score ?? mandi.components?.price_pressure ?? 0}/100</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${mandi.price_pressure_score ?? mandi.components?.price_pressure ?? 0}%` }}
                    />
                  </div>
                </div>

                {/* Arrival Instability */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">Arrival Instability</span>
                    <span className="text-slate-900 font-mono">{mandi.arrival_instability_score ?? mandi.components?.arrival_instability ?? 0}/100</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${mandi.arrival_instability_score ?? mandi.components?.arrival_instability ?? 0}%` }}
                    />
                  </div>
                </div>

                {/* Logistics Delay */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">Logistics Delay</span>
                    <span className="text-slate-900 font-mono">{mandi.logistics_delay_score ?? mandi.components?.logistics_delay ?? 0}/100</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${mandi.logistics_delay_score ?? mandi.components?.logistics_delay ?? 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Key Operational Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 sm:p-3.5">
                <div className="flex items-center space-x-1.5 text-xs text-emerald-800 font-medium">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Total Arrivals</span>
                </div>
                <div className="text-base sm:text-lg font-bold text-emerald-950 mt-1 font-mono">
                  {mandi.arrival_volume ? `${(mandi.arrival_volume / 1000).toFixed(1)}k Qtl` : 'N/A'}
                </div>
              </div>

              <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 sm:p-3.5">
                <div className="flex items-center space-x-1.5 text-xs text-amber-800 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Below MSP Rate</span>
                </div>
                <div className="text-base sm:text-lg font-bold text-amber-950 mt-1 font-mono">
                  {mandi.below_msp_percentage ? `${Number(mandi.below_msp_percentage).toFixed(1)}%` : '0%'}
                </div>
              </div>

              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 sm:p-3.5">
                <div className="flex items-center space-x-1.5 text-xs text-blue-800 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Avg Delay</span>
                </div>
                <div className="text-base sm:text-lg font-bold text-blue-950 mt-1 font-mono">
                  {mandi.avg_delay_hours ? `${Number(mandi.avg_delay_hours).toFixed(1)} hrs` : '0 hrs'}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5">
                <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Delayed Trips</span>
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-900 mt-1 font-mono">
                  {mandi.delayed_trip_percentage ? `${Number(mandi.delayed_trip_percentage).toFixed(1)}%` : '0%'}
                </div>
              </div>
            </div>

            {/* Operational Diagnosis */}
            {mandi.explanation && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-1.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Operational Diagnosis</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {Array.isArray(mandi.explanation) ? mandi.explanation.join(' ') : mandi.explanation}
                </p>
              </div>
            )}

            {/* Recommended Intervention */}
            {(mandi.recommended_intervention || mandi.recommended_action) && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 sm:p-4 space-y-1.5">
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">Recommended Intervention</h4>
                <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                  {mandi.recommended_intervention || mandi.recommended_action}
                </p>
              </div>
            )}

          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Close Details
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

