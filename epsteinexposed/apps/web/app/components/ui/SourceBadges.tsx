'use client';

import React from 'react';

interface SourceBadgesProps {
  sources: {
    blackBook: boolean;
    flightLogs: boolean;
    dojDocs: boolean;
  };
  blackBookCircled?: boolean;
  flightCount?: number;
  dojDocCount?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

export function SourceBadges({
  sources,
  blackBookCircled,
  flightCount,
  dojDocCount,
  size = 'md',
  showLabels = false,
}: SourceBadgesProps) {
  const badges: React.ReactNode[] = [];
  
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-0.5',
    md: 'px-2 py-1 text-xs gap-1',
    lg: 'px-3 py-1.5 text-sm gap-1.5',
  };
  
  const baseClasses = sizeClasses[size];
  
  if (sources.blackBook) {
    badges.push(
      <span
        key="blackBook"
        className={`${baseClasses} rounded font-mono flex items-center
          ${blackBookCircled 
            ? 'bg-[#ff3366]/20 text-[#ff3366] border border-[#ff3366]/30' 
            : 'bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/30'
          }`}
        title={blackBookCircled ? "⭐ CIRCLED in Epstein's Black Book (High Importance)" : "Listed in Epstein's Black Book"}
      >
        📓 {blackBookCircled && '⭐'}
        {showLabels && <span className="ml-1">Black Book</span>}
      </span>
    );
  }
  
  if (sources.flightLogs) {
    badges.push(
      <span
        key="flightLogs"
        className={`${baseClasses} rounded font-mono flex items-center bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30`}
        title={`${flightCount || 'Unknown'} flights on Lolita Express`}
      >
        ✈️ {flightCount !== undefined && flightCount > 0 && flightCount}
        {showLabels && <span className="ml-1">{flightCount} Flights</span>}
      </span>
    );
  }
  
  if (sources.dojDocs) {
    badges.push(
      <span
        key="dojDocs"
        className={`${baseClasses} rounded font-mono flex items-center bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30`}
        title={`Mentioned in ${dojDocCount || 'multiple'} DOJ documents`}
      >
        📄 {dojDocCount !== undefined && dojDocCount > 0 && dojDocCount}
        {showLabels && <span className="ml-1">{dojDocCount} DOJ Docs</span>}
      </span>
    );
  }
  
  if (badges.length === 0) {
    return null;
  }
  
  return <div className="flex flex-wrap gap-1">{badges}</div>;
}

// Compact version for use in lists
export function SourceIndicators({
  sources,
  blackBookCircled,
}: {
  sources: { blackBook: boolean; flightLogs: boolean; dojDocs: boolean };
  blackBookCircled?: boolean;
}) {
  return (
    <span className="inline-flex gap-0.5 text-xs">
      {sources.blackBook && (
        <span title={blackBookCircled ? "Circled in Black Book" : "In Black Book"}>
          {blackBookCircled ? '📓⭐' : '📓'}
        </span>
      )}
      {sources.flightLogs && <span title="On Flight Logs">✈️</span>}
      {sources.dojDocs && <span title="In DOJ Documents">📄</span>}
    </span>
  );
}

// Legend component for explaining badges
export function SourceBadgeLegend({ className = '' }: { className?: string }) {
  return (
    <div className={`text-xs text-[#606070] font-mono space-y-1 ${className}`}>
      <div className="font-semibold text-[#a0a0b0] mb-2">DATA SOURCES:</div>
      <div className="flex items-center gap-2">
        <span className="text-[#ffb800]">📓</span>
        <span>Epstein&apos;s Black Book (1,971 contacts)</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[#ff3366]">📓⭐</span>
        <span>CIRCLED in Black Book (high importance)</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[#00d4ff]">✈️</span>
        <span>Lolita Express Flight Logs</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[#00ff88]">📄</span>
        <span>DOJ Document Releases (11,622 files)</span>
      </div>
    </div>
  );
}

export default SourceBadges;
