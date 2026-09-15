import React, { useState } from 'react';
import {
  Bot,
  User,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  Database,
  Clock,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet
} from 'lucide-react';
import DynamicChart from '../charts/DynamicChart';

const INTENT_LABELS = {
  out_of_scope: { label: 'Out of Scope Guardrail', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  general_query: { label: 'Platform & Domain Overview', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  mandi_profile: { label: 'Mandi Profile & Deep Dive', color: 'bg-lime-100 text-lime-900 border-lime-300' },
  mandi_price_pressure: { label: 'Below MSP Price Pressure', color: 'bg-red-100 text-red-800 border-red-300' },
  mandi_divergence: { label: 'Supply Glut Divergence', color: 'bg-amber-100 text-amber-900 border-amber-300' },
  crop_comparison: { label: 'Multi-Crop Comparison', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  forecast_arrivals: { label: '7-Day ML Forecast', color: 'bg-purple-100 text-purple-900 border-purple-300' },
  trend_comparison: { label: 'Daily Arrivals Trend', color: 'bg-teal-100 text-teal-900 border-teal-300' },
  logistics_bottlenecks: { label: 'Transport Delay Bottlenecks', color: 'bg-orange-100 text-orange-900 border-orange-300' },
  mandi_risk_ranking: { label: 'Mandi Risk Ranking', color: 'bg-rose-100 text-rose-900 border-rose-300' },
  weather_extremes: { label: 'Weather Telemetry Extremes', color: 'bg-cyan-100 text-cyan-900 border-cyan-300' },
  crop_price_pressure: { label: 'Crop-Level MSP Pressure', color: 'bg-indigo-100 text-indigo-900 border-indigo-300' }
};

export default function AgentResponse({ query, responseData }) {
  const [showRawData, setShowRawData] = useState(false);

  if (!responseData) return null;

  const {
    intent,
    data = [],
    visualization,
    summary,
    recommendation,
    is_grounded = true,
    data_points_count = 0,
    execution_time_ms
  } = responseData;

  const intentMeta = INTENT_LABELS[intent?.intent_type] || {
    label: intent?.intent_type || 'Agricultural Intelligence',
    color: 'bg-[#5B7B10]/10 text-[#364E00] border-[#5B7B10]/30'
  };

  const isOutOfScope = intent?.intent_type === 'out_of_scope';

  return (
    <div className="space-y-4 my-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* User Prompt Bubble */}
      <div className="flex justify-end">
        <div className="bg-[#5B7B10] text-white px-4 py-2.5 rounded-2xl rounded-tr-none text-xs font-semibold max-w-lg shadow-md flex items-center gap-2">
          <span>{query}</span>
          <User className="w-4 h-4 text-[#D9F99D] shrink-0" />
        </div>
      </div>

      {/* AI Bot Response Box */}
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shrink-0 ${
            isOutOfScope
              ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white'
              : 'bg-gradient-to-br from-[#84CC16] to-[#364E00] text-white'
          }`}
        >
          {isOutOfScope ? <ShieldAlert className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </div>

        <div className="flex-1 space-y-3.5 max-w-3xl">
          {/* Metadata & Provenance Bar */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {/* Intent Badge */}
            <span className={`px-2.5 py-0.5 rounded-full font-bold border ${intentMeta.color}`}>
              {intentMeta.label}
            </span>

            {/* Grounding Status Badge */}
            {is_grounded && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-[#ECFCCB] text-[#3F6212] border border-[#BEF264]">
                <Database className="w-3 h-3 text-[#65A30D]" />
                {data_points_count > 0
                  ? `Grounded on ${data_points_count} DuckDB Fact${data_points_count > 1 ? 's' : ''}`
                  : 'Grounded Agricultural Knowledge'}
              </span>
            )}

            {/* Execution Latency */}
            {execution_time_ms != null && (
              <span className="inline-flex items-center gap-1 text-[10px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md font-mono">
                <Clock className="w-3 h-3 text-gray-500" />
                {execution_time_ms}ms
              </span>
            )}
          </div>

          {/* Natural Language Summary Card */}
          <div
            className={`agro-card p-4.5 space-y-2 border ${
              isOutOfScope
                ? 'bg-amber-50/70 border-amber-200'
                : 'bg-white border-[#5B7B10]/20'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold">
              {isOutOfScope ? (
                <>
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span className="text-amber-800 uppercase tracking-wider">DOMAIN SCOPE NOTICE</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#84CC16]" />
                  <span className="text-[#5B7B10] uppercase tracking-wider">AGROBUDDY INTELLIGENCE RESPONSE</span>
                </>
              )}
            </div>
            <p className="text-xs text-[#1F2E0A] leading-relaxed font-medium">
              {summary}
            </p>
          </div>

          {/* Dynamic Visualization (if present) */}
          {visualization && data && data.length > 0 && (
            <DynamicChart visualizationSpec={visualization} data={data} />
          )}

          {/* Actionable Recommendation */}
          {recommendation && (
            <div
              className={`agro-card p-3.5 flex items-start gap-2.5 text-xs ${
                isOutOfScope
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-[#F6F8EF] border-[#5B7B10]/20 text-[#2A3B0F]'
              }`}
            >
              <CheckCircle2
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  isOutOfScope ? 'text-amber-600' : 'text-[#5B7B10]'
                }`}
              />
              <div>
                <span className="font-bold text-[#1F2E0A]">
                  {isOutOfScope ? 'Suggested Direction: ' : 'Action Recommendation: '}
                </span>
                <span>{recommendation}</span>
              </div>
            </div>
          )}

          {/* Expandable Grounded Data Auditor */}
          {data && data.length > 0 && (
            <div className="border border-[#5B7B10]/15 rounded-xl bg-white/80 overflow-hidden text-xs">
              <button
                onClick={() => setShowRawData(!showRawData)}
                className="w-full px-3.5 py-2 flex items-center justify-between text-[#364E00] hover:bg-[#F4F6EC] font-semibold text-[11px] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#5B7B10]" />
                  <span>
                    {showRawData ? 'Hide' : 'Audit'} Ground Truth Data Records ({data.length} row{data.length > 1 ? 's' : ''})
                  </span>
                </div>
                {showRawData ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showRawData && (
                <div className="p-3 border-t border-[#5B7B10]/10 bg-[#FAFBF7] max-h-56 overflow-auto font-mono text-[10px] text-[#2A3B0F]">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
