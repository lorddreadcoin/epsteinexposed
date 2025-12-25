import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client with service role (for imports/admin operations)
export function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Type definitions for our database tables
export interface Entity {
  id: string;
  name: string;
  type: 'person' | 'location' | 'organization' | 'date' | 'flight' | 'phone' | 'email' | 'other';
  aliases: string[];
  metadata: Record<string, unknown>;
  document_count: number;
  connection_count: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  doc_id: string;
  title: string | null;
  content: string | null;
  pdf_url: string | null;
  page_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface EntityMention {
  id: string;
  entity_id: string;
  document_id: string;
  page_number: number | null;
  context: string | null;
  confidence: number;
  created_at: string;
}

export interface Connection {
  id: string;
  entity_a_id: string;
  entity_b_id: string;
  connection_type: string;
  strength: number;
  document_ids: string[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Discovery {
  id: string;
  title: string;
  description: string | null;
  discovery_type: 'pattern' | 'anomaly' | 'connection' | 'timeline' | 'redaction';
  severity: 'low' | 'medium' | 'high' | 'critical';
  entity_ids: string[];
  document_ids: string[];
  metadata: Record<string, unknown>;
  created_at: string;
}
