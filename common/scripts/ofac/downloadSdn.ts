/**
 * OFAC SDN List Downloader
 *
 * Downloads the Specially Designated Nationals (SDN) list from the
 * U.S. Treasury's OFAC Sanctions List Service in XML format.
 *
 * Source: https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.XML
 */

import * as fs from 'fs';
import * as path from 'path';

// OFAC SDN XML download URL (official Treasury endpoint)
const OFAC_SDN_XML_URL =
  'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.XML';

// Alternative URLs if primary fails
const OFAC_SDN_ALTERNATE_URLS = [
  'https://www.treasury.gov/ofac/downloads/sdn.xml',
  'https://www.treasury.gov/ofac/downloads/sanctions/1.0/sdn_advanced.xml',
];

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  timestamp: string;
  source: string;
  error?: string;
}

/**
 * Downloads a file with retry logic
 */
async function fetchWithRetry(
  url: string,
  maxRetries: number = 3,
  delayMs: number = 2000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}: Fetching ${url}`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Self-OFAC-Updater/1.0',
          Accept: 'application/xml, text/xml, */*',
        },
      });

      if (response.ok) {
        return response;
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt} failed: ${lastError.message}`);

      if (attempt < maxRetries) {
        console.log(`Waiting ${delayMs}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * Downloads the OFAC SDN XML file from Treasury
 */
export async function downloadOfacSdn(outputDir: string): Promise<DownloadResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(outputDir, `sdn-${timestamp}.xml`);
  const latestPath = path.join(outputDir, 'sdn-latest.xml');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Try primary URL first, then alternates
  const urlsToTry = [OFAC_SDN_XML_URL, ...OFAC_SDN_ALTERNATE_URLS];

  for (const url of urlsToTry) {
    try {
      console.log(`\nDownloading OFAC SDN list from: ${url}`);
      const response = await fetchWithRetry(url);
      const xmlContent = await response.text();

      // Basic validation - check if it looks like valid OFAC XML
      if (
        !xmlContent.includes('<sdnList') &&
        !xmlContent.includes('<sanctionsData') &&
        !xmlContent.includes('<sdnEntry')
      ) {
        throw new Error('Downloaded content does not appear to be valid OFAC SDN XML');
      }

      // Write timestamped file
      fs.writeFileSync(outputPath, xmlContent, 'utf-8');
      console.log(`Saved timestamped file: ${outputPath}`);

      // Also write as latest
      fs.writeFileSync(latestPath, xmlContent, 'utf-8');
      console.log(`Updated latest file: ${latestPath}`);

      const stats = fs.statSync(outputPath);
      console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      return {
        success: true,
        filePath: outputPath,
        timestamp,
        source: url,
      };
    } catch (error) {
      console.error(`Failed to download from ${url}: ${(error as Error).message}`);
      continue;
    }
  }

  return {
    success: false,
    timestamp,
    source: 'none',
    error: 'All download URLs failed',
  };
}

/**
 * Checks if an update is needed by comparing file dates
 */
export async function checkForUpdates(outputDir: string): Promise<boolean> {
  const latestPath = path.join(outputDir, 'sdn-latest.xml');

  if (!fs.existsSync(latestPath)) {
    console.log('No existing SDN file found - update needed');
    return true;
  }

  const stats = fs.statSync(latestPath);
  const fileAge = Date.now() - stats.mtimeMs;
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (fileAge > oneDayMs) {
    console.log(`Existing file is ${(fileAge / oneDayMs).toFixed(1)} days old - update needed`);
    return true;
  }

  console.log(`Existing file is fresh (${(fileAge / 3600000).toFixed(1)} hours old)`);
  return false;
}

// CLI entrypoint
async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outputDir = process.argv[2] || path.join(__dirname, '../../../ofacdata/raw');

  console.log('='.repeat(60));
  console.log('OFAC SDN List Downloader');
  console.log('='.repeat(60));
  console.log(`Output directory: ${outputDir}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');

  const result = await downloadOfacSdn(outputDir);

  if (result.success) {
    console.log('\n✅ Download successful!');
    console.log(`   File: ${result.filePath}`);
    console.log(`   Source: ${result.source}`);
  } else {
    console.error('\n❌ Download failed!');
    console.error(`   Error: ${result.error}`);
    process.exit(1);
  }
}

// Run if executed directly
import { fileURLToPath } from 'url';

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
