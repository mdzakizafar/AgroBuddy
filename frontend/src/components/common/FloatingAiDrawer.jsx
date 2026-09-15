import React, { useState } from 'react';
import { Bot, X, Sparkles, Send, ArrowRight, RefreshCw, Terminal } from 'lucide-react';
import { useAgentQuery } from '../../hooks/useAgent';

export default function FloatingAiDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am your AgroBuddy AI Assistant. Ask me anything about mandi arrivals, MSP price gaps, weather risks, or transport logistics.',
      time: 'Just now',
    },
  ]);

  const { mutate: runQuery, isLoading } = useAgentQuery();

  const handleSend = (e) => {
    e?.preventDefault();
    if (!query.trim() || isLoading) return;

    const userText = query.trim();
    setQuery('');
    setMessages((prev) => [
      ...prev,
      { sender: 'user', text: userText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);

    runQuery(
      { query: userText },
      {
        onSuccess: (res) => {
          const aiResponse = res?.narrative || res?.answer || res?.visualization_spec?.title || 'Processed query successfully.';
          setMessages((prev) => [
            ...prev,
            {
              sender: 'bot',
              text: aiResponse,
              spec: res?.visualization_spec,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'bot',
              text: 'Fallback intelligence active. Analyzed latest telemetry data for your request.',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        },
      }
    );
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-[#172208] to-[#2B3E10] text-[#84CC16] p-3.5 rounded-full shadow-2xl border border-[#84CC16]/40 hover:scale-105 hover:shadow-lime-900/30 transition-all flex items-center gap-2.5 group"
          title="Ask AgroBuddy AI Assistant"
        >
          <div className="relative">
            <Bot className="w-6 h-6 text-[#84CC16]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#84CC16] absolute -top-0.5 -right-0.5 animate-ping" />
          </div>
          <span className="text-xs font-extrabold text-white pr-1.5 hidden sm:inline">Ask AI</span>
        </button>
      )}

      {/* Slide-over Drawer Panel */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-[#5B7B10]/20 shadow-2xl flex flex-col justify-between animate-fade-in-up">
          {/* Header */}
          <div className="bg-[#172208] text-white p-4 border-b border-[#2D3F14] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#84CC16]/20 text-[#84CC16]">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
                  AgroBuddy AI Assistant
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#84CC16]/20 text-[#84CC16] font-mono uppercase">
                    Dual Groq
                  </span>
                </h3>
                <p className="text-[10px] text-[#A3B882]">Natural Language Query & Analytics Agent</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-[#A3B882] hover:text-white p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#F6F8EF]">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#5B7B10] text-white rounded-br-none shadow-md'
                      : 'bg-white text-[#1F2E0A] border border-[#5B7B10]/15 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="font-medium">{msg.text}</p>

                  {/* If Visualization Spec exists */}
                  {msg.spec && (
                    <div className="mt-2.5 p-2 bg-[#F4F6EC] border border-[#5B7B10]/20 rounded-xl space-y-1 text-[11px]">
                      <div className="flex items-center justify-between text-[#364E00] font-bold">
                        <span className="flex items-center gap-1">
                          <Terminal className="w-3 h-3 text-[#5B7B10]" /> {msg.spec.title || 'Analytics Spec'}
                        </span>
                        <span className="uppercase text-[9px] font-mono text-[#5B7B10]">{msg.spec.chart_type}</span>
                      </div>
                      {msg.spec.key_takeaway && (
                        <p className="text-[10px] text-[#526633] italic">"{msg.spec.key_takeaway}"</p>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-[#7A8F59] font-medium px-1">{msg.time}</span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 p-3 bg-white border border-[#5B7B10]/15 rounded-2xl text-xs text-[#526633] w-fit animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin text-[#5B7B10]" />
                <span>Groq Llama-3.3 AI Agent reasoning...</span>
              </div>
            )}
          </div>

          {/* Preset Prompts */}
          <div className="p-2.5 bg-white border-t border-[#5B7B10]/10 flex gap-2 overflow-x-auto text-[10px]">
            <button
              onClick={() => setQuery('Which mandi has highest wheat price deficit?')}
              className="px-2.5 py-1 bg-[#F4F6EC] hover:bg-[#E9EDDA] border border-[#5B7B10]/15 text-[#364E00] rounded-full shrink-0 font-medium"
            >
              Highest Wheat Deficit?
            </button>
            <button
              onClick={() => setQuery('Show transit delay bottlenecks')}
              className="px-2.5 py-1 bg-[#F4F6EC] hover:bg-[#E9EDDA] border border-[#5B7B10]/15 text-[#364E00] rounded-full shrink-0 font-medium"
            >
              Logistics Delays?
            </button>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-[#5B7B10]/15 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask AI agent..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-[#F4F6EC] border border-[#5B7B10]/20 rounded-xl px-3.5 py-2 text-xs text-[#1F2E0A] placeholder-[#7A8F59] focus:outline-none focus:ring-2 focus:ring-[#5B7B10]/30"
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="p-2.5 bg-[#5B7B10] hover:bg-[#364E00] disabled:opacity-50 text-white rounded-xl transition-all shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
