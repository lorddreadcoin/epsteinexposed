'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, FileText, Users, MapPin, Calendar, Plane, ExternalLink, Sparkles } from 'lucide-react';

interface EntityInfo {
  id: string;
  name: string;
  type: string;
  occurrences: number;
  documentIds: string[];
  context?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  citations?: Array<{
    documentId: string;
    documentName: string;
    excerpt: string;
  }>;
}

interface EntityIntelligencePopupProps {
  entity: EntityInfo | null;
  onClose: () => void;
  onViewDocument?: (documentId: string) => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  person: <Users className="w-5 h-5" />,
  location: <MapPin className="w-5 h-5" />,
  organization: <FileText className="w-5 h-5" />,
  date: <Calendar className="w-5 h-5" />,
  flight: <Plane className="w-5 h-5" />,
};

const TYPE_COLORS: Record<string, string> = {
  person: 'from-amber-500 to-orange-600',
  location: 'from-blue-500 to-cyan-600',
  organization: 'from-purple-500 to-pink-600',
  date: 'from-green-500 to-emerald-600',
  flight: 'from-red-500 to-rose-600',
};

export function EntityIntelligencePopup({ entity, onClose, onViewDocument }: EntityIntelligencePopupProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [entityDetails, setEntityDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (entity) {
      inputRef.current?.focus();
      loadEntityIntelligence();
    }
  }, [entity]);

  // Load comprehensive entity intelligence
  const loadEntityIntelligence = async () => {
    if (!entity) return;
    
    setLoadingDetails(true);
    setMessages([]);
    
    try {
      // Make initial AI analysis request
      const response = await fetch('/api/chat/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Provide a comprehensive intelligence briefing on "${entity.name}". Include: WHO they are (role, background, significance to the Epstein case), WHAT they are accused of or connected to, WHERE they appear in documents, WHEN they were involved, and WHY this matters to the investigation. Be thorough and educational. Cite specific documents.`,
          context: {
            selectedEntities: [entity.name],
            conversationHistory: [],
            useWebSearch: false,
          },
        }),
      });

      const data = await response.json();
      
      // Add the AI briefing as the first message
      setMessages([{
        id: `briefing-${Date.now()}`,
        role: 'assistant',
        content: data.response || 'Unable to generate intelligence briefing.',
        timestamp: new Date(),
        citations: data.citations || [],
      }]);

      setEntityDetails({
        connections: data.connectionsFound || data.citations?.length || entity.occurrences || 50,
        documents: data.documentsSearched || entity.documentIds?.length || data.citations?.length || 11622,
      });

    } catch (err) {
      console.error('Failed to load entity intelligence:', err);
      setMessages([{
        id: `error-${Date.now()}`,
        role: 'system',
        content: 'Failed to load intelligence briefing. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Send follow-up question
  const sendMessage = async () => {
    if (!input.trim() || isLoading || !entity) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add streaming placeholder
    const assistantId = `msg-${Date.now()}-assistant`;
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }]);

    try {
      const response = await fetch('/api/chat/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          context: {
            selectedEntities: [entity.name],
            conversationHistory: messages.slice(-6),
            useWebSearch: input.toLowerCase().includes('search') || input.toLowerCase().includes('web'),
          },
        }),
      });

      const data = await response.json();

      setMessages(prev => prev.map(msg =>
        msg.id === assistantId
          ? {
              ...msg,
              content: data.response || 'No response generated.',
              citations: data.citations || [],
              isStreaming: false,
            }
          : msg
      ));

    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => prev.map(msg =>
        msg.id === assistantId
          ? {
              ...msg,
              content: 'Failed to get response. Please try again.',
              isStreaming: false,
            }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  if (!entity) return null;

  const typeColor = TYPE_COLORS[entity.type] || 'from-gray-500 to-gray-600';
  const typeIcon = TYPE_ICONS[entity.type] || <FileText className="w-5 h-5" />;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-md z-[200] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-4xl h-[85vh] bg-gradient-to-b from-[#0d0d12] to-[#0a0a0f] border border-[#ffffff15] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Entity Card */}
          <div className={`relative overflow-hidden bg-gradient-to-r ${typeColor} p-6`}>
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white">
                  {typeIcon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{entity.name}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="px-2 py-0.5 bg-white/20 rounded text-xs text-white/90 capitalize">
                      {entity.type}
                    </span>
                    <span className="text-white/70 text-sm">
                      {entity.occurrences} mentions • {entity.documentIds?.length || 0} documents
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-black/30 hover:bg-black/50 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats */}
            {entityDetails && (
              <div className="relative flex gap-4 mt-4">
                <div className="px-3 py-1.5 bg-black/30 rounded-lg">
                  <span className="text-white/60 text-xs">Connections</span>
                  <p className="text-white font-bold">{entityDetails.connections}</p>
                </div>
                <div className="px-3 py-1.5 bg-black/30 rounded-lg">
                  <span className="text-white/60 text-xs">Documents Analyzed</span>
                  <p className="text-white font-bold">{entityDetails.documents}</p>
                </div>
              </div>
            )}
          </div>

          {/* AI Intelligence Section */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Intelligence Header */}
            <div className="px-4 py-3 border-b border-[#ffffff10] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-400">AI Intelligence Briefing</span>
              <span className="text-xs text-gray-500 ml-auto">Powered by GPT-4</span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-3" />
                    <p className="text-gray-400">Analyzing intelligence on {entity.name}...</p>
                    <p className="text-gray-600 text-sm mt-1">Searching 11,622 documents</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`${
                      message.role === 'user'
                        ? 'ml-auto max-w-[80%]'
                        : 'max-w-full'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-lg px-4 py-2">
                        <p className="text-cyan-100">{message.content}</p>
                      </div>
                    ) : message.isStreaming ? (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing...</span>
                      </div>
                    ) : (
                      <div className="bg-[#ffffff08] rounded-lg p-4">
                        <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                        
                        {/* Citations */}
                        {message.citations && message.citations.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[#ffffff10]">
                            <p className="text-xs text-gray-500 mb-2">
                              📄 {message.citations.length} Source{message.citations.length > 1 ? 's' : ''}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {message.citations.slice(0, 5).map((citation, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => onViewDocument?.(citation.documentId)}
                                  className="px-2 py-1 bg-[#00d4ff]/10 border border-[#00d4ff]/30 rounded text-xs text-[#00d4ff] hover:bg-[#00d4ff]/20 transition-colors flex items-center gap-1"
                                >
                                  <FileText className="w-3 h-3" />
                                  {citation.documentName.slice(0, 30)}
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions */}
            {!loadingDetails && messages.length > 0 && (
              <div className="px-4 py-2 border-t border-[#ffffff08]">
                <div className="flex flex-wrap gap-2">
                  {[
                    `What documents mention ${entity.name}?`,
                    `Who is connected to ${entity.name}?`,
                    `What locations are associated with ${entity.name}?`,
                    `Search the web for recent news about ${entity.name}`,
                  ].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(q);
                        setTimeout(() => sendMessage(), 100);
                      }}
                      disabled={isLoading}
                      className="px-3 py-1 bg-[#ffffff08] border border-[#ffffff15] rounded-full text-xs text-gray-400 hover:text-white hover:bg-[#ffffff15] transition-colors disabled:opacity-50"
                    >
                      {q.length > 40 ? q.slice(0, 40) + '...' : q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-[#ffffff15]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex items-center gap-3"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask anything about ${entity.name}...`}
                  className="flex-1 bg-[#ffffff08] border border-[#ffffff15] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                  disabled={isLoading || loadingDetails}
                />
                <button
                  type="submit"
                  disabled={isLoading || loadingDetails || !input.trim()}
                  className="p-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
