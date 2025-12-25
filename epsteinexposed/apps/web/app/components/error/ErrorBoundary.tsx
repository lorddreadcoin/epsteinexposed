'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExternalLink, AlertTriangle, RefreshCw, FileText, Video, Database } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// External resources for fallback
const EXTERNAL_RESOURCES = {
  doj: {
    main: 'https://www.justice.gov/usao-sdny/united-states-v-jeffrey-epstein',
    courtRecords: 'https://www.justice.gov/epstein/court-records',
    maxwell: 'https://www.justice.gov/usao-sdny/united-states-v-ghislaine-maxwell',
    videos: 'https://www.justice.gov/usao-sdny/united-states-v-ghislaine-maxwell#videos',
  },
  archive: {
    main: 'https://www.epsteinarchive.org/',
    blackBook: 'https://www.epsteinarchive.org/docs/black-book-unredacted/',
    maxwellDeposition: 'https://www.epsteinarchive.org/docs/maxwell-deposition-2016/',
    katieJohnson: 'https://www.epsteinarchive.org/docs/katie-johnson-lawsuit/',
    virginiaGiuffre: 'https://www.epsteinarchive.org/docs/Virginia-Giuffre-deposition/',
    johannaSjoberg: 'https://www.epsteinarchive.org/docs/Sjoberg-Johanna-deposition/',
    katieInterview: 'https://www.epsteinarchive.org/docs/katie-johnson-interview-2016/',
    indictment: 'https://www.epsteinarchive.org/docs/federal-indictment/',
    flightLogs: 'https://www.epsteinarchive.org/docs/flight-logs/',
    giuffreMaxwell: 'https://www.epsteinarchive.org/docs/giuffre-v-maxwell-unsealed/',
    fbiPhase1: 'https://www.epsteinarchive.org/docs/fbi-phase1/',
    birthdayBook: 'https://www.epsteinarchive.org/docs/birthday-book/',
    houseEmails: 'https://www.epsteinarchive.org/docs/house-oversight-emails/',
  },
  newFiles: 'https://journaliststudio.google.com/u/1/pinpoint/search?collection=ea371fdea7a785c0',
};

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
          {/* Header */}
          <header className="h-14 bg-[#12121a] border-b border-[#ffffff10] px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold tracking-tight">
                <span className="text-white">EPSTEIN</span>
                <span className="text-[#ff3366]">EXPOSED</span>
              </h1>
            </div>
          </header>

          {/* Error Content */}
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-2xl w-full">
              {/* Error Message */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                  <div>
                    <h2 className="text-xl font-bold text-red-400">Something Went Wrong</h2>
                    <p className="text-sm text-gray-400">We encountered an error loading the platform</p>
                  </div>
                </div>
                <button
                  onClick={this.handleRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>

              {/* External Resources */}
              <div className="bg-[#12121a] border border-[#ffffff15] rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  Continue Your Investigation on Official Sources
                </h3>
                <p className="text-sm text-gray-400 mb-6">
                  While we fix this issue, you can access the same documents on these official government and archive sites:
                </p>

                {/* DOJ Resources */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Department of Justice
                  </h4>
                  <div className="grid gap-2">
                    <a
                      href={EXTERNAL_RESOURCES.doj.courtRecords}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-[#1a1a24] hover:bg-[#252530] rounded-lg transition-colors group"
                    >
                      <span className="text-white">DOJ Court Records</span>
                      <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-cyan-400" />
                    </a>
                    <a
                      href={EXTERNAL_RESOURCES.doj.maxwell}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-[#1a1a24] hover:bg-[#252530] rounded-lg transition-colors group"
                    >
                      <span className="text-white">Ghislaine Maxwell Case Files</span>
                      <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-cyan-400" />
                    </a>
                    <a
                      href={EXTERNAL_RESOURCES.doj.videos}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-[#1a1a24] hover:bg-[#252530] rounded-lg transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-purple-400" />
                        <span className="text-white">Interview Videos</span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-cyan-400" />
                    </a>
                  </div>
                </div>

                {/* Epstein Archive */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Epstein Archive
                  </h4>
                  <div className="grid gap-2">
                    <a
                      href={EXTERNAL_RESOURCES.archive.blackBook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-[#1a1a24] hover:bg-[#252530] rounded-lg transition-colors group"
                    >
                      <span className="text-white">Black Book (Unredacted)</span>
                      <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-amber-400" />
                    </a>
                    <a
                      href={EXTERNAL_RESOURCES.archive.flightLogs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-[#1a1a24] hover:bg-[#252530] rounded-lg transition-colors group"
                    >
                      <span className="text-white">Flight Logs</span>
                      <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-amber-400" />
                    </a>
                    <a
                      href={EXTERNAL_RESOURCES.archive.giuffreMaxwell}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-[#1a1a24] hover:bg-[#252530] rounded-lg transition-colors group"
                    >
                      <span className="text-white">Giuffre v Maxwell (Unsealed)</span>
                      <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-amber-400" />
                    </a>
                    <a
                      href={EXTERNAL_RESOURCES.archive.fbiPhase1}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-[#1a1a24] hover:bg-[#252530] rounded-lg transition-colors group"
                    >
                      <span className="text-white">FBI Investigation Phase 1</span>
                      <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-amber-400" />
                    </a>
                  </div>
                </div>

                {/* New Files */}
                <a
                  href={EXTERNAL_RESOURCES.newFiles}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30 rounded-lg hover:border-purple-400/50 transition-colors group"
                >
                  <div>
                    <span className="text-white font-semibold block">New Epstein Files (14,762 documents)</span>
                    <span className="text-xs text-gray-400">Google Journalist Studio - Full searchable database</span>
                  </div>
                  <ExternalLink className="w-5 h-5 text-purple-400 group-hover:text-purple-300" />
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
