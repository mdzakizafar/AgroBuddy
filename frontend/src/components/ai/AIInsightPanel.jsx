import React from 'react';
import { Sparkles, AlertCircle, CheckCircle2, Info, RotateCw } from 'lucide-react';
import { useInsights } from '../../hooks/useInsights';
import { Skeleton } from '../common/Skeleton';
import { Badge } from '../common/Badge';

export default function AIInsightPanel({ page, filters = {} }) {
  const { data, isLoading, isError, refetch } = useInsights(page, filters);

  if (isLoading) {
    return (
      <div className="agro-card p-5 bg-gradient-to-r from-[#F4F6EC] to-white border-[#5B7B10]/20 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#5B7B10] animate-spin" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    );
  }

  if (isError || !data || !data.insight) {
    return (
      <div className="agro-card p-4 bg-amber-50/60 border-amber-200 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-800 font-semibold">
          <Info className="w-4 h-4 text-amber-600" />
          <span>Dashboard insights are operating in baseline data mode.</span>
        </div>
        <button onClick={() => refetch()} className="text-amber-700 hover:text-amber-900 font-bold underline flex items-center gap-1">
          <RotateCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  const { headline, summary, key_findings, severity, recommendation } = data.insight;

  const severityVariant = severity === 'high' ? 'danger' : severity === 'medium' ? 'warning' : 'success';

  return (
    <div className="agro-card p-5 bg-gradient-to-br from-white via-[#F6F8EF] to-[#ECF2DC] border-[#5B7B10]/25 shadow-md relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#84CC16]/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#5B7B10] text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-4 h-4 text-[#D9F99D]" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#364E00]">
              AGROBUDDY AI INSIGHT
            </h3>
            <p className="text-[11px] font-semibold text-[#1F2E0A]">{headline}</p>
          </div>
        </div>

        <Badge variant={severityVariant}>
          {severity === 'high' ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
          {severity?.toUpperCase()} SEVERITY
        </Badge>
      </div>

      {/* Summary Body */}
      <p className="text-xs text-[#364E00] leading-relaxed mb-3 font-medium">
        {summary}
      </p>

      {/* Key Findings List */}
      {key_findings && key_findings.length > 0 && (
        <div className="mb-3.5 space-y-1.5 bg-white/70 backdrop-blur-xs p-3 rounded-xl border border-[#5B7B10]/15">
          <p className="text-[11px] font-bold text-[#1F2E0A] uppercase tracking-wider">Key Findings:</p>
          <ul className="space-y-1 text-xs text-[#526633]">
            {key_findings.map((finding, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-[#5B7B10] font-bold">•</span>
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendation Footer */}
      {recommendation && (
        <div className="pt-2 border-t border-[#5B7B10]/15 flex items-center gap-2 text-xs font-semibold text-[#1F2E0A]">
          <span className="px-2 py-0.5 rounded-md bg-[#5B7B10] text-white text-[10px] uppercase tracking-wider">
            Recommendation
          </span>
          <span className="text-[#364E00]">{recommendation}</span>
        </div>
      )}
    </div>
  );
}
