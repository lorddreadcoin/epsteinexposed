'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ALL_SEO_ENTITIES, EntitySEO, generateEntityJsonLd } from '@/lib/seo-entities';

export default function EntityPage() {
  const params = useParams();
  const entityId = params.id as string;
  const [entity, setEntity] = useState<EntitySEO | null>(null);

  useEffect(() => {
    const found = ALL_SEO_ENTITIES.find(e => e.id === entityId);
    setEntity(found || null);
  }, [entityId]);

  if (!entity) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Entity Not Found</h1>
          <Link href="/" className="text-cyan-400 hover:underline">
            Return to Investigation
          </Link>
        </div>
      </div>
    );
  }

  const typeColors: Record<string, string> = {
    person: '#00D4FF',
    organization: '#9333EA',
    location: '#FF6B35',
    event: '#FBBF24'
  };

  const color = typeColors[entity.type] || '#6B7280';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateEntityJsonLd(entity)) }}
      />
      
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        {/* Header */}
        <header className="bg-[#12121a] border-b border-[#ffffff10] px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo.png" alt="Epstein Exposed" width={40} height={40} className="rounded-full" />
              <span className="text-xl font-bold">
                <span className="text-white">EPSTEIN</span>
                <span className="text-[#ff3366]">EXPOSED</span>
              </span>
            </Link>
            <Link 
              href="/"
              className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
            >
              ← Back to Investigation
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-6 py-8">
          {/* Entity Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
              />
              <span className="text-sm font-mono uppercase tracking-wider" style={{ color }}>
                {entity.type}
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400 text-sm">{entity.role}</span>
            </div>
            <h1 className="text-4xl font-bold mb-4">{entity.name}</h1>
            {entity.aliases && entity.aliases.length > 0 && (
              <p className="text-gray-400 text-sm mb-4">
                Also known as: {entity.aliases.join(', ')}
              </p>
            )}
            <p className="text-gray-300 text-lg leading-relaxed max-w-4xl">
              {entity.description}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#12121a] border border-[#ffffff10] rounded-lg p-4">
              <p className="text-gray-400 text-xs font-mono mb-1">DOCUMENTS</p>
              <p className="text-2xl font-bold text-cyan-400">
                {entity.metadata.documentCount?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="bg-[#12121a] border border-[#ffffff10] rounded-lg p-4">
              <p className="text-gray-400 text-xs font-mono mb-1">CONNECTIONS</p>
              <p className="text-2xl font-bold text-purple-400">
                {entity.metadata.connectionCount?.toLocaleString() || '0'}
              </p>
            </div>
            {entity.metadata.flightLogAppearances !== undefined && (
              <div className="bg-[#12121a] border border-[#ffffff10] rounded-lg p-4">
                <p className="text-gray-400 text-xs font-mono mb-1">FLIGHT LOGS</p>
                <p className="text-2xl font-bold text-green-400">
                  {entity.metadata.flightLogAppearances}
                </p>
              </div>
            )}
            {entity.metadata.blackBookEntry !== undefined && (
              <div className="bg-[#12121a] border border-[#ffffff10] rounded-lg p-4">
                <p className="text-gray-400 text-xs font-mono mb-1">BLACK BOOK</p>
                <p className="text-2xl font-bold" style={{ color: entity.metadata.circledInBlackBook ? '#ff3366' : '#10B981' }}>
                  {entity.metadata.blackBookEntry ? (entity.metadata.circledInBlackBook ? 'CIRCLED' : 'YES') : 'NO'}
                </p>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Timeline */}
            {entity.timeline && entity.timeline.length > 0 && (
              <div className="bg-[#12121a] border border-[#ffffff10] rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-yellow-400">⏱</span> Timeline
                </h2>
                <div className="space-y-4">
                  {entity.timeline.map((event, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="text-cyan-400 font-mono text-sm whitespace-nowrap">
                        {event.date}
                      </div>
                      <div className="text-gray-300 text-sm">
                        {event.event}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Connections */}
            {entity.connections && entity.connections.length > 0 && (
              <div className="bg-[#12121a] border border-[#ffffff10] rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-purple-400">🔗</span> Key Connections
                </h2>
                <div className="flex flex-wrap gap-2">
                  {entity.connections.map((conn, i) => {
                    const linkedEntity = ALL_SEO_ENTITIES.find(e => e.name === conn);
                    if (linkedEntity) {
                      return (
                        <Link
                          key={i}
                          href={`/entity/${linkedEntity.id}`}
                          className="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
                        >
                          {conn}
                        </Link>
                      );
                    }
                    return (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-[#ffffff10] text-gray-300 rounded-lg text-sm"
                      >
                        {conn}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sources */}
          {entity.sources && entity.sources.length > 0 && (
            <div className="mt-8 bg-[#12121a] border border-[#ffffff10] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="text-green-400">📄</span> Verified Sources
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {entity.sources.map((source, i) => (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 bg-[#0a0a0f] rounded-lg hover:bg-[#ffffff05] transition-colors group"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {source.type === 'court_document' && <span>⚖️</span>}
                      {source.type === 'news' && <span>📰</span>}
                      {source.type === 'government' && <span>🏛️</span>}
                      {source.type === 'archive' && <span>📁</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white group-hover:text-cyan-400 transition-colors text-sm font-medium truncate">
                        {source.title}
                      </p>
                      <p className="text-gray-500 text-xs truncate">
                        {source.url}
                      </p>
                    </div>
                    <span className="text-gray-500 group-hover:text-cyan-400">→</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Keywords for SEO */}
          <div className="mt-8">
            <h2 className="text-sm font-mono text-gray-500 mb-3">RELATED SEARCHES</h2>
            <div className="flex flex-wrap gap-2">
              {entity.keywords.slice(0, 12).map((kw, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-[#ffffff05] text-gray-400 rounded text-xs"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
            >
              Explore Full Investigation Network →
            </Link>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-[#12121a] border-t border-[#ffffff10] px-6 py-8 mt-12">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-gray-400 text-sm">
              All information sourced from public court documents, government records, and verified news reports.
            </p>
            <p className="text-gray-500 text-xs mt-2">
              © 2024 Epstein Exposed | Transparency in Public Interest
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
