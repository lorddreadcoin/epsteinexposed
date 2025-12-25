'use client'

import Link from 'next/link'

const UNREDACTED_DOCS = [
  {
    id: 'giuffre-vs-maxwell-943-pages-unredacted',
    title: 'Giuffre vs Maxwell (943 Pages)',
    description: 'Complete court documents from Virginia Giuffre\'s case',
    source: 'Court Filing',
    pages: 943
  },
  {
    id: 'epstein-black-book-full-unredacted',
    title: 'Epstein Black Book (Full)',
    description: 'Complete unredacted address book with all contacts',
    source: 'Public Record',
    pages: 97
  },
  {
    id: 'little-black-book-original',
    title: 'Little Black Book',
    description: 'Original unredacted contact list',
    source: 'Archive.org',
    pages: 73
  },
  {
    id: 'epstein-flight-manifests-gawker',
    title: 'Flight Logs (Complete)',
    description: 'All known flight records from Epstein\'s aircraft',
    source: 'DocumentCloud',
    pages: 221
  }
]

export default function UnredactedBanner() {
  return (
    <div className="bg-gradient-to-r from-red-950/50 to-red-900/30 border border-red-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🔓</span>
        <h2 className="text-xl font-bold text-red-400">UNREDACTED FILES</h2>
        <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded-full">
          PUBLIC RECORDS
        </span>
      </div>
      
      <p className="text-gray-400 text-sm mb-4">
        Community-sourced unredacted documents. These contain names and details 
        not visible in official DOJ releases.
      </p>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
        {UNREDACTED_DOCS.map(doc => (
          <Link
            key={doc.id}
            href={`/documents/${doc.id}`}
            className="block p-3 bg-gray-900/50 rounded border border-red-500/20 hover:border-red-500/50 hover:bg-gray-900 transition-all group"
          >
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-red-300 group-hover:text-red-200 text-sm">
                {doc.title}
              </h3>
              <span className="text-xs text-gray-500">{doc.pages}p</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{doc.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[10px] rounded">
                UNREDACTED
              </span>
              <span className="text-[10px] text-gray-600">{doc.source}</span>
            </div>
          </Link>
        ))}
      </div>
      
      <div className="mt-4 pt-3 border-t border-red-500/20">
        <Link 
          href="/documents?filter=unredacted" 
          className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
        >
          View all unredacted documents →
        </Link>
      </div>
    </div>
  )
}
