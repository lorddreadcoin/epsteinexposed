'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, FileText, ArrowLeft } from 'lucide-react'

interface PdfEntry {
  id: string
  filename: string
  relativePath: string
  size: number
}

interface PdfIndex {
  totalCount: number
  pdfs: PdfEntry[]
}

const FEATURED_DOCS = [
  { id: 'flight-logs', title: 'Epstein Flight Manifests', source: 'DocumentCloud', description: 'Complete flight logs from Epstein\'s private jets' },
  { id: 'giuffre-maxwell', title: 'Giuffre v Maxwell Unsealed', source: 'The Guardian', description: '2024 unsealed court documents' },
  { id: 'maxwell-criminal-complaint', title: 'Maxwell Criminal Complaint', source: 'CourtListener', description: 'Federal criminal complaint against Ghislaine Maxwell' },
]

export default function DocumentsPage() {
  const [pdfIndex, setPdfIndex] = useState<PdfIndex | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/pdf-index.json')
      .then(res => res.json())
      .then(data => {
        setPdfIndex(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filteredPdfs = pdfIndex?.pdfs.filter(pdf => 
    pdf.filename.toLowerCase().includes(search.toLowerCase()) ||
    pdf.id.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 100) || []

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#12121a]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              <span className="text-cyan-400">Document</span> Library
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {pdfIndex?.totalCount?.toLocaleString() || '11,622'} DOJ documents available
            </p>
          </div>
          <Link 
            href="/" 
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Investigation
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Featured Documents */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4 text-gray-300 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Featured Documents
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {FEATURED_DOCS.map(doc => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="p-5 bg-gradient-to-br from-gray-900 to-gray-900/50 rounded-xl border border-gray-800 hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-500/10 group"
              >
                <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                  {doc.title}
                </h3>
                <p className="text-xs text-cyan-500 mt-1">{doc.source}</p>
                <p className="text-sm text-gray-500 mt-2">{doc.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Search */}
        <section className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search 11,622 documents by filename or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-900 border border-gray-700 rounded-xl focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 text-white placeholder-gray-500"
            />
          </div>
        </section>

        {/* Document List */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-gray-300">
            {search ? `Search Results` : 'All Documents'}
            {filteredPdfs.length > 0 && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({filteredPdfs.length}{filteredPdfs.length === 100 ? '+' : ''} shown)
              </span>
            )}
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading document index...</p>
            </div>
          ) : filteredPdfs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {search ? 'No documents match your search.' : 'No documents found.'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredPdfs.map(pdf => (
                <Link
                  key={pdf.id}
                  href={`/documents/${pdf.id}`}
                  className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg hover:bg-gray-900 transition-colors border border-transparent hover:border-gray-700 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 shrink-0" />
                    <span className="text-gray-300 group-hover:text-white truncate">
                      {pdf.filename}
                    </span>
                  </div>
                  <span className="text-xs text-gray-600 shrink-0 ml-4">
                    {(pdf.size / 1024).toFixed(0)} KB
                  </span>
                </Link>
              ))}
              
              {filteredPdfs.length === 100 && (
                <p className="text-center text-gray-500 py-4 text-sm">
                  Showing first 100 results. Refine your search for more specific documents.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
