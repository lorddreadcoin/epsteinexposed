import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';

const INPUT_PATH = path.join(__dirname, '../data/external/black-book.csv');
const OUTPUT_PATH = path.join(__dirname, '../data/entities/black-book-contacts.json');

interface BlackBookContact {
  id: string;
  name: string;
  normalizedName: string;
  phones: string[];
  emails: string[];
  addresses: string[];
  notes: string;
  circled: boolean;
  source: 'black_book';
  pageNumber?: number;
}

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
}

function generateId(name: string): string {
  return `bb_${normalizeText(name).replace(/\s/g, '_')}`;
}

function extractPhones(record: Record<string, string>): string[] {
  const phones: string[] = [];
  const phoneFields = ['phone', 'Phone', 'phone1', 'phone2', 'mobile', 'Mobile', 'cell', 'Cell'];
  for (const field of phoneFields) {
    if (record[field]) phones.push(record[field].trim());
  }
  return phones.filter(Boolean);
}

function extractEmails(record: Record<string, string>): string[] {
  const emails: string[] = [];
  const emailFields = ['email', 'Email', 'email1', 'email2', 'e-mail'];
  for (const field of emailFields) {
    if (record[field] && record[field].includes('@')) {
      emails.push(record[field].trim().toLowerCase());
    }
  }
  return emails.filter(Boolean);
}

function extractAddresses(record: Record<string, string>): string[] {
  const addresses: string[] = [];
  const addressFields = ['address', 'Address', 'address1', 'address2', 'location', 'Location'];
  for (const field of addressFields) {
    if (record[field]) addresses.push(record[field].trim());
  }
  return addresses.filter(Boolean);
}

async function parseBlackBook(): Promise<BlackBookContact[]> {
  console.log('📖 Parsing Epstein Black Book...\n');
  
  let csvContent: string;
  try {
    csvContent = await fs.readFile(INPUT_PATH, 'utf-8');
  } catch (error) {
    console.error(`❌ Could not read ${INPUT_PATH}`);
    console.log('   Run "pnpm fetch:external" first to download the data.');
    process.exit(1);
  }
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];
  
  const contacts: BlackBookContact[] = [];
  
  for (const record of records) {
    const name = record.name || record.Name || record.NAME || record.FullName || '';
    if (!name || name.length < 2) continue;
    
    const contact: BlackBookContact = {
      id: generateId(name),
      name: name,
      normalizedName: normalizeText(name),
      phones: extractPhones(record),
      emails: extractEmails(record),
      addresses: extractAddresses(record),
      notes: record.notes || record.Notes || record.note || '',
      circled: (record.circled || record.Circled || record.important || '').toLowerCase() === 'yes' ||
               (record.circled || record.Circled || record.important || '').toLowerCase() === 'true',
      source: 'black_book',
      pageNumber: parseInt(record.page || record.Page || '0') || undefined,
    };
    
    contacts.push(contact);
  }
  
  const circledCount = contacts.filter(c => c.circled).length;
  
  console.log(`✅ Parsed ${contacts.length} contacts from Black Book`);
  console.log(`   - ${circledCount} marked as "circled" (high importance)`);
  console.log(`   - ${contacts.filter(c => c.phones.length > 0).length} with phone numbers`);
  console.log(`   - ${contacts.filter(c => c.emails.length > 0).length} with email addresses`);
  
  return contacts;
}

async function main() {
  try {
    const contacts = await parseBlackBook();
    
    // Ensure output directory exists
    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    
    // Save contacts
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(contacts, null, 2));
    console.log(`\n💾 Saved to ${OUTPUT_PATH}`);
    
    // Create normalized name lookup for cross-referencing
    const nameLookup: Record<string, string> = {};
    for (const contact of contacts) {
      nameLookup[contact.normalizedName] = contact.id;
    }
    
    const lookupPath = path.join(__dirname, '../data/entities/black-book-lookup.json');
    await fs.writeFile(lookupPath, JSON.stringify(nameLookup, null, 2));
    console.log(`💾 Saved lookup table to ${lookupPath}`);
    
    // Show sample entries
    console.log('\n📋 Sample entries:');
    contacts.slice(0, 5).forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.name}${c.circled ? ' ⭐' : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error parsing Black Book:', error);
    process.exit(1);
  }
}

main();
