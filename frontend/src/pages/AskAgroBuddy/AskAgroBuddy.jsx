import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, RotateCcw, MessageSquare, HelpCircle, ShieldCheck } from 'lucide-react';
import { useAgentQuery } from '../../hooks/useAgent';
import AgentResponse from '../../components/ai/AgentResponse';
import SuggestedQueries from '../../components/ai/SuggestedQueries';

export default function AskAgroBuddy() {
  const [inputQuery, setInputQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const chatEndRef = useRef(null);

  const agentMutation = useAgentQuery();

  const handleSend = (textToSend) => {
    const query = textToSend || inputQuery;
    if (!query || !query.trim()) return;

    setInputQuery('');

    agentMutation.mutate(query, {
      onSuccess: (data) => {
        setChatHistory((prev) => [...prev, { query, response: data }]);
      },
      onError: () => {
        setChatHistory((prev) => [
          ...prev,
          {
            query,
            response: {
              intent: { intent_type: 'offline_fallback' },
              summary: 'AgroBuddy AI is currently operating in offline mode. Please verify the backend connection.',
              recommendation: 'Ensure the backend server is running on http://localhost:8000.',
              visualization: null,
              data: [],
              is_grounded: false,
              data_points_count: 0
            }
          }
        ]);
      }
    });
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, agentMutation.isPending]);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto w-full">
      {/* Header Banner */}
      <div className="agro-card p-4 sm:p-6 bg-gradient-to-r from-[#1C270A] via-[#2A3B0F] to-[#364E00] text-white border-none shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#84CC16] to-[#5B7B10] text-[#1C270A] flex items-center justify-center shadow-lg shadow-lime-950/40 shrink-0">
            <Bot className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h2 className="text-base sm:text-xl font-bold font-['Outfit'] tracking-tight">
                Ask AgroBuddy Intelligence Copilot
              </h2>
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase bg-[#84CC16] text-[#1C270A] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <ShieldCheck className="w-3 h-3" /> GROUNDED DECISION AGENT
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-[#B5C99A] mt-0.5">
              Strictly grounded Mandi-to-Market intelligence querying 57 Mandis across 7 States, modal prices vs MSP, logistics bottlenecks, and 7-day ML forecasts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
          {chatHistory.length > 0 && (
            <>
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="text-xs text-[#D9F99D] hover:text-white flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-2.5 sm:px-3 py-1.5 rounded-xl border border-white/20 transition-all cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showSuggestions ? 'Hide' : 'Inquiries'}</span>
              </button>
              <button
                onClick={() => setChatHistory([])}
                className="text-xs text-[#A3B882] hover:text-white flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-2.5 sm:px-3 py-1.5 rounded-xl border border-white/20 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Suggested Questions (shown initially or when toggled) */}
      {(chatHistory.length === 0 || showSuggestions) && (
        <div className="bg-white/90 backdrop-blur-sm p-3.5 sm:p-4.5 agro-card border-[#5B7B10]/20 shadow-sm transition-all animate-in fade-in duration-200">
          <SuggestedQueries
            onSelectQuery={(q) => {
              handleSend(q);
              if (showSuggestions) setShowSuggestions(false);
            }}
          />
        </div>
      )}

      {/* Chat History List */}
      <div className="space-y-4 min-h-[200px] sm:min-h-[260px]">
        {chatHistory.map((item, idx) => (
          <AgentResponse key={idx} query={item.query} responseData={item.response} />
        ))}

        {agentMutation.isPending && (
          <div className="flex items-center gap-3 p-3.5 sm:p-4 agro-card bg-white animate-pulse border-[#5B7B10]/30 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-[#5B7B10] text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <span className="text-xs font-semibold text-[#5B7B10]">
              AgroBuddy AI is analyzing intent, retrieving verified DuckDB facts & synthesizing grounded decision plan...
            </span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Box Bar */}
      <div className="sticky bottom-2 sm:bottom-4 bg-white/95 backdrop-blur-md agro-card p-2 sm:p-3 flex items-center gap-2 sm:gap-3 shadow-2xl border-[#5B7B10]/30 z-20">
        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-[#5B7B10] shrink-0 ml-1.5 sm:ml-2" />
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask AgroBuddy (e.g. 'Which mandis had wheat below MSP?')..."
          className="flex-1 bg-[#F4F6EC] border border-[#5B7B10]/15 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs text-[#1F2E0A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#5B7B10]/40 transition-all placeholder:text-[#7A8F59] min-w-0"
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputQuery.trim() || agentMutation.isPending}
          className="bg-[#5B7B10] hover:bg-[#364E00] disabled:opacity-40 text-white px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 sm:gap-2 shadow-md transition-all shrink-0 cursor-pointer"
        >
          <span className="hidden xs:inline sm:inline">Ask</span>
          <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );
}
