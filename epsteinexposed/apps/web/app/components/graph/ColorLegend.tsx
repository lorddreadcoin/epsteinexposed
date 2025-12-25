'use client';

const ENTITY_TYPES = [
  { type: 'person', color: '#00D4FF', label: 'People' },
  { type: 'location', color: '#FF6B35', label: 'Locations' },
  { type: 'organization', color: '#7C3AED', label: 'Organizations' },
  { type: 'date', color: '#FBBF24', label: 'Dates' },
  { type: 'flight', color: '#10B981', label: 'Flights' },
];

export function ColorLegend() {
  return (
    <div className="absolute bottom-52 left-4 z-20 bg-[#0a0a0f]/90 backdrop-blur-md border border-[#ffffff15] rounded-lg p-3">
      <div className="text-[10px] text-[#606070] font-mono mb-2 uppercase tracking-wider">Entity Types</div>
      <div className="space-y-1.5">
        {ENTITY_TYPES.map(({ type, color, label }) => (
          <div key={type} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full shadow-lg" 
              style={{ 
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}40`
              }} 
            />
            <span className="text-xs text-gray-300 font-mono">{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-2 border-t border-[#ffffff10]">
        <div className="text-[10px] text-[#606070] font-mono mb-1 uppercase tracking-wider">Connection Strength</div>
        <div className="flex items-center gap-1">
          <div className="h-1 w-8 bg-gradient-to-r from-[#6496FF] to-[#00FFFF] rounded" />
          <span className="text-[10px] text-gray-400">Weak → Strong</span>
        </div>
      </div>
    </div>
  );
}
