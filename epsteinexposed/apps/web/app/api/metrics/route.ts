import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get counts from Supabase tables
    const [entitiesResult, documentsResult, connectionsResult, discoveriesResult] = await Promise.all([
      supabase.from('entities').select('id', { count: 'exact', head: true }),
      supabase.from('documents').select('id', { count: 'exact', head: true }),
      supabase.from('connections').select('id', { count: 'exact', head: true }),
      supabase.from('discoveries').select('id', { count: 'exact', head: true }),
    ]);

    // Get entity type breakdowns
    const [peopleResult, locationsResult] = await Promise.all([
      supabase.from('entities').select('id', { count: 'exact', head: true }).eq('type', 'person'),
      supabase.from('entities').select('id', { count: 'exact', head: true }).eq('type', 'location'),
    ]);

    const metrics = {
      documentsProcessed: documentsResult.count || 0,
      totalDocuments: documentsResult.count || 0,
      entities: entitiesResult.count || 0,
      people: peopleResult.count || 0,
      locations: locationsResult.count || 0,
      connections: connectionsResult.count || 0,
      redactions: 0, // Can be calculated from metadata if needed
      anomalies: discoveriesResult.count || 0,
      activeAgents: 6,
      dates: 0, // Can be calculated if date entities are tracked
      flights: 0, // Can be calculated if flight entities are tracked
    };

    return NextResponse.json({ result: { data: metrics } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[METRICS] API Error:', errorMessage);
    
    // Return default metrics on error
    return NextResponse.json({ 
      result: { 
        data: {
          documentsProcessed: 0,
          totalDocuments: 0,
          entities: 0,
          people: 0,
          locations: 0,
          connections: 0,
          redactions: 0,
          anomalies: 0,
          activeAgents: 6,
          dates: 0,
          flights: 0,
        }
      } 
    });
  }
}
