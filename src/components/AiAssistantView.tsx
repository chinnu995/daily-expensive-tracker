import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  BotMessageSquare,
  User,
  ShieldCheck,
  TrendingDown,
  Wallet,
  Landmark,
} from 'lucide-react';
import { api } from '../lib/api.js';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface AiAssistantViewProps {
  currencySymbol: string;
}

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({ currencySymbol }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      text: `Hello! I'm your SpendWise AI Financial Advisor. Ask me anything about how to manage your budget and costs, how to save more money, analyze your cash in hand vs Bank/UPI balance, or cut down on waste spending.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const suggestedQuestions = [
    { label: '📊 How do I manage budget and cost?', query: 'How do I manage my budget and cost?' },
    { label: '💰 How can I save more money?', query: 'How can I save more money?' },
    { label: '🎯 Tips to control impulsive spending', query: 'What are the top tips to control impulsive spending?' },
    { label: '🔥 How much can I save by cutting waste spend?', query: 'How much could I save by reducing waste spending?' },
    { label: '⚖️ Compare proper vs waste spend', query: 'Compare my proper vs waste spending.' },
    { label: '📅 How much did I spend today?', query: 'How much did I spend today?' },
    { label: '👛 How much is in my wallet?', query: 'How much money is in my wallet?' },
    { label: '🏦 What is my Bank / UPI balance?', query: 'What is my Bank / UPI balance?' },
    { label: '💳 What is my biggest expense?', query: 'What is my biggest single expense?' },
  ];

  const handleSend = async (questionToSend?: string) => {
    const q = questionToSend || inputText;
    if (!q.trim() || isTyping) return;

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: q.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const res = await api.chatAI(userMsg.text);
      const aiMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: `I had trouble accessing your financial records: ${err.message || 'Please try again.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h2 className="font-extrabold text-base">SpendWise AI Financial Advisor</h2>
            <p className="text-xs text-emerald-200">
              Grounded exclusively in verified transaction ledger calculations
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-300 bg-white/10 px-2.5 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Factual & Private</span>
        </div>
      </div>

      {/* Suggested Chips */}
      <div>
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
          Ask SpendWise AI:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(q.query)}
              className="text-xs bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer text-left"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-6 min-h-[380px] max-h-[500px] overflow-y-auto space-y-4">
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div key={m.id} className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser ? 'bg-slate-800 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-tr-xs'
                    : 'bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-xs'
                }`}
              >
                <div className="whitespace-pre-line space-y-1">
                  {m.text.split('\n').map((line, lIdx) => {
                    // Simple inline bold parser for **bold**
                    const parts = line.split(/(\*\*.*?\*\*)/g);
                    return (
                      <p key={lIdx}>
                        {parts.map((part, pIdx) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={pIdx} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
                          }
                          return part;
                        })}
                      </p>
                    );
                  })}
                </div>
                <span
                  className={`text-[9px] block mt-1.5 text-right ${
                    isUser ? 'text-slate-400' : 'text-slate-400'
                  }`}
                >
                  {m.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 text-slate-400 text-xs italic pl-10">
            <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-emerald-600 rounded-full animate-spin" />
            <span>Consulting your ledger records...</span>
          </div>
        )}
      </div>

      {/* Chat Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask a question about your spending, wallet, or savings..."
          className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white focus:outline-hidden focus:border-emerald-500 shadow-2xs"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isTyping}
          className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
