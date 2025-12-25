'use client';

import Link from 'next/link';
import Image from 'next/image';
import { HIGH_PROFILE_PEOPLE, KEY_ORGANIZATIONS, KEY_LOCATIONS, EntitySEO } from '@/lib/seo-entities';

function EntityCard({ entity }: { entity: EntitySEO }) {
  const typeColors: Record<string, string> = {
    person: '#00D4FF',
    organization: '#9333EA',
    location: '#FF6B35',
    event: '#FBBF24'
  };

  const color = typeColors[entity.type] || '#6B7280';

  return (
    <Link
      href={`/entity/${entity.id}`}
      className="block bg-[#12121a] border border-[#ffffff10] rounded-lg p-4 hover:border-cyan-500/30 hover:bg-[#ffffff05] transition-all group"
    >
      <div className="flex items-start gap-3">
        <div 
          className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}40` }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold group-hover:text-cyan-400 transition-colors truncate">
            {entity.name}
          </h3>
          <p className="text-gray-400 text-sm mt-1 line-clamp-2">
            {entity.shortDescription}
          </p>
          <div className="flex items-center gap-4 mt-3 text-xs">
            <span className="text-cyan-400">
              {entity.metadata.documentCount?.toLocaleString() || '0'} docs
            </span>
            <span className="text-purple-400">
              {entity.metadata.connectionCount?.toLocaleString() || '0'} links
            </span>
            {entity.metadata.flightLogAppearances !== undefined && entity.metadata.flightLogAppearances > 0 && (
              <span className="text-green-400">
                {entity.metadata.flightLogAppearances} flights
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function EntitiesPage() {
  return (
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
            ← Back to Network
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#12121a] to-[#0a0a0f] px-6 py-12 border-b border-[#ffffff10]">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">Key Figures &amp; Entities</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Explore detailed profiles of individuals, organizations, and locations connected to the Epstein case. 
            All information sourced from court documents, government records, and verified news reports.
          </p>
          <div className="flex justify-center gap-6 mt-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#00D4FF]" />
              <span className="text-gray-300">People</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#9333EA]" />
              <span className="text-gray-300">Organizations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF6B35]" />
              <span className="text-gray-300">Locations</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* High-Profile People */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-4 h-4 rounded-full bg-[#00D4FF]" style={{ boxShadow: '0 0 12px #00D4FF' }} />
            <h2 className="text-2xl font-bold">High-Profile Individuals</h2>
            <span className="text-gray-500 text-sm">({HIGH_PROFILE_PEOPLE.length})</span>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {HIGH_PROFILE_PEOPLE.map(entity => (
              <EntityCard key={entity.id} entity={entity} />
            ))}
          </div>
        </section>

        {/* Organizations */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-4 h-4 rounded-full bg-[#9333EA]" style={{ boxShadow: '0 0 12px #9333EA' }} />
            <h2 className="text-2xl font-bold">Key Organizations</h2>
            <span className="text-gray-500 text-sm">({KEY_ORGANIZATIONS.length})</span>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {KEY_ORGANIZATIONS.map(entity => (
              <EntityCard key={entity.id} entity={entity} />
            ))}
          </div>
        </section>

        {/* Locations */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-4 h-4 rounded-full bg-[#FF6B35]" style={{ boxShadow: '0 0 12px #FF6B35' }} />
            <h2 className="text-2xl font-bold">Key Locations</h2>
            <span className="text-gray-500 text-sm">({KEY_LOCATIONS.length})</span>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {KEY_LOCATIONS.map(entity => (
              <EntityCard key={entity.id} entity={entity} />
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center py-12 border-t border-[#ffffff10]">
          <h3 className="text-xl font-bold mb-4">Explore the Full Network</h3>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            Use our interactive 3D visualization to discover connections between entities across 
            11,622 documents and 1.3 million data points.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            Launch Investigation Network →
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#12121a] border-t border-[#ffffff10] px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="text-white font-semibold mb-3">Document Sources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="https://www.courtlistener.com/docket/4355835/giuffre-v-maxwell/" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400">
                    Court Listener - Giuffre v. Maxwell
                  </a>
                </li>
                <li>
                  <a href="https://vault.fbi.gov/jeffrey-epstein" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400">
                    FBI Vault - Jeffrey Epstein
                  </a>
                </li>
                <li>
                  <a href="https://www.justice.gov/usao-sdny" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400">
                    DOJ - Southern District of NY
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Investigation Reports</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="https://www.miamiherald.com/news/local/article220097825.html" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400">
                    Miami Herald - Perversion of Justice
                  </a>
                </li>
                <li>
                  <a href="https://www.nytimes.com/2019/07/09/nyregion/jeffrey-epstein-indictment.html" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400">
                    NY Times - Indictment Coverage
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Legal Resources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="https://www.documentcloud.org/documents/1507315-epstein-flight-manifests" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400">
                    Flight Manifests (DocumentCloud)
                  </a>
                </li>
                <li>
                  <a href="https://www.justice.gov/opr/page/file/1316066/download" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400">
                    DOJ OPR Report on NPA
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="text-center pt-6 border-t border-[#ffffff10]">
            <p className="text-gray-400 text-sm">
              All information sourced from public court documents, government records, and verified news reports.
            </p>
            <p className="text-gray-500 text-xs mt-2">
              © 2024 Epstein Exposed | Transparency in Public Interest
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
