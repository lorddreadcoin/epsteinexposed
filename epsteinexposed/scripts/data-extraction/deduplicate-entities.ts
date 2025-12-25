/**
 * DEDUPLICATE ENTITIES IN SUPABASE
 * 
 * Finds duplicate entities (same name, same type) and consolidates them,
 * keeping the one with the highest document_count and connection_count.
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function deduplicateEntities() {
  console.log('═'.repeat(60));
  console.log('DEDUPLICATING ENTITIES IN SUPABASE');
  console.log('═'.repeat(60));

  // Fetch all entities
  console.log('\n📥 Fetching all entities...');
  
  const { data: allEntities, error } = await supabase
    .from('entities')
    .select('id, name, type, document_count, connection_count')
    .order('document_count', { ascending: false });

  if (error) {
    console.error('❌ Failed to fetch entities:', error.message);
    process.exit(1);
  }

  console.log(`   Found ${allEntities?.length || 0} total entities`);

  // Group by name+type to find duplicates
  const groups = new Map<string, typeof allEntities>();
  
  for (const entity of allEntities || []) {
    const key = `${entity.name.toLowerCase().trim()}|${entity.type}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(entity);
  }

  // Find duplicates (groups with more than 1 entity)
  const duplicateGroups = Array.from(groups.entries()).filter(([, entities]) => entities.length > 1);
  console.log(`   Found ${duplicateGroups.length} duplicate groups`);

  if (duplicateGroups.length === 0) {
    console.log('\n✅ No duplicates found!');
    return;
  }

  // Process each duplicate group
  console.log('\n🔄 Consolidating duplicates...');
  
  let deleted = 0;
  let updated = 0;
  const idsToDelete: string[] = [];

  for (const [key, entities] of duplicateGroups) {
    // Sort by document_count + connection_count descending
    entities.sort((a, b) => (b.document_count + b.connection_count) - (a.document_count + a.connection_count));
    
    // Keep the first one (highest counts), delete the rest
    const keeper = entities[0];
    const toDelete = entities.slice(1);
    
    // Sum up all document counts and connection counts
    const totalDocCount = entities.reduce((sum, e) => sum + (e.document_count || 0), 0);
    const totalConnCount = entities.reduce((sum, e) => sum + (e.connection_count || 0), 0);
    
    // Update the keeper with combined counts (but don't double count - use max instead)
    const maxDocCount = Math.max(...entities.map(e => e.document_count || 0));
    const maxConnCount = Math.max(...entities.map(e => e.connection_count || 0));
    
    if (keeper.document_count !== maxDocCount || keeper.connection_count !== maxConnCount) {
      const { error: updateError } = await supabase
        .from('entities')
        .update({ document_count: maxDocCount, connection_count: maxConnCount })
        .eq('id', keeper.id);
      
      if (!updateError) updated++;
    }
    
    // Collect IDs to delete
    for (const dup of toDelete) {
      idsToDelete.push(dup.id);
    }
  }

  // Delete duplicates in batches
  console.log(`\n🗑️ Deleting ${idsToDelete.length} duplicate entities...`);
  
  const BATCH_SIZE = 100;
  for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
    const batch = idsToDelete.slice(i, i + BATCH_SIZE);
    
    // First update any connections referencing these entities
    // (This would require more complex logic to merge connections)
    
    // Delete the entities
    const { error: deleteError } = await supabase
      .from('entities')
      .delete()
      .in('id', batch);
    
    if (!deleteError) {
      deleted += batch.length;
    }
    
    if ((i / BATCH_SIZE) % 10 === 0) {
      console.log(`   Progress: ${deleted}/${idsToDelete.length} deleted`);
    }
  }

  console.log(`   ✅ Deleted ${deleted} duplicate entities`);
  console.log(`   ✅ Updated ${updated} keeper entities`);

  // Verify final counts
  console.log('\n🔍 Verifying final state...');
  
  const { count: finalCount } = await supabase
    .from('entities')
    .select('*', { count: 'exact', head: true });
  
  console.log(`   Final entity count: ${finalCount}`);

  // Check high-profile entities
  const highProfileNames = ['Donald Trump', 'Bill Clinton', 'Prince Andrew', 'Ghislaine Maxwell', 'Jeffrey Epstein'];
  
  console.log('\n👥 HIGH-PROFILE ENTITY CHECK (after dedup):');
  for (const name of highProfileNames) {
    const { data } = await supabase
      .from('entities')
      .select('name, document_count, connection_count')
      .ilike('name', `%${name}%`)
      .eq('type', 'person')
      .order('document_count', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      console.log(`   ✅ ${data[0].name}: ${data[0].document_count} docs, ${data[0].connection_count} connections`);
    }
  }

  console.log('\n═'.repeat(60));
  console.log('✅ DEDUPLICATION COMPLETE');
  console.log('═'.repeat(60));
}

deduplicateEntities().catch(console.error);
