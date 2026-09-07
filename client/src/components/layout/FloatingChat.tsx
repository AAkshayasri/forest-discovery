import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import ReactMarkdown from 'react-markdown';
import { 
  MessageSquare, X, Send, Sparkles, 
  User, HelpCircle, Loader2, Minimize2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatMessage {
  id: string;
  userId: string;
  prompt: string;
  answer: string;
  timestamp: string;
}

export const FloatingChat: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chat history when the widget is opened
  useEffect(() => {
    if (isOpen && user) {
      const fetchHistory = async () => {
        try {
          const history = await api.getChatHistory();
          setMessages(history);
        } catch (error) {
          console.error("Failed to load floating chat history:", error);
        }
      };
      fetchHistory();
    }
  }, [isOpen, user]);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userPrompt = input.trim();
    setInput('');
    setLoading(true);

    try {
      const chatRecord = await api.sendChatMessage(userPrompt);
      setMessages((prev) => [...prev, chatRecord]);
    } catch (error) {
      console.error("Floating chat request failed:", error);
      const errRecord: ChatMessage = {
        id: Math.random().toString(),
        userId: user?.uid || 'guest',
        prompt: userPrompt,
        answer: "⚠️ **Connection Error:** Unable to reach the AI server. Please verify your connection.",
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errRecord]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 font-body-md select-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-[90vw] sm:w-[380px] h-[500px] rounded-xl glass-panel bg-surface-container-high/95 border border-outline-variant/60 shadow-2xl overflow-hidden flex flex-col mb-4"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-surface-container-highest border-b border-outline-variant/45 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary-container border border-primary/20 flex items-center justify-center text-primary">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-xs text-on-surface">Atlas Guide Chat</h3>
                  <span className="block text-[9px] text-primary font-semibold uppercase tracking-wider">Online Helper</span>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-white/5 transition-all cursor-pointer"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !loading ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-[280px] mx-auto space-y-3.5 py-6">
                  <HelpCircle className="w-8 h-8 text-outline" />
                  <div>
                    <h4 className="font-bold text-xs text-on-surface">Ask anything about the Atlas!</h4>
                    <p className="text-[10px] text-on-surface-variant mt-1 leading-normal">
                      Ask about animals, forests, and preservation.
                    </p>
                  </div>
                  <div className="grid gap-1.5 w-full pt-1.5 font-label-sm">
                    <button
                      onClick={() => handleQuickPrompt("Tell me about Bengal Tiger.")}
                      className="px-3 py-2 bg-surface-container-low border border-outline-variant/40 hover:border-primary/45 rounded-lg text-left text-[10px] text-on-surface-variant hover:text-primary transition-all cursor-pointer truncate"
                    >
                      🐯 Tell me about Bengal Tiger.
                    </button>
                    <button
                      onClick={() => handleQuickPrompt("What is a Jaguar's habitat?")}
                      className="px-3 py-2 bg-surface-container-low border border-outline-variant/40 hover:border-primary/45 rounded-lg text-left text-[10px] text-on-surface-variant hover:text-primary transition-all cursor-pointer truncate"
                    >
                      🐆 What is a Jaguar's habitat?
                    </button>
                  </div>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div key={msg.id || index} className="space-y-3">
                    {/* User Prompt */}
                    <div className="flex items-start justify-end gap-2.5">
                      <div className="bg-primary-container text-primary rounded-xl px-3 py-2.5 text-xs text-left max-w-[80%] shadow-md border border-primary/20">
                        {msg.prompt}
                      </div>
                      <div className="w-6 h-6 rounded bg-primary-container border border-primary/20 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                        <User className="w-3 h-3" />
                      </div>
                    </div>
                    {/* AI Answer */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded bg-secondary-container border border-secondary/20 flex items-center justify-center text-secondary text-[10px] font-bold shrink-0">
                        <Sparkles className="w-3 h-3" />
                      </div>
                      <div className="bg-[#1c1b1b]/80 border border-outline-variant/30 rounded-xl px-3 py-2.5 text-xs text-on-surface-variant text-left max-w-[80%] shadow-inner leading-relaxed prose prose-invert max-w-none">
                        <ReactMarkdown>{msg.answer}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {loading && (
                <div className="flex items-start gap-2.5 animate-pulse">
                  <div className="w-6 h-6 rounded bg-secondary-container border border-secondary/20 flex items-center justify-center text-secondary text-[10px] font-bold shrink-0">
                    <Sparkles className="w-3 h-3 animate-spin" />
                  </div>
                  <div className="bg-[#1c1b1b]/80 border border-outline-variant/30 rounded-xl px-3 py-2.5 text-xs text-on-surface-variant shadow-inner flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    Searching guides...
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3 bg-surface-container-highest border-t border-outline-variant/45 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 px-3 py-2 text-xs rounded-lg text-on-surface glass-input"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 bg-primary text-on-primary rounded-lg hover:brightness-105 transition-all cursor-pointer disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 rounded-full bg-primary text-on-primary border border-primary/20 flex items-center justify-center shadow-2xl transition-all cursor-pointer hover:brightness-105"
      >
        {isOpen ? (
          <X className="w-6 h-6 animate-in spin-in-90 duration-200" />
        ) : (
          <MessageSquare className="w-6 h-6 animate-in fade-in duration-200" />
        )}
      </motion.button>
    </div>
  );
};

export default FloatingChat;
