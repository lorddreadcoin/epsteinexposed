import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import http from 'http';

const DATA_DIR = path.join(__dirname, '../data/external');

interface DownloadConfig {
  url: string;
  filename: string;
  description: string;
}

const SOURCES: DownloadConfig[] = [
  {
    url: 'https://epsteinsblackbook.com/files/black-book.csv',
    filename: 'black-book.csv',
    description: 'Epstein Black Book - 1,971 contacts',
  },
  {
    url: 'https://epsteinsblackbook.com/files/flight-logs.csv',
    filename: 'flight-logs.csv',
    description: 'Lolita Express Flight Manifests',
  },
];

async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const writeStream = fs.open(destPath, 'w').then(fh => {
      const stream = fh.createWriteStream();
      return { fh, stream };
    });
    
    protocol.get(url, async (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          console.log(`   ↪️ Redirecting to: ${redirectUrl}`);
          await downloadFile(redirectUrl, destPath);
          resolve();
          return;
        }
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      const { fh, stream } = await writeStream;
      response.pipe(stream);
      
      stream.on('finish', async () => {
        await fh.close();
        resolve();
      });
      
      stream.on('error', async (err) => {
        await fh.close();
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  console.log('🔥 EPSTEIN DATA ACQUISITION SCRIPT');
  console.log('===================================\n');
  
  await fs.mkdir(DATA_DIR, { recursive: true });
  
  for (const source of SOURCES) {
    const destPath = path.join(DATA_DIR, source.filename);
    
    console.log(`📥 Downloading: ${source.description}`);
    console.log(`   URL: ${source.url}`);
    
    try {
      await downloadFile(source.url, destPath);
      const stats = await fs.stat(destPath);
      console.log(`   ✅ Success! (${(stats.size / 1024).toFixed(1)} KB)\n`);
    } catch (error) {
      console.error(`   ❌ Failed: ${error}`);
      console.log(`   ⚠️  You may need to manually download from ${source.url}\n`);
    }
  }
  
  console.log('📋 Data acquisition complete!');
  console.log(`   Files saved to: ${DATA_DIR}`);
}

main().catch(console.error);
