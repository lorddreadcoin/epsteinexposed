/**
 * Step 5: Verify Data Integrity
 * 
 * Validates extracted data and generates statistics report.
 * Ensures all entities have proper links back to Journalist Studio.
 */

import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const ENTITIES_DIR = './data/entities';
const REPORT_FILE = './data/extraction-report.json';

async function main() {
  console.log('='.repeat(60));
  console.log('EPSTEIN FILES - DATA VERIFICATION');
  console.log('='.repeat(60));

  const report = {
    generatedAt: new Date().toISOString(),
    localData: {
      documentCount: 0,
      entityFiles: 0,
      totalPeople: 0,
      totalLocations: 0,
      totalOrganizations: 0,
      totalConnections: 0,
      topPeople: [] as { name: string; documentCount: number }[],
      topLocations: [] as { name: string; documentCount: number }[],
    },
    supabaseData: {
      entities: 0,
      connections: 0,
      documents: 0,
    },
    dataIntegrity: {
      allEntitiesHaveSourceLinks: true,
      missingSourceLinks: [] as string[],
    },
  };

  // Check local entity files
  console.log('\n📊 Checking local extracted data...');
  
  try {
    const entityFiles = (await fs.readdir(ENTITIES_DIR)).filter((f: string) => f.endsWith('.json'));
    report.localData.entityFiles = entityFiles.length;
    
    const peopleMap = new Map<string, number>();
    const locationMap = new Map<string, number>();
    
    for (const file of entityFiles) {
      const data = JSON.parse(await fs.readFile(path.join(ENTITIES_DIR, file), 'utf-8'));
      
      // Check source links
      if (!data.sourceUrl && !data.journalistStudioUrl) {
        report.dataIntegrity.allEntitiesHaveSourceLinks = false;
        report.dataIntegrity.missingSourceLinks.push(data.documentId);
      }
      
      // Count entities
      for (const person of data.entities?.people || []) {
        const key = person.name.toLowerCase().trim();
        peopleMap.set(key, (peopleMap.get(key) || 0) + 1);
        report.localData.totalPeople++;
      }
      
      for (const location of data.entities?.locations || []) {
        const key = location.name.toLowerCase().trim();
        locationMap.set(key, (locationMap.get(key) || 0) + 1);
        report.localData.totalLocations++;
      }
      
      report.localData.totalOrganizations += data.entities?.organizations?.length || 0;
      report.localData.totalConnections += data.connections?.length || 0;
    }
    
    // Get top people and locations
    report.localData.topPeople = [...peopleMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, documentCount: count }));
    
    report.localData.topLocations = [...locationMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, documentCount: count }));
      
  } catch (error) {
    console.error('❌ Error reading local data:', error);
  }

  // Check Supabase data
  if (SUPABASE_URL && SUPABASE_KEY) {
    console.log('\n📊 Checking Supabase data...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    try {
      const { count: entityCount } = await supabase
        .from('entities')
        .select('*', { count: 'exact', head: true });
      report.supabaseData.entities = entityCount || 0;
      
      const { count: connCount } = await supabase
        .from('connections')
        .select('*', { count: 'exact', head: true });
      report.supabaseData.connections = connCount || 0;
      
      const { count: docCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true });
      report.supabaseData.documents = docCount || 0;
      
    } catch (error) {
      console.error('❌ Error checking Supabase:', error);
    }
  }

  // Save report
  await fs.writeFile(REPORT_FILE, JSON.stringify(report, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION REPORT');
  console.log('='.repeat(60));
  
  console.log('\n📁 LOCAL EXTRACTED DATA:');
  console.log(`   Entity files: ${report.localData.entityFiles}`);
  console.log(`   Total people mentions: ${report.localData.totalPeople}`);
  console.log(`   Total location mentions: ${report.localData.totalLocations}`);
  console.log(`   Total organization mentions: ${report.localData.totalOrganizations}`);
  console.log(`   Total connections: ${report.localData.totalConnections}`);
  
  console.log('\n👥 TOP 10 PEOPLE BY DOCUMENT COUNT:');
  report.localData.topPeople.slice(0, 10).forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name}: ${p.documentCount} documents`);
  });
  
  console.log('\n📍 TOP 10 LOCATIONS BY DOCUMENT COUNT:');
  report.localData.topLocations.slice(0, 10).forEach((l, i) => {
    console.log(`   ${i + 1}. ${l.name}: ${l.documentCount} documents`);
  });
  
  console.log('\n☁️ SUPABASE DATA:');
  console.log(`   Entities: ${report.supabaseData.entities}`);
  console.log(`   Connections: ${report.supabaseData.connections}`);
  console.log(`   Documents: ${report.supabaseData.documents}`);
  
  console.log('\n✅ DATA INTEGRITY:');
  console.log(`   All entities have source links: ${report.dataIntegrity.allEntitiesHaveSourceLinks ? '✅ YES' : '❌ NO'}`);
  if (report.dataIntegrity.missingSourceLinks.length > 0) {
    console.log(`   Missing source links: ${report.dataIntegrity.missingSourceLinks.length} documents`);
  }
  
  console.log(`\n📄 Full report saved to: ${REPORT_FILE}`);
}

main().catch(console.error);
