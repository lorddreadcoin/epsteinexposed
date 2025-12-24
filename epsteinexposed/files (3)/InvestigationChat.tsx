'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Array<{
    documentId: string;
    documentName: string;
    excerpt?: string;
  }>;
  timestamp: Date;
}

interface InvestigationChatProps {
  selectedEntities: string[];
  onViewDocument: (docId: string, docName: string) => void;
  onHighlightEntity: (entityId: string) => void;
}

export function InvestigationChat({ 
  selectedEntities, 
  onViewDocument,
  onHighlightEntity 
}: InvestigationChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'system',
      content: 'INVESTIGATION TERMINAL READY. Select entities in the graph (CTRL+Click) or ask questions about the documents.',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for analyze connection events
  useEffect(() => {
    const handleAnalyze = (e: CustomEvent) => {
      const entities = e.detail.entities || [];
      if (entities.length >= 2) {
        const query = `What connections exist between ${entities.slice(0, 3).join(', ')}${entities.length > 3 ? ` and ${entities.length - 3} others` : ''}?`;
        sendMessage(query);
      }
    };

    window.addEventListener('analyzeConnection', handleAnalyze as EventListener);
    return () => window.removeEventListener('analyzeConnection', handleAnalyze as EventListener);
  }, []);

  // Suggested query based on selected entities
  const suggestedQuery = selectedEntities.length === 2
    ? `What connects ${selectedEntities[0]} and ${selectedEntities[1]}?`
    : selectedEntities.length === 1
    ? `What do we know about ${selectedEntities[0]}?`
    : null;

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    
    setIsLoading(true);
    setInput('');

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/chat/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          selectedEntities,
          webSearchEnabled,
          conversationHistory: messages.slice(-6),
        }),
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        citations: data.citations,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'ERROR: Failed to process query. Ensure API server is running on port 3001.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="fixed bottom-0 left-0 right-0 h-10 bg-zinc-900 border-t border-zinc-700 
                   flex items-center justify-between px-4 hover:bg-zinc-800 transition-colors z-40"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-zinc-400 font-mono text-xs tracking-wider">
            INVESTIGATION TERMINAL
          </span>
        </div>
        <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    );
  }

  return (
    <div className="flex flex-col bg-zinc-950 border-t border-zinc-800 h-full">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(true)}
        className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 hover:bg-zinc-800 flex-shrink-0"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-zinc-300 font-mono text-sm tracking-wider">
            INVESTIGATION TERMINAL
          </span>
          {selectedEntities.length > 0 && (
            <span className="text-xs text-amber-500 ml-2">
              {selectedEntities.length} entities selected
            </span>
          )}
        </div>
        <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
        {messages.map((msg) => (
          <div key={msg.id} className={msg.role === 'user' ? 'ml-8' : 'mr-8'}>
            <div className={`
              p-3 rounded-lg font-mono text-sm
              ${msg.role === 'user' 
                ? 'bg-blue-900/30 border border-blue-800 text-blue-100' 
                : msg.role === 'system'
                ? 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 text-xs'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-200'}
            `}>
              {msg.role === 'assistant' && (
                <span className="text-green-500 mr-2">&gt;</span>
              )}
              <span className="whitespace-pre-wrap">{msg.content}</span>
            </div>

            {/* Citations */}
            {msg.citations && msg.citations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {msg.citations.map((cite, i) => (
                  <button
                    key={i}
                    onClick={() => onViewDocument(cite.documentId, cite.documentName)}
                    className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 
                               font-mono px-2 py-1 bg-orange-950/20 rounded border border-orange-900/30
                               hover:bg-orange-950/40 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="truncate max-w-[200px]">{cite.documentName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-zinc-500 font-mono text-sm mr-8">
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>ANALYZING DOCUMENTS...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Query */}
      {suggestedQuery && !isLoading && (
        <div className="px-4 py-2 bg-zinc-900/50 border-t border-zinc-800 flex-shrink-0">
          <button
            onClick={() => sendMessage(suggestedQuery)}
            className="text-xs font-mono text-zinc-400 hover:text-zinc-200 
                       px-3 py-1.5 bg-zinc-800 rounded border border-zinc-700
                       hover:border-zinc-600 transition-colors"
          >
            &gt; {suggestedQuery}
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex-shrink-0">
        <div className="flex gap-2 mb-2">
          <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={webSearchEnabled}
              onChange={(e) => setWebSearchEnabled(e.target.checked)}
              className="w-3 h-3 rounded bg-zinc-700 border-zinc-600 accent-amber-500"
            />
            <span>Enable web search (if docs don't have answer)</span>
          </label>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder="Ask about the documents..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 
                       text-zinc-200 font-mono text-sm placeholder:text-zinc-600
                       focus:outline-none focus:border-zinc-500"
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700
                       disabled:cursor-not-allowed rounded text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
