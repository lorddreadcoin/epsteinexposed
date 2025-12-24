import { NextResponse } from 'next/server';

// Default metrics based on the actual document count
const METRICS = {
  documentsProcessed: 11613,
  totalDocuments: 11622,
  entities: 100618,
  people: 96322,
  locations: 4296,
  connections: 200054,
  redactions: 15672,
  anomalies: 127,
  dates: 15202,
  flights: 51,
};

export async function GET() {
  return NextResponse.json({ result: { data: METRICS } });
}
