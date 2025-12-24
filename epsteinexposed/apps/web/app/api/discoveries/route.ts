import { NextResponse } from 'next/server';

// Sample discoveries/anomalies for the dashboard
const DISCOVERIES = [
  {
    id: 'disc-1',
    type: 'connection',
    severity: 'high' as const,
    title: 'High-frequency contact pattern detected',
    description: 'Multiple entities show unusual communication patterns during key dates.',
    entities: ['Jeffrey Epstein', 'Les Wexner'],
    documents: ['doc-1234', 'doc-5678'],
    timestamp: new Date().toISOString(),
  },
  {
    id: 'disc-2',
    type: 'financial',
    severity: 'critical' as const,
    title: 'Financial transfer anomaly',
    description: 'Large transfers between shell companies identified in document batch.',
    entities: ['J. Epstein Foundation', 'Butterfly Trust'],
    documents: ['doc-9012'],
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'disc-3',
    type: 'location',
    severity: 'medium' as const,
    title: 'Location cluster identified',
    description: 'Multiple visits to same location by different entities.',
    entities: ['Little St. James', 'Zorro Ranch'],
    documents: ['doc-3456', 'doc-7890'],
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
];

export async function GET() {
  return NextResponse.json({ result: { data: DISCOVERIES } });
}
