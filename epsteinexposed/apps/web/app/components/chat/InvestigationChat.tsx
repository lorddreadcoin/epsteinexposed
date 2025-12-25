'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, FileText, ExternalLink, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';

// Strip markdown formatting from text
function cleanText(text: string): string {
  return text
    .replace(/\*\*/g, '')           // Remove **bold**
    .replace(/\*/g, '')              // Remove *italic*
    .replace(/^#+\s/gm, '')          // Remove # headers
    .replace(/^[-•]\s/gm, '')        // Remove bullet points
    .replace(/^\d+\.\s/gm, '')       // Remove numbered lists
    .replace(/`([^`]+)`/g, '$1')     // Remove inline code
    .trim();
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  suggestions?: string[];
  timestamp: Date;
  isStreaming?: boolean;
}

interface Citation {
  documentId: string;
  documentName: string;
  excerpt: string;
  page?: number;
}

interface Discovery {
  id: string;
  entity1: string;
  entity2: string;
  documentCount: number;
  significance: 'high' | 'medium' | 'low';
  summary: string;
}

interface InvestigationChatProps {
  selectedEntities?: string[];
  onViewDocument: (documentId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  autoInvestigate?: boolean;
  onAutoInvestigateComplete?: () => void;
}

export function InvestigationChat({ 
  selectedEntities = [],
  onViewDocument,
  isCollapsed,
  onToggleCollapse,
  autoInvestigate = false,
  onAutoInvestigateComplete
}: InvestigationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingDiscovery, setPendingDiscovery] = useState<Discovery | null>(null);
  const [hasAutoInvestigated, setHasAutoInvestigated] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Listen for analyzeConnection CustomEvent from Graph3DCore
  useEffect(() => {
    const handleAnalyzeEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ entities: string[] }>;
      const entities = customEvent.detail?.entities || [];
      if (entities.length >= 2) {
        const query = `What connections exist between ${entities.slice(0, 3).join(', ')}${entities.length > 3 ? ` and ${entities.length - 3} others` : ''}?`;
        // Use functional update to avoid stale closure
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: query,
          timestamp: new Date(),
        }]);
        setIsLoading(true);
        
        // Make API call
        fetch('/api/chat/investigate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: query, context: { selectedEntities: entities } }),
        })
          .then(res => res.json())
          .then(data => {
            setMessages(prev => [...prev, {
              id: `msg-${Date.now()}-assistant`,
              role: 'assistant',
              content: data.response,
              citations: data.citations,
              timestamp: new Date(),
            }]);
          })
          .catch(() => {
            setMessages(prev => [...prev, {
              id: `msg-${Date.now()}-error`,
              role: 'assistant',
              content: 'Error: Failed to analyze connection.',
              timestamp: new Date(),
            }]);
          })
          .finally(() => setIsLoading(false));
      }
    };
    
    window.addEventListener('analyzeConnection', handleAnalyzeEvent);
    return () => window.removeEventListener('analyzeConnection', handleAnalyzeEvent);
  }, []);
  
  // Handle entity selection changes - trigger discovery prompt
  useEffect(() => {
    if (selectedEntities.length >= 2) {
      const newDiscovery: Discovery = {
        id: `disc-${Date.now()}`,
        entity1: selectedEntities[0] || '',
        entity2: selectedEntities[1] || '',
        documentCount: 0,
        significance: 'high',
        summary: `Analyze the connection between ${selectedEntities[0]} and ${selectedEntities[1]}?`,
      };
      setPendingDiscovery(newDiscovery);
    } else {
      setPendingDiscovery(null);
    }
  }, [selectedEntities]);
  
  // Auto-investigate when triggered from "Investigate in Chat" button
  useEffect(() => {
    if (autoInvestigate && selectedEntities.length > 0 && !isLoading) {
      const entityKey = selectedEntities.sort().join(',');
      
      // Only auto-investigate if we haven't already for these exact entities
      if (hasAutoInvestigated !== entityKey) {
        setHasAutoInvestigated(entityKey);
        
        // Build a comprehensive investigation query
        const entityName = selectedEntities[0];
        const query = selectedEntities.length === 1
          ? `Provide a comprehensive intelligence briefing on "${entityName}". Who are they? What is their connection to Epstein? What documents mention them? What other entities are they connected to? Summarize all relevant findings from the documents.`
          : `Investigate the connection between ${selectedEntities.join(' and ')}. How are they related? What documents mention them together? What is the nature of their relationship based on the evidence?`;
        
        // Auto-send the investigation
        sendMessage(query, true);
        
        // Notify parent that auto-investigate is complete
        onAutoInvestigateComplete?.();
      }
    }
  }, [autoInvestigate, selectedEntities, isLoading, hasAutoInvestigated, onAutoInvestigateComplete]);
  
  // Send message to Claude API (document-grounded)
  const sendMessage = async (content: string, isDiscoveryQuery = false) => {
    if (!content.trim() && !isDiscoveryQuery) return;
    
    const messageContent = content || `Analyze the connection between ${selectedEntities.join(' and ')}`;
    
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Add streaming placeholder
    const assistantMessageId = `msg-${Date.now()}-assistant`;
    setMessages(prev => [...prev, {
      id: assistantMessageId,
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
          message: messageContent,
          context: {
            selectedEntities,
            conversationHistory: messages.slice(-10),
            useWebSearch: false,
          },
        }),
      });
      
      if (!response.ok) throw new Error('Failed to get response');
      
      const data = await response.json();
      
      // Update the streaming message with final content
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? {
              ...msg,
              content: data.response,
              citations: data.citations,
              suggestions: data.suggestions,
              isStreaming: false,
            }
          : msg
      ));
      
      // If no results found in docs, show system message
      if (data.noDocumentResults) {
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}-system`,
          role: 'system',
          content: 'No relevant information found in the DOJ documents for this query.',
          timestamp: new Date(),
        }]);
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? { ...msg, content: 'Error: Failed to analyze. Please try again.', isStreaming: false }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle discovery acceptance
  const handleAcceptDiscovery = () => {
    if (pendingDiscovery) {
      sendMessage('', true);
      setPendingDiscovery(null);
    }
  };
  
  // Handle discovery skip
  const handleSkipDiscovery = () => {
    setPendingDiscovery(null);
  };
  
  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        sendMessage(input);
      }
    }
  };
  
  // Render message content with citations
  const renderMessageContent = (message: Message) => {
    if (message.isStreaming) {
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#00d4ff]" />
          <span className="text-[#606070] font-mono text-sm">
            Searching 11,622 documents...
          </span>
        </div>
      );
    }
    
    return (
      <div>
        <p className="text-[#e0e0e0] leading-relaxed whitespace-pre-wrap">
          {cleanText(message.content)}
        </p>
        
        {/* Citations - Clean collapsible display */}
        {message.citations && message.citations.length > 0 && (
          <details className="mt-3 pt-2 border-t border-[#ffffff08]">
            <summary className="cursor-pointer text-xs text-[#606070] hover:text-[#808090] transition-colors flex items-center gap-1">
              <FileText className="w-3 h-3" />
              View {message.citations.length} source{message.citations.length > 1 ? 's' : ''}
            </summary>
            <div className="mt-2 space-y-1 pl-2 border-l border-[#ffffff10]">
              {message.citations.map((citation, idx) => (
                <button
                  key={idx}
                  onClick={() => onViewDocument(citation.documentId)}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#ffffff08] 
                           transition-colors group flex items-center gap-2"
                >
                  <span className="text-xs text-[#a0a0a0] group-hover:text-[#00d4ff] truncate">
                    {citation.documentName.replace(/^Entity:\s*/, '')}
                  </span>
                  <ExternalLink className="w-3 h-3 text-[#404050] group-hover:text-[#00d4ff] ml-auto shrink-0" />
                </button>
              ))}
            </div>
          </details>
        )}
        
        {/* Suggestion bubbles - Follow-up questions */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-3 pt-2 border-t border-[#ffffff08]">
            <p className="text-xs text-[#606070] mb-2">Ask about the documents...</p>
            <div className="flex flex-wrap gap-2">
              {message.suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(suggestion)}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-[#00d4ff]/10 border border-[#00d4ff]/30 
                           text-[#00d4ff] text-xs rounded-full hover:bg-[#00d4ff]/20 
                           transition-colors disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div 
      className={`
        bg-[#0a0a0f]/95 backdrop-blur-md border-t border-[#00d4ff30] 
        transition-all duration-300 ease-out flex flex-col
        fixed left-0 right-0 z-50
        ${isCollapsed ? 'h-14 bottom-14' : 'h-[28vh] min-h-[220px] bottom-14'}
      `}
    >
      {/* Header bar */}
      <div 
        className="h-12 px-4 flex items-center justify-between border-b border-[#ffffff10] cursor-pointer hover:bg-[#12121a] shrink-0"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-[#00d4ff]" />
          <span className="font-mono text-sm text-[#a0a0b0]">
            INVESTIGATION ASSISTANT
          </span>
          {messages.length > 0 && (
            <span className="text-xs text-[#606070] font-mono">
              ({messages.length} messages)
            </span>
          )}
        </div>
        <button className="p-1 hover:bg-[#ffffff10] rounded">
          {isCollapsed ? <ChevronUp className="w-4 h-4 text-[#606070]" /> : <ChevronDown className="w-4 h-4 text-[#606070]" />}
        </button>
      </div>
      
      {!isCollapsed && (
        <>
          {/* Discovery prompt */}
          {pendingDiscovery && (
            <div className="mx-4 mt-3 p-3 rounded-lg bg-gradient-to-r from-[#00d4ff]/10 to-[#ffb800]/10 border border-[#00d4ff]/30 shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-[#00d4ff] font-mono mb-1">
                    💡 CONNECTION DETECTED
                  </p>
                  <p className="text-sm text-[#e0e0e0]">
                    Analyze connection between <span className="text-[#00d4ff] font-semibold">{pendingDiscovery.entity1}</span> and{' '}
                    <span className="text-[#ffb800] font-semibold">{pendingDiscovery.entity2}</span>?
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAcceptDiscovery(); }}
                    className="px-3 py-1.5 bg-[#00d4ff] text-black text-sm font-mono rounded hover:bg-[#00d4ff]/80 transition-colors"
                  >
                    Analyze
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSkipDiscovery(); }}
                    className="px-3 py-1.5 bg-[#ffffff10] text-[#a0a0b0] text-sm font-mono rounded hover:bg-[#ffffff20] transition-colors"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
            {messages.length === 0 && !pendingDiscovery && (
              <div className="text-center py-8">
                <p className="text-[#606070] font-mono text-sm">
                  &gt; SELECT ENTITIES IN GRAPH OR ASK A QUESTION
                </p>
                <p className="text-xs text-[#404050] mt-2">
                  CTRL+Click nodes to select • All responses sourced from DOJ documents
                </p>
              </div>
            )}
            
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`${msg.role === 'user' ? 'ml-8' : msg.role === 'system' ? 'mx-4' : 'mr-8'}`}
              >
                <div className={`
                  p-3 rounded-lg text-sm
                  ${msg.role === 'user' 
                    ? 'bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#e0e0e0]' 
                    : msg.role === 'system'
                    ? 'bg-[#ffb800]/10 border border-[#ffb800]/20 text-[#ffb800]'
                    : 'bg-[#1a1a24] border border-[#ffffff08] text-[#e0e0e0]'}
                `}>
                  {msg.role === 'assistant' && !msg.isStreaming && (
                    <span className="text-[#00d4ff] mr-2">&gt;</span>
                  )}
                  {renderMessageContent(msg)}
                </div>
              </div>
            ))}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input area */}
          <div className="p-3 border-t border-[#ffffff10] shrink-0">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about the documents..."
                rows={1}
                className="flex-1 bg-[#1a1a24] border border-[#ffffff15] rounded px-3 py-2 
                         text-[#e0e0e0] font-mono text-sm placeholder:text-[#606070]
                         focus:outline-none focus:border-[#00d4ff]/50 resize-none"
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-[#00d4ff] hover:bg-[#00d4ff]/80 disabled:bg-[#333]
                         disabled:text-[#666] rounded text-black font-mono text-sm transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
