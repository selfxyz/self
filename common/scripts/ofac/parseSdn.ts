/**
 * OFAC SDN XML Parser
 *
 * Parses the SDN XML file and extracts sanctioned individual data
 * in the format required for building OFAC Merkle trees.
 *
 * Output format matches the existing names.json structure used by buildSMT()
 */

import * as fs from 'fs';
import * as path from 'path';

// Types for parsed OFAC data
export interface OfacEntry {
  First_Name: string;
  Last_Name: string;
  day: string | null;
  month: string | null;
  year: string | null;
  Pass_No?: string;
  Pass_Country?: string;
}

export interface ParseResult {
  success: boolean;
  entries: OfacEntry[];
  stats: {
    totalEntries: number;
    individualsProcessed: number;
    entriesWithDob: number;
    entriesWithPassport: number;
    parseTime: number;
  };
  error?: string;
}

// Month name to number mapping
const MONTH_MAP: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
};

/**
 * Parse a date string in various formats
 * Returns { day, month, year } or null values if parsing fails
 */
function parseDate(dateStr: string): { day: string | null; month: string | null; year: string | null } {
  if (!dateStr) {
    return { day: null, month: null, year: null };
  }

  const trimmed = dateStr.trim();

  // Format: DD Mon YYYY (e.g., "07 Oct 1954")
  const dmyMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (dmyMatch) {
    const monthLower = dmyMatch[2].toLowerCase();
    const monthNum = MONTH_MAP[monthLower];
    if (monthNum) {
      return {
        day: dmyMatch[1].padStart(2, '0'),
        month: monthLower.slice(0, 3), // Use 3-letter abbreviation
        year: dmyMatch[3],
      };
    }
  }

  // Format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIndex = parseInt(isoMatch[2], 10) - 1;
    return {
      day: isoMatch[3],
      month: monthNames[monthIndex] || null,
      year: isoMatch[1],
    };
  }

  // Format: YYYY (year only)
  const yearOnlyMatch = trimmed.match(/^(\d{4})$/);
  if (yearOnlyMatch) {
    return {
      day: null,
      month: null,
      year: yearOnlyMatch[1],
    };
  }

  // Format: Mon YYYY (e.g., "Oct 1954")
  const myMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (myMatch) {
    const monthLower = myMatch[1].toLowerCase();
    const monthAbbrev = MONTH_MAP[monthLower] ? monthLower.slice(0, 3) : null;
    return {
      day: null,
      month: monthAbbrev,
      year: myMatch[2],
    };
  }

  return { day: null, month: null, year: null };
}

/**
 * Simple XML tag content extractor (works without external parser)
 */
function extractTagContent(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Extract all occurrences of a tag
 */
function extractAllTags(xml: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'gi');
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[1].trim());
  }
  return matches;
}

/**
 * Extract blocks of XML between opening and closing tags
 */
function extractBlocks(xml: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'gi');
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

/**
 * Parse the OFAC SDN XML file
 */
