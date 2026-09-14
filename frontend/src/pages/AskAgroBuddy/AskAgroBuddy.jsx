import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, RotateCcw, MessageSquare } from 'lucide-react';
import { useAgentQuery } from '../../hooks/useAgent';
import AgentResponse from '../../components/ai/AgentResponse';
import SuggestedQueries from '../../components/ai/SuggestedQueries';

export default function AskAgroBuddy() {
  const [inputQuery, setInputQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
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
      onError: (err) => {
        setChatHistory((prev) => [
          ...prev,
          {
            query,
            response: {
              summary: 'AgroBuddy AI is currently operating in offline backup mode.',
              recommendation: 'Check backend server or API connection.',
              visualization: null,
              data: []
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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="agro-card p-6 bg-gradient-to-r from-[#1C270A] via-[#2A3B0F] to-[#364E00] text-white border-none shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#84CC16] to-[#5B7B10] text-[#1C270A] flex items-center justify-center shadow-lg shadow-lime-950/40">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-['Outfit'] tracking-tight flex items-center gap-2">
              Ask AgroBuddy AI Workspace
              <span className="text-[10px] font-extrabold uppercase bg-[#84CC16] text-[#1C270A] px-2 py-0.5 rounded-full">
                MODEL #2 • LANGGRAPH
              </span>
            </h2>
            <p className="text-xs text-[#B5C99A] mt-0.5">
              Ask natural-language questions to query semantic Mandi-to-Market analytics & generate dynamic visualizations.
            </p>
          </div>
        </div>

        {chatHistory.length > 0 && (
          <button
            onClick={() => setChatHistory([])}
            className="text-xs text-[#A3B882] hover:text-white flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear History
          </button>
        )}
      </div>

      {/* Suggested Questions */}
      {chatHistory.length === 0 && (
        <SuggestedQueries onSelectQuery={(q) => handleSend(q)} />
      )}

      {/* Chat History List */}
      <div className="space-y-4 min-h-[300px]">
        {chatHistory.map((item, idx) => (
          <AgentResponse key={idx} query={item.query} responseData={item.response} />
        ))}

        {agentMutation.isPending && (
          <div className="flex items-center gap-3 p-4 agro-card bg-white animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-[#5B7B10] text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <span className="text-xs font-semibold text-[#5B7B10]">
              AgroBuddy AI is analyzing intent & building typed visualization plan...
            </span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Box Bar */}
      <div className="sticky bottom-4 bg-white/95 backdrop-blur-md agro-card p-3 flex items-center gap-3 shadow-2xl border-[#5B7B10]/30 z-20">
        <MessageSquare className="w-5 h-5 text-[#5B7B10] shrink-0 ml-2" />
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask AgroBuddy anything (e.g. 'Plot daily arrival trend of Wheat in Amritsar mandi vs MSP')..."
          className="flex-1 bg-[#F4F6EC] border border-[#5B7B10]/15 rounded-xl px-4 py-2.5 text-xs text-[#1F2E0A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#5B7B10]/40 transition-all"
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputQuery.trim() || agentMutation.isPending}
          className="bg-[#5B7B10] hover:bg-[#364E00] disabled:opacity-40 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-all shrink-0 cursor-pointer"
        >
          <span>Ask</span>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
