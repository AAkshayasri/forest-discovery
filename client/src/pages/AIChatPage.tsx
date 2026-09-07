import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import ReactMarkdown from 'react-markdown';
import { 
  Send, MessageSquare, Sparkles, 
  User, HelpCircle, Loader2, Copy, Share2, RotateCcw, Check, GraduationCap,
  MoreVertical, Pencil, Trash2, Plus, X, Download
} from 'lucide-react';
import { useToast } from '../hooks/useToast';

interface ChatMessage {
  id: string;
  userId: string;
  prompt: string;
  answer: string;
  timestamp: string;
  style?: string;
  title?: string;
}

const STYLES = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'student', label: 'Student' },
  { value: 'scientific', label: 'Scientific' },
  { value: 'research', label: 'Research' },
  { value: 'child friendly', label: 'Child Friendly' },
  { value: 'short summary', label: 'Short Summary' },
  { value: 'detailed explanation', label: 'Detailed Explanation' }
];

export const AIChatPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Chat Logs and Active Conversation state
  const [chatLogs, setChatLogs] = useState<ChatMessage[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState('beginner');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Menu & Edit state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  // Delete dialog state
  const [deleteConfirmChat, setDeleteConfirmChat] = useState<ChatMessage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Close 3-dot dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Load chat history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const history = await api.getChatHistory();
        setChatLogs(history || []);
      } catch (error) {
        console.error("Failed to load chat history:", error);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, []);

  // Auto scroll to bottom when active messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages, loading]);

  // Handle pending AI queries from search assistant redirect
  useEffect(() => {
    if (!loadingHistory) {
      const pending = localStorage.getItem('wildatlas_pending_prompt');
      if (pending) {
        localStorage.removeItem('wildatlas_pending_prompt');
        setInput(pending);
        const timer = setTimeout(() => {
          handleSend(undefined, pending);
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [loadingHistory]);

  // Select and load a past chat log
  const handleSelectChat = (chat: ChatMessage) => {
    setSelectedChatId(chat.id);
    setActiveMessages([chat]);
    setOpenMenuId(null);
    setEditingChatId(null);
  };

  // Start a new empty chat conversation
  const handleNewChat = () => {
    setSelectedChatId(null);
    setActiveMessages([]);
    setInput('');
    setOpenMenuId(null);
    setEditingChatId(null);
  };

  // Start editing a chat title
  const handleStartEdit = (chat: ChatMessage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title || chat.prompt);
    setOpenMenuId(null);
  };

  // Save the edited title
  const handleSaveEdit = async (chatId: string, e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const cleanTitle = editingTitle.trim();
    if (!cleanTitle || isSavingTitle) return;

    setIsSavingTitle(true);
    try {
      const updated = await api.updateChatTitle(chatId, cleanTitle);
      const newTitle = updated?.title || cleanTitle;
      
      // Update sidebar logs
      setChatLogs((prev) => 
        prev.map((item) => (item.id === chatId ? { ...item, title: newTitle } : item))
      );

      // Update active message if currently open
      setActiveMessages((prev) => 
        prev.map((item) => (item.id === chatId ? { ...item, title: newTitle } : item))
      );

      setEditingChatId(null);
      showToast("Chat renamed successfully", "success");
    } catch (error) {
      console.error("Failed to rename chat:", error);
      showToast("Failed to save new title", "error");
    } finally {
      setIsSavingTitle(false);
    }
  };

  // Cancel title editing
  const handleCancelEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingChatId(null);
    setEditingTitle('');
  };

  // Open delete confirmation modal
  const handleOpenDeleteDialog = (chat: ChatMessage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteConfirmChat(chat);
    setOpenMenuId(null);
  };

  // Confirm delete of a chat log
  const handleConfirmDelete = async () => {
    if (!deleteConfirmChat || isDeleting) return;

    setIsDeleting(true);
    try {
      await api.deleteChat(deleteConfirmChat.id);
      
      // Immediately remove from list
      setChatLogs((prev) => prev.filter((item) => item.id !== deleteConfirmChat.id));

      // If the deleted chat is currently open, reset to default state
      if (selectedChatId === deleteConfirmChat.id) {
        setSelectedChatId(null);
        setActiveMessages([]);
      }

      showToast("Chat deleted successfully", "info");
      setDeleteConfirmChat(null);
    } catch (error) {
      console.error("Failed to delete chat:", error);
      showToast("Failed to delete chat", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const [streamingText, setStreamingText] = useState<string | null>(null);

  // Export current chat session as Markdown file
  const handleExportFieldNotes = () => {
    if (activeMessages.length === 0) {
      showToast("No messages to export.", "warning");
      return;
    }
    const header = `# WildAtlas AI Wildlife Field Notes\n*Session Generated: ${new Date().toLocaleString()}*\n*Educational Persona: ${selectedStyle.toUpperCase()}*\n\n---\n\n`;
    const body = activeMessages.map((m, idx) => (
      `### Observation ${idx + 1}: ${m.prompt}\n*Timestamp: ${new Date(m.timestamp).toLocaleString()}*\n\n${m.answer}\n\n---\n`
    )).join('\n');

    const blob = new Blob([header + body], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wildatlas-field-notes-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Field notes exported as Markdown.", "success");
  };

  // Send message to Gemini AI with SSE typewriter streaming
  const handleSend = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    
    const userPrompt = customPrompt ? customPrompt.trim() : input.trim();
    if (!userPrompt || loading) return;

    if (!customPrompt) setInput('');
    setLoading(true);
    setStreamingText('');

    // Build context history for live memory
    const historyContext = activeMessages.map(m => ({
      prompt: m.prompt,
      answer: m.answer
    }));

    try {
      const token = localStorage.getItem('wildatlas_token');
      const response = await fetch('/api/user/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          prompt: userPrompt,
          style: selectedStyle,
          history: historyContext
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedAnswer = '';
      let serverChatRecord: ChatMessage | null = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.substring(6));
                if (parsed.chunk) {
                  accumulatedAnswer += parsed.chunk;
                  setStreamingText(accumulatedAnswer);
                }
                if (parsed.done && parsed.chat) {
                  serverChatRecord = parsed.chat;
                }
              } catch {
                // Ignore parse errors on partial chunks
              }
            }
          }
        }
      }

      const finalRecord: ChatMessage = serverChatRecord || {
        id: Math.random().toString(),
        userId: user?.uid || 'guest',
        prompt: userPrompt,
        answer: accumulatedAnswer || "No answer generated.",
        timestamp: new Date().toISOString(),
        title: userPrompt
      };

      setActiveMessages((prev) => [...prev, finalRecord]);
      setSelectedChatId(finalRecord.id);
      setChatLogs((prev) => [finalRecord, ...prev.filter(c => c.id !== finalRecord.id)]);
      setStreamingText(null);
    } catch (error) {
      console.error("Chat request failed, trying fallback:", error);
      try {
        const chatRecord = await api.sendChatMessage(userPrompt, selectedStyle, historyContext);
        const enrichedRecord: ChatMessage = {
          ...chatRecord,
          title: chatRecord.title || userPrompt
        };
        setActiveMessages((prev) => [...prev, enrichedRecord]);
        setSelectedChatId(enrichedRecord.id);
        setChatLogs((prev) => [enrichedRecord, ...prev.filter(c => c.id !== enrichedRecord.id)]);
      } catch (fallbackErr) {
        const errRecord: ChatMessage = {
          id: Math.random().toString(),
          userId: user?.uid || 'guest',
          prompt: userPrompt,
          answer: "⚠️ **API Connection Error:** Unable to reach the WildAtlas AI server. Please verify your connection.",
          timestamp: new Date().toISOString(),
          title: userPrompt
        };
        setActiveMessages((prev) => [...prev, errRecord]);
      }
    } finally {
      setLoading(false);
      setStreamingText(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast("Copied response to clipboard", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = (text: string) => {
    const shareText = `Check out this wildlife insight from Wildlife Explorer:\n\n${text}`;
    navigator.clipboard.writeText(shareText);
    showToast("Shareable link copied to clipboard!", "info");
  };

  const handleRetry = (prompt: string) => {
    handleSend(undefined, prompt);
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const selectedLog = chatLogs.find(c => c.id === selectedChatId);

  return (
    <div className="min-h-screen bg-background flex pt-24 pb-6 px-4 md:px-6 select-none overflow-hidden font-body-md relative">
      
      {/* Background radial highlight */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary blur-[180px]" />
      </div>

      <div className="max-w-5xl mx-auto w-full flex flex-col md:flex-row gap-6 relative z-10">
        
        {/* Sidebar: Past conversations list */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-4" ref={menuContainerRef}>
          <div className="glass-panel rounded-xl p-4 flex flex-col h-48 md:h-[calc(100vh-170px)] bg-surface-container-high/95 border border-outline-variant/65">
            
            {/* Sidebar Header & New Chat button */}
            <div className="flex items-center justify-between border-b border-outline-variant/45 pb-2 mb-3">
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5 font-label-sm">
                <MessageSquare className="w-4 h-4 text-primary" />
                Chat Logs
              </h3>
              <button
                onClick={handleNewChat}
                className="p-1 rounded-md text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                title="Start a new chat"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New</span>
              </button>
            </div>
            
            {/* Chat Logs List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : chatLogs.length > 0 ? (
                chatLogs.map((msg) => {
                  const isSelected = selectedChatId === msg.id;
                  const isEditing = editingChatId === msg.id;
                  const isMenuOpen = openMenuId === msg.id;

                  if (isEditing) {
                    return (
                      <form
                        key={msg.id}
                        onSubmit={(e) => handleSaveEdit(msg.id, e)}
                        className="p-1.5 rounded-lg bg-surface-container-highest border border-primary/50 flex items-center gap-1 shadow-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          autoFocus
                          className="flex-1 bg-surface-container-low border border-outline-variant/40 rounded px-2 py-1 text-xs text-on-surface focus:outline-none focus:border-primary"
                          placeholder="Chat title..."
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <button
                          type="submit"
                          disabled={!editingTitle.trim() || isSavingTitle}
                          className="p-1 text-primary hover:bg-primary/20 rounded cursor-pointer disabled:opacity-40"
                          title="Save title"
                        >
                          {isSavingTitle ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="p-1 text-on-surface-variant hover:text-on-surface rounded cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`group relative flex items-center justify-between rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-primary/15 border-primary/60 text-primary shadow-sm'
                          : 'bg-surface-container border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-primary/40 hover:bg-surface-container-high'
                      }`}
                    >
                      <button
                        onClick={() => handleSelectChat(msg)}
                        className="flex-1 text-left px-3 py-2 text-xs truncate cursor-pointer font-label-sm"
                        title={msg.title || msg.prompt}
                      >
                        {msg.title || msg.prompt}
                      </button>

                      {/* Three-dot options menu button */}
                      <div className="relative shrink-0 pr-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(isMenuOpen ? null : msg.id);
                          }}
                          className={`p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-opacity cursor-pointer ${
                            isSelected || isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                          title="Chat options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {/* Three-dot dropdown menu */}
                        {isMenuOpen && (
                          <div 
                            className="absolute right-0 top-7 z-30 w-32 bg-surface-container-highest border border-outline-variant/60 rounded-lg shadow-2xl py-1 text-left backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => handleStartEdit(msg, e)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={(e) => handleOpenDeleteDialog(msg, e)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-[11px] text-on-surface-variant text-center py-10 italic">
                  No active logs. Start chatting below!
                </div>
              )}
            </div>

            {/* Educational Mode Selector */}
            <div className="border-t border-outline-variant/45 pt-4 mt-3 text-left">
              <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-primary" />
                Educational Mode
              </span>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full text-xs bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-on-surface cursor-pointer focus:outline-none focus:border-primary"
              >
                {STYLES.map(style => (
                  <option key={style.value} value={style.value}>{style.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Chat box container */}
        <div className="flex-1 flex flex-col glass-panel rounded-xl overflow-hidden shadow-2xl h-[550px] md:h-[calc(100vh-170px)] border border-outline-variant/65 relative bg-surface-container-high/95">
          
          {/* Header Banner */}
          <div className="px-6 py-4 bg-surface-container-highest border-b border-outline-variant/45 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-container border border-primary/20 flex items-center justify-center text-primary">
                <Sparkles className="w-4.5 h-4.5 animate-pulse" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-on-surface font-headline-md">
                    Atlas AI Guide
                  </h3>
                  {selectedLog && (
                    <span className="text-[11px] text-primary/80 font-normal truncate max-w-[200px] sm:max-w-xs block">
                      • {selectedLog.title || selectedLog.prompt}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-on-surface-variant font-medium">
                  Active Mode: {STYLES.find(s => s.value === selectedStyle)?.label}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {activeMessages.length > 0 && (
                <button
                  onClick={handleExportFieldNotes}
                  className="px-2.5 py-1 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-label-sm border border-outline-variant/30"
                  title="Export session as Markdown notes"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export Notes</span>
                </button>
              )}
              {selectedLog && (
                <>
                  <button
                    onClick={(e) => handleStartEdit(selectedLog, e)}
                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
                    title="Rename this chat"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleOpenDeleteDialog(selectedLog, e)}
                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Delete this chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeMessages.length === 0 && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4">
                <HelpCircle className="w-10 h-10 text-outline" />
                <div>
                  <h4 className="font-bold text-sm text-on-surface font-headline-md">Ask anything about Forestry and Wildlife!</h4>
                  <p className="text-xs text-on-surface-variant mt-1 leading-normal font-body-md">
                    Explore coordinates, conservation statuses, habitats, diets, and behaviors.
                  </p>
                </div>
              </div>
            )}

            {/* Render conversation messages */}
            {activeMessages.map((msg, index) => (
              <div key={msg.id || index} className="space-y-4 font-body-md">
                
                {/* User Prompt */}
                <div className="flex items-start justify-end gap-3">
                  <div className="flex flex-col items-end max-w-[80%]">
                    <div className="bg-primary-container text-primary rounded-xl px-4 py-2.5 text-xs text-left shadow-md border border-primary/20">
                      {msg.prompt}
                    </div>
                    <span className="text-[9px] text-on-surface-variant mt-1">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className="w-7 h-7 rounded bg-primary-container border border-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* AI Response */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded bg-secondary-container border border-secondary/20 flex items-center justify-center text-secondary text-xs font-bold shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col max-w-[80%] items-start text-left group/msg">
                    <div className="bg-[#1c1b1b]/80 border border-outline-variant/30 rounded-xl px-4 py-2.5 text-xs text-on-surface-variant shadow-inner leading-relaxed prose prose-invert max-w-none">
                      <ReactMarkdown>{msg.answer}</ReactMarkdown>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[9px] text-on-surface-variant mr-2">{formatTime(msg.timestamp)}</span>
                      <button 
                        onClick={() => handleCopy(msg.answer, msg.id)}
                        className="p-1 rounded bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                        title="Copy Response"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button 
                        onClick={() => handleShare(msg.answer)}
                        className="p-1 rounded bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                        title="Share Response"
                      >
                        <Share2 className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => handleRetry(msg.prompt)}
                        className="p-1 rounded bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                        title="Retry Response"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            ))}

            {/* Live Streaming Typewriter bubble */}
            {streamingText !== null && (
              <div className="flex items-start gap-3 animate-in fade-in">
                <div className="w-7 h-7 rounded bg-secondary-container border border-secondary/20 flex items-center justify-center text-secondary text-xs font-bold shrink-0 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col max-w-[80%] items-start text-left">
                  <div className="bg-[#1c1b1b]/80 border border-primary/40 rounded-xl px-4 py-2.5 text-xs text-on-surface-variant shadow-inner leading-relaxed prose prose-invert max-w-none">
                    <ReactMarkdown>{streamingText || '...'}</ReactMarkdown>
                  </div>
                  <span className="text-[9px] text-primary/80 font-mono mt-1 animate-pulse">Streaming bio-intelligence from Gemini...</span>
                </div>
              </div>
            )}

            {/* AI thinking state (if streaming not started yet) */}
            {loading && streamingText === null && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded bg-secondary-container border border-secondary/20 flex items-center justify-center text-secondary text-xs font-bold shrink-0 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="bg-[#1c1b1b]/80 border border-outline-variant/30 rounded-xl px-4 py-3 text-xs text-on-surface-variant shadow-inner flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  Consulting atlas bio-intelligence...
                </div>
              </div>
            )}
            
            <div ref={scrollRef} />
          </div>

          {/* Form input bar */}
          <form onSubmit={(e) => handleSend(e)} className="p-4 bg-surface-container-highest border-t border-outline-variant/45 flex gap-2 items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Bengal Tiger, Sasan Gir, Amazon Rainforest..."
              className="flex-1 px-4 py-3 text-xs rounded-lg text-on-surface glass-input focus:outline-none focus:border-primary"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-3 bg-primary text-on-primary rounded-lg transition-all cursor-pointer disabled:opacity-40 hover:brightness-105"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmChat && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-surface-container-high border border-outline-variant/70 rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-on-surface font-headline-md">Delete Chat</h4>
                <p className="text-[11px] text-on-surface-variant font-body-md">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/30 italic truncate">
              "{deleteConfirmChat.title || deleteConfirmChat.prompt}"
            </p>

            <p className="text-xs text-on-surface font-medium leading-relaxed">
              Are you sure you want to delete this chat?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setDeleteConfirmChat(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs rounded-lg bg-red-600/90 hover:bg-red-600 text-white font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AIChatPage;