export async function parseOfacSdn(xmlPath: string): Promise<ParseResult> {
  const startTime = performance.now();

  if (!fs.existsSync(xmlPath)) {
    return {
      success: false,
      entries: [],
      stats: {
        totalEntries: 0,
        individualsProcessed: 0,
        entriesWithDob: 0,
        entriesWithPassport: 0,
        parseTime: 0,
      },
      error: `File not found: ${xmlPath}`,
    };
  }

  console.log(`Reading XML file: ${xmlPath}`);
  const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
  console.log(`File size: ${(xmlContent.length / 1024 / 1024).toFixed(2)} MB`);

  const entries: OfacEntry[] = [];
  let totalEntries = 0;
  let individualsProcessed = 0;
  let entriesWithDob = 0;
  let entriesWithPassport = 0;

  // Extract all SDN entries
  const sdnEntries = extractBlocks(xmlContent, 'sdnEntry');
  console.log(`Found ${sdnEntries.length} SDN entries`);

  for (const entry of sdnEntries) {
    totalEntries++;

    // Check if this is an individual (not an entity/vessel)
    const sdnType = extractTagContent(entry, 'sdnType');
    if (sdnType !== 'Individual') {
      continue;
    }

    individualsProcessed++;

    // Extract name parts
    const firstName = extractTagContent(entry, 'firstName') || '';
    const lastName = extractTagContent(entry, 'lastName') || '';

    if (!firstName && !lastName) {
      continue;
    }

    // Extract date of birth
    const dobList = extractBlocks(entry, 'dateOfBirthItem');
    let day: string | null = null;
    let month: string | null = null;
    let year: string | null = null;

    for (const dobItem of dobList) {
      const dateStr = extractTagContent(dobItem, 'dateOfBirth');
      if (dateStr) {
        const parsed = parseDate(dateStr);
        if (parsed.year) {
          day = parsed.day;
          month = parsed.month;
          year = parsed.year;
          break;
        }
      }
    }

    // Also check alternate DOB locations
    if (!year) {
      const dateOfBirthList = extractBlocks(entry, 'dateOfBirthList');
      for (const dobBlock of dateOfBirthList) {
        const dateStr = extractTagContent(dobBlock, 'dateOfBirth');
        if (dateStr) {
          const parsed = parseDate(dateStr);
          if (parsed.year) {
            day = parsed.day;
            month = parsed.month;
            year = parsed.year;
            break;
          }
        }
      }
    }

    // Extract passport/ID documents
    const idList = extractBlocks(entry, 'id');
    let passNo: string | undefined;
    let passCountry: string | undefined;

    for (const idBlock of idList) {
      const idType = extractTagContent(idBlock, 'idType');
      if (idType && idType.toLowerCase().includes('passport')) {
        passNo = extractTagContent(idBlock, 'idNumber') || undefined;
        passCountry = extractTagContent(idBlock, 'idCountry') || undefined;
        if (passNo) break;
      }
    }

    // Create entry
    const ofacEntry: OfacEntry = {
      First_Name: firstName.toUpperCase(),
      Last_Name: lastName.toUpperCase(),
      day,
      month,
      year,
    };

    if (passNo) {
      ofacEntry.Pass_No = passNo.toUpperCase();
      entriesWithPassport++;
    }
    if (passCountry) {
      ofacEntry.Pass_Country = passCountry;
    }

    if (year) {
      entriesWithDob++;
    }

    entries.push(ofacEntry);

    // Also add aliases
    const akaList = extractBlocks(entry, 'aka');
    for (const aka of akaList) {
      const akaFirstName = extractTagContent(aka, 'firstName') || '';
      const akaLastName = extractTagContent(aka, 'lastName') || '';

      if (akaFirstName || akaLastName) {
        const aliasEntry: OfacEntry = {
          First_Name: akaFirstName.toUpperCase() || firstName.toUpperCase(),
          Last_Name: akaLastName.toUpperCase() || lastName.toUpperCase(),
          day,
          month,
          year,
        };
        if (passNo) {
          aliasEntry.Pass_No = passNo.toUpperCase();
        }
        if (passCountry) {
          aliasEntry.Pass_Country = passCountry;
        }
        entries.push(aliasEntry);
      }
    }

    // Progress logging
    if (individualsProcessed % 500 === 0) {
      console.log(`Processed ${individualsProcessed} individuals...`);
    }
  }

  const parseTime = performance.now() - startTime;

  console.log('\n--- Parsing Summary ---');
  console.log(`Total SDN entries: ${totalEntries}`);
  console.log(`Individuals processed: ${individualsProcessed}`);
  console.log(`Entries created (including aliases): ${entries.length}`);
  console.log(`Entries with DOB: ${entriesWithDob}`);
  console.log(`Entries with passport: ${entriesWithPassport}`);
  console.log(`Parse time: ${parseTime.toFixed(2)}ms`);

  return {
    success: true,
    entries,
    stats: {
      totalEntries,
      individualsProcessed,
      entriesWithDob,
      entriesWithPassport,
      parseTime,
    },
  };
}

/**
 * Save parsed entries to JSON files
 */
export function saveOfacData(
  entries: OfacEntry[],
  outputDir: string
): { namesPath: string; passportsPath: string } {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const namesPath = path.join(outputDir, 'names.json');
  const passportsPath = path.join(outputDir, 'passports.json');

  // Save all entries (for name-based trees)
  fs.writeFileSync(namesPath, JSON.stringify(entries, null, 2), 'utf-8');
  console.log(`Saved ${entries.length} entries to: ${namesPath}`);

  // Save only entries with passport numbers
  const passportEntries = entries.filter((e) => e.Pass_No);
  fs.writeFileSync(passportsPath, JSON.stringify(passportEntries, null, 2), 'utf-8');
  console.log(`Saved ${passportEntries.length} passport entries to: ${passportsPath}`);

  return { namesPath, passportsPath };
}

// CLI entrypoint
async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const xmlPath = process.argv[2] || path.join(__dirname, '../../../ofacdata/raw/sdn-latest.xml');
  const outputDir = process.argv[3] || path.join(__dirname, '../../../ofacdata/inputs');

  console.log('='.repeat(60));
  console.log('OFAC SDN XML Parser');
  console.log('='.repeat(60));
  console.log(`Input: ${xmlPath}`);
  console.log(`Output: ${outputDir}`);
  console.log('');

  const result = await parseOfacSdn(xmlPath);

  if (result.success) {
    console.log('\n✅ Parsing successful!');
    saveOfacData(result.entries, outputDir);
  } else {
    console.error('\n❌ Parsing failed!');
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
