import React from 'react';
import { Bot, User, Sparkles, CheckCircle2 } from 'lucide-react';
import DynamicChart from '../charts/DynamicChart';

export default function AgentResponse({ query, responseData }) {
  if (!responseData) return null;

  const { intent, data, visualization, summary, recommendation } = responseData;

  return (
    <div className="space-y-4 my-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* User Prompt Bubble */}
      <div className="flex justify-end">
        <div className="bg-[#5B7B10] text-white px-4 py-2.5 rounded-2xl rounded-tr-none text-xs font-semibold max-w-lg shadow-md flex items-center gap-2">
          <span>{query}</span>
          <User className="w-4 h-4 text-[#D9F99D]" />
        </div>
      </div>

      {/* AI Bot Response Box */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#84CC16] to-[#364E00] text-white flex items-center justify-center shadow-lg shrink-0">
          <Bot className="w-5 h-5" />
        </div>

        <div className="flex-1 space-y-4 max-w-3xl">
          {/* Natural Language Summary Card */}
          <div className="agro-card p-4 bg-white border-[#5B7B10]/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#5B7B10]">
              <Sparkles className="w-4 h-4 text-[#84CC16]" />
              <span>AGROBUDDY INTELLIGENCE RESPONSE</span>
            </div>
            <p className="text-xs text-[#1F2E0A] leading-relaxed font-medium">
              {summary}
            </p>
          </div>

          {/* Dynamic Visualization */}
          {visualization && data && data.length > 0 && (
            <DynamicChart visualizationSpec={visualization} data={data} />
          )}

          {/* Actionable Recommendation */}
          {recommendation && (
            <div className="agro-card p-3.5 bg-[#F6F8EF] border-[#5B7B10]/20 flex items-start gap-2.5 text-xs text-[#2A3B0F]">
              <CheckCircle2 className="w-4 h-4 text-[#5B7B10] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#1F2E0A]">Action Recommendation: </span>
                <span>{recommendation}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
