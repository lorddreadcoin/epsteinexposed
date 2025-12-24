import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';

const INPUT_PATH = path.join(__dirname, '../data/external/flight-logs.csv');
const OUTPUT_PATH = path.join(__dirname, '../data/entities/flight-logs.json');

interface Flight {
  id: string;
  date: string;
  dateISO: string | null;
  aircraft: string;
  tailNumber: string;
  origin: string;
  destination: string;
  passengers: FlightPassenger[];
  source: 'flight_logs';
}

interface FlightPassenger {
  name: string;
  normalizedName: string;
}

interface PassengerStats {
  id: string;
  name: string;
  normalizedName: string;
  flightCount: number;
  firstFlight: string;
  lastFlight: string;
  destinations: string[];
  coPassengers: Record<string, number>;
  source: 'flight_logs';
}

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  // Try various date formats
  const formats = [
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,  // MM/DD/YYYY or M/D/YY
    /(\d{4})-(\d{2})-(\d{2})/,          // YYYY-MM-DD
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch {
        // Continue to next format
      }
    }
  }
  
  return null;
}

async function parseFlightLogs(): Promise<{ flights: Flight[]; passengers: PassengerStats[] }> {
  console.log('✈️  Parsing Epstein Flight Logs...\n');
  
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
  
  const flights: Flight[] = [];
  const passengerMap = new Map<string, PassengerStats>();
  
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const date = record.date || record.Date || record.DATE || record.flight_date || '';
    const origin = record.origin || record.Origin || record.from || record.From || record.departure || '';
    const destination = record.destination || record.Destination || record.to || record.To || record.arrival || '';
    
    // Extract passengers from various possible fields
    const passengerNames: string[] = [];
    
    // Check for passengers field (comma or semicolon separated)
    const passengersStr = record.passengers || record.Passengers || record.manifest || '';
    if (passengersStr) {
      passengerNames.push(...passengersStr.split(/[,;]/).map(s => s.trim()).filter(Boolean));
    }
    
    // Check for numbered passenger fields
    for (let j = 1; j <= 20; j++) {
      const pField = record[`passenger${j}`] || record[`Passenger${j}`] || record[`p${j}`];
      if (pField && pField.trim()) passengerNames.push(pField.trim());
    }
    
    // Also check individual name columns
    for (const key of Object.keys(record)) {
      if (key.toLowerCase().includes('passenger') || key.toLowerCase().includes('guest')) {
        if (record[key] && record[key].trim() && !passengerNames.includes(record[key].trim())) {
          passengerNames.push(record[key].trim());
        }
      }
    }
    
    const passengers: FlightPassenger[] = passengerNames
      .filter(name => name.length > 1 && !name.match(/^\d+$/))
      .map(name => ({ name, normalizedName: normalizeText(name) }));
    
    const flight: Flight = {
      id: `flight_${i + 1}`,
      date,
      dateISO: parseDate(date),
      aircraft: record.aircraft || record.Aircraft || record.plane || 'Lolita Express',
      tailNumber: record.tail || record.tail_number || record.registration || 'N908JE',
      origin,
      destination,
      passengers,
      source: 'flight_logs',
    };
    
    flights.push(flight);
    
    // Update passenger statistics
    for (const passenger of passengers) {
      const existing = passengerMap.get(passenger.normalizedName);
      
      if (existing) {
        existing.flightCount++;
        existing.lastFlight = date || existing.lastFlight;
        if (destination && !existing.destinations.includes(destination)) {
          existing.destinations.push(destination);
        }
        // Track co-passengers
        for (const other of passengers) {
          if (other.normalizedName !== passenger.normalizedName) {
            existing.coPassengers[other.normalizedName] = 
              (existing.coPassengers[other.normalizedName] || 0) + 1;
          }
        }
      } else {
        const coPassengers: Record<string, number> = {};
        for (const other of passengers) {
          if (other.normalizedName !== passenger.normalizedName) {
            coPassengers[other.normalizedName] = 1;
          }
        }
        
        passengerMap.set(passenger.normalizedName, {
          id: `fp_${passenger.normalizedName.replace(/\s/g, '_')}`,
          name: passenger.name,
          normalizedName: passenger.normalizedName,
          flightCount: 1,
          firstFlight: date,
          lastFlight: date,
          destinations: destination ? [destination] : [],
          coPassengers,
          source: 'flight_logs',
        });
      }
    }
  }
  
  const passengers = Array.from(passengerMap.values())
    .sort((a, b) => b.flightCount - a.flightCount);
  
  console.log(`✅ Parsed ${flights.length} flights`);
  console.log(`✅ Found ${passengers.length} unique passengers`);
  
  // Show top frequent flyers
  console.log('\n📊 Top 20 Most Frequent Flyers:');
  passengers.slice(0, 20).forEach((p, i) => {
    const topCoPax = Object.entries(p.coPassengers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name.split(' ')[0])
      .join(', ');
    console.log(`   ${String(i + 1).padStart(2)}. ${p.name.padEnd(25)} ${p.flightCount} flights  [flew with: ${topCoPax || 'N/A'}]`);
  });
  
  return { flights, passengers };
}

async function main() {
  try {
    const { flights, passengers } = await parseFlightLogs();
    
    // Ensure output directory exists
    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    
    // Save flights
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(flights, null, 2));
    console.log(`\n💾 Saved flights to ${OUTPUT_PATH}`);
    
    // Save passenger stats
    const passengersPath = path.join(__dirname, '../data/entities/flight-passengers.json');
    await fs.writeFile(passengersPath, JSON.stringify(passengers, null, 2));
    console.log(`💾 Saved passenger stats to ${passengersPath}`);
    
    // Create lookup for cross-referencing
    const lookupPath = path.join(__dirname, '../data/entities/flight-passengers-lookup.json');
    const lookup: Record<string, string> = {};
    for (const p of passengers) {
      lookup[p.normalizedName] = p.id;
    }
    await fs.writeFile(lookupPath, JSON.stringify(lookup, null, 2));
    console.log(`💾 Saved lookup table to ${lookupPath}`);
    
  } catch (error) {
    console.error('❌ Error parsing flight logs:', error);
    process.exit(1);
  }
}

main();
