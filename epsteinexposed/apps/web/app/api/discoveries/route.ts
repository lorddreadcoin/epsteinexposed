import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('discoveries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[DISCOVERIES] Error:', error);
      throw error;
    }

    // Format discoveries to match expected structure
    const discoveries = (data || []).map(d => ({
      id: d.id,
      type: d.discovery_type || 'pattern',
      severity: d.severity || 'medium',
      title: d.title,
      description: d.description || '',
      entities: d.entity_ids || [],
      documents: d.document_ids || [],
      timestamp: d.created_at,
    }));

    return NextResponse.json({ result: { data: discoveries } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[DISCOVERIES] API Error:', errorMessage);
    
    // Return empty array on error
    return NextResponse.json({ result: { data: [] } });
  }
}
