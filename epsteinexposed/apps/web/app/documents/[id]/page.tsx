'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, ExternalLink, FileText, AlertCircle } from 'lucide-react'

interface DocumentData {
  id: string
  title?: string
  name?: string
  pdfUrl?: string
  source?: string
  isRedacted?: boolean
  sourceNotes?: string
  type: string
  entityType?: string
  documentCount?: number
  connectionCount?: number
  content?: string
}

interface ErrorData {
  error: string
  message?: string
  suggestion?: string
}

export default function DocumentViewer() {
  const params = useParams()
  const [doc, setDoc] = useState<DocumentData | null>(null)
  const [error, setError] = useState<ErrorData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDoc() {
      try {
        const res = await fetch(`/api/documents/${params.id}`)
        const data = await res.json()
        
        if (!res.ok) {
          setError(data)
          return
        }
        
        setDoc(data)
      } catch (err) {
        setError({ error: 'Failed to load document', message: String(err) })
      } finally {
        setLoading(false)
      }
    }
    
    if (params.id) {
      loadDoc()
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0f]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-cyan-400 font-mono">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0f]">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-400 mb-2">Document Not Available</h1>
          <p className="text-gray-400 mb-4">{error?.message || 'Document not found'}</p>
          {error?.suggestion && (
            <p className="text-gray-500 text-sm mb-6">{error.suggestion}</p>
          )}
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Investigation
          </Link>
        </div>
      </div>
    )
  }

  // PDF Document
  if (doc.type === 'pdf' && doc.pdfUrl) {
    return (
      <div className="h-screen flex flex-col bg-[#0a0a0f]">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#12121a]">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Back to Investigation"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">{doc.title || doc.name || 'Document'}</h1>
              <div className="flex gap-2 mt-1">
                <span className={`px-2 py-0.5 text-xs rounded ${
                  doc.source === 'unredacted' 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {(doc.source || 'DOJ').toUpperCase()}
                </span>
                {!doc.isRedacted && (
                  <span className="px-2 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    UNREDACTED
                  </span>
                )}
              </div>
              {doc.sourceNotes && (
                <p className="text-xs text-gray-500 mt-1">{doc.sourceNotes}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href={doc.pdfUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </a>
            <a 
              href={doc.pdfUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-5 h-5 text-gray-400" />
            </a>
          </div>
        </div>
        
        {/* PDF Embed */}
        <iframe
          src={doc.pdfUrl}
          className="flex-1 w-full bg-gray-900"
          title={doc.title || 'Document'}
        />
      </div>
    )
  }

  // Entity or other document type
  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Investigation
        </Link>

        <div className="bg-[#12121a] rounded-xl border border-gray-800 p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-cyan-500/20 rounded-lg">
              <FileText className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{doc.name || doc.title || 'Document'}</h1>
              {doc.entityType && (
                <span className="inline-block mt-2 px-3 py-1 text-sm rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  {doc.entityType}
                </span>
              )}
            </div>
          </div>

          {(doc.documentCount !== undefined || doc.connectionCount !== undefined) && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#0a0a0f] rounded-lg p-4 border border-gray-800">
                <p className="text-3xl font-bold text-cyan-400">{doc.documentCount || 0}</p>
                <p className="text-sm text-gray-500">Documents</p>
              </div>
              <div className="bg-[#0a0a0f] rounded-lg p-4 border border-gray-800">
                <p className="text-3xl font-bold text-purple-400">{doc.connectionCount || 0}</p>
                <p className="text-sm text-gray-500">Connections</p>
              </div>
            </div>
          )}

          {doc.content && (
            <div className="bg-[#0a0a0f] rounded-lg p-4 border border-gray-800">
              <p className="text-gray-300 whitespace-pre-wrap">{doc.content}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
