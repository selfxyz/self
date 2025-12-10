/**
 * OFAC Tree Builder
 *
 * Orchestrates the building of all OFAC SMT trees:
 * - Passport: passport_no_and_nationality, name_and_dob, name_and_yob
 * - ID Card: name_and_dob_id_card, name_and_yob_id_card
 * - Aadhaar: name_and_dob (Aadhaar format), name_and_yob (Aadhaar format)
 * - KYC/Selfrica: name_and_dob, name_and_yob
 */

import * as fs from 'fs';
import * as path from 'path';

import { buildAadhaarSMT, buildSMT } from '../../src/utils/trees.js';

// Note: buildKycSMT not available on all branches - use buildSMT with KYC tree types
// When buildKycSMT is available, uncomment the import above

import type { OfacEntry } from './parseSdn.js';

export interface TreeBuildResult {
  treeType: string;
  entriesProcessed: number;
  entriesAdded: number;
  buildTime: number;
  root: string;
  exportPath?: string;
}

export interface AllTreesResult {
  success: boolean;
  trees: TreeBuildResult[];
  totalTime: number;
  error?: string;
}

/**
 * Load OFAC entries from JSON file
 */
function loadEntries(inputPath: string): OfacEntry[] {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }
  const content = fs.readFileSync(inputPath, 'utf-8');
  return JSON.parse(content) as OfacEntry[];
}

/**
 * Build all OFAC trees for passport verification
 */
async function buildPassportTrees(
  entries: OfacEntry[],
  outputDir: string
): Promise<TreeBuildResult[]> {
  const results: TreeBuildResult[] = [];

  // Filter entries with passport numbers for passport_no_and_nationality tree
  const passportEntries = entries.filter((e) => e.Pass_No && e.Pass_Country);

  // 1. Passport Number and Nationality tree
  console.log('\n📦 Building passport_no_and_nationality tree...');
  const [ppCount, ppTime, ppTree] = buildSMT(passportEntries, 'passport_no_and_nationality');
  const ppExport = ppTree.export();
  const ppPath = path.join(outputDir, 'passportNoAndNationalitySMT.json');
  fs.writeFileSync(ppPath, JSON.stringify(ppExport));
  results.push({
    treeType: 'passport_no_and_nationality',
    entriesProcessed: passportEntries.length,
    entriesAdded: ppCount,
    buildTime: ppTime,
    root: ppTree.root.toString(),
    exportPath: ppPath,
  });

  // 2. Name and DOB tree (passport format)
  console.log('\n📦 Building name_and_dob tree...');
  const [dobCount, dobTime, dobTree] = buildSMT(entries, 'name_and_dob');
  const dobExport = dobTree.export();
  const dobPath = path.join(outputDir, 'nameAndDobSMT.json');
  fs.writeFileSync(dobPath, JSON.stringify(dobExport));
  results.push({
    treeType: 'name_and_dob',
    entriesProcessed: entries.length,
    entriesAdded: dobCount,
    buildTime: dobTime,
    root: dobTree.root.toString(),
    exportPath: dobPath,
  });

  // 3. Name and YOB tree (passport format)
  console.log('\n📦 Building name_and_yob tree...');
  const [yobCount, yobTime, yobTree] = buildSMT(entries, 'name_and_yob');
  const yobExport = yobTree.export();
  const yobPath = path.join(outputDir, 'nameAndYobSMT.json');
  fs.writeFileSync(yobPath, JSON.stringify(yobExport));
  results.push({
    treeType: 'name_and_yob',
    entriesProcessed: entries.length,
    entriesAdded: yobCount,
    buildTime: yobTime,
    root: yobTree.root.toString(),
    exportPath: yobPath,
  });

  return results;
}

/**
 * Build all OFAC trees for ID card verification
 */
async function buildIdCardTrees(
  entries: OfacEntry[],
  outputDir: string
): Promise<TreeBuildResult[]> {
  const results: TreeBuildResult[] = [];

  // 1. Name and DOB tree (ID card format)
  console.log('\n📦 Building name_and_dob_id_card tree...');
  const [dobCount, dobTime, dobTree] = buildSMT(entries, 'name_and_dob_id_card');
  const dobExport = dobTree.export();
  const dobPath = path.join(outputDir, 'nameAndDobSMT_ID.json');
  fs.writeFileSync(dobPath, JSON.stringify(dobExport));
  results.push({
    treeType: 'name_and_dob_id_card',
    entriesProcessed: entries.length,
    entriesAdded: dobCount,
    buildTime: dobTime,
    root: dobTree.root.toString(),
    exportPath: dobPath,
  });

  // 2. Name and YOB tree (ID card format)
  console.log('\n📦 Building name_and_yob_id_card tree...');
  const [yobCount, yobTime, yobTree] = buildSMT(entries, 'name_and_yob_id_card');
  const yobExport = yobTree.export();
  const yobPath = path.join(outputDir, 'nameAndYobSMT_ID.json');
  fs.writeFileSync(yobPath, JSON.stringify(yobExport));
  results.push({
    treeType: 'name_and_yob_id_card',
    entriesProcessed: entries.length,
    entriesAdded: yobCount,
    buildTime: yobTime,
    root: yobTree.root.toString(),
    exportPath: yobPath,
  });

  return results;
}

/**
 * Build all OFAC trees for Aadhaar verification
 */
async function buildAadhaarTrees(
  entries: OfacEntry[],
  outputDir: string
): Promise<TreeBuildResult[]> {
  const results: TreeBuildResult[] = [];

  // 1. Name and DOB tree (Aadhaar format)
  console.log('\n📦 Building Aadhaar name_and_dob tree...');
  const [dobCount, dobTime, dobTree] = buildAadhaarSMT(entries, 'name_and_dob');
  const dobExport = dobTree.export();
  const dobPath = path.join(outputDir, 'nameAndDobSMT_AADHAAR.json');
  fs.writeFileSync(dobPath, JSON.stringify(dobExport));
  results.push({
    treeType: 'aadhaar_name_and_dob',
    entriesProcessed: entries.length,
    entriesAdded: dobCount,
    buildTime: dobTime,
    root: dobTree.root.toString(),
    exportPath: dobPath,
  });

  // 2. Name and YOB tree (Aadhaar format)
  console.log('\n📦 Building Aadhaar name_and_yob tree...');
  const [yobCount, yobTime, yobTree] = buildAadhaarSMT(entries, 'name_and_yob');
  const yobExport = yobTree.export();
  const yobPath = path.join(outputDir, 'nameAndYobSMT_AADHAAR.json');
  fs.writeFileSync(yobPath, JSON.stringify(yobExport));
  results.push({
    treeType: 'aadhaar_name_and_yob',
    entriesProcessed: entries.length,
    entriesAdded: yobCount,
    buildTime: yobTime,
    root: yobTree.root.toString(),
    exportPath: yobPath,
  });

  return results;
}

/**
 * Build all OFAC trees for KYC/Selfrica verification
 * NOTE: Disabled - buildKycSMT not available on dev branch
 * Uncomment when buildKycSMT is added to common/src/utils/trees.ts
 */
async function buildKycTrees(
  _entries: OfacEntry[],
  _outputDir: string
): Promise<TreeBuildResult[]> {
  console.log('\n⚠️  Skipping KYC trees (buildKycSMT not available on this branch)');
  return [];

  /* Uncomment when buildKycSMT is available:
  const results: TreeBuildResult[] = [];

  // 1. Name and DOB tree (KYC format)
  console.log('\n📦 Building KYC name_and_dob tree...');
  const [dobCount, dobTime, dobTree] = buildKycSMT(entries, 'name_and_dob');
  const dobExport = dobTree.export();
  const dobPath = path.join(outputDir, 'nameAndDobKycSMT.json');
  fs.writeFileSync(dobPath, JSON.stringify(dobExport));
  results.push({
    treeType: 'kyc_name_and_dob',
    entriesProcessed: entries.length,
    entriesAdded: dobCount,
    buildTime: dobTime,
    root: dobTree.root.toString(),
    exportPath: dobPath,
  });

  // 2. Name and YOB tree (KYC format)
  console.log('\n📦 Building KYC name_and_yob tree...');
  const [yobCount, yobTime, yobTree] = buildKycSMT(entries, 'name_and_yob');
  const yobExport = yobTree.export();
  const yobPath = path.join(outputDir, 'nameAndYobKycSMT.json');
  fs.writeFileSync(yobPath, JSON.stringify(yobExport));
  results.push({
    treeType: 'kyc_name_and_yob',
    entriesProcessed: entries.length,
    entriesAdded: yobCount,
    buildTime: yobTime,
    root: yobTree.root.toString(),
    exportPath: yobPath,
  });

  return results;
  */
}

/**
 * Build all OFAC trees
 */
export async function buildAllOfacTrees(
  inputPath: string,
  outputDir: string
): Promise<AllTreesResult> {
  const startTime = performance.now();

  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Load entries
    console.log(`\nLoading entries from: ${inputPath}`);
    const entries = loadEntries(inputPath);
    console.log(`Loaded ${entries.length} entries`);

    const allResults: TreeBuildResult[] = [];

    // Build all tree types
    const passportResults = await buildPassportTrees(entries, outputDir);
    allResults.push(...passportResults);

    const idCardResults = await buildIdCardTrees(entries, outputDir);
    allResults.push(...idCardResults);

    const aadhaarResults = await buildAadhaarTrees(entries, outputDir);
    allResults.push(...aadhaarResults);

    const kycResults = await buildKycTrees(entries, outputDir);
    allResults.push(...kycResults);

    const totalTime = performance.now() - startTime;

    // Save roots summary
    const rootsSummary: Record<string, string> = {};
    for (const result of allResults) {
      rootsSummary[result.treeType] = result.root;
    }
    const rootsPath = path.join(outputDir, 'roots.json');
    fs.writeFileSync(rootsPath, JSON.stringify(rootsSummary, null, 2));
    console.log(`\nSaved roots summary to: ${rootsPath}`);

    return {
      success: true,
      trees: allResults,
      totalTime,
    };
  } catch (error) {
    return {
      success: false,
      trees: [],
      totalTime: performance.now() - startTime,
      error: (error as Error).message,
    };
  }
}

/**
 * Print build results summary
 */
function printSummary(result: AllTreesResult): void {
  console.log('\n' + '='.repeat(70));
  console.log('OFAC TREE BUILD SUMMARY');
  console.log('='.repeat(70));

  if (!result.success) {
    console.log(`\n❌ Build failed: ${result.error}`);
    return;
  }

  console.log('\n📊 Tree Build Results:\n');
  console.log(
    '| Tree Type                    | Entries | Added  | Time (ms) | Root (first 20 chars)    |'
  );
  console.log(
    '|------------------------------|---------|--------|-----------|--------------------------|'
  );

  for (const tree of result.trees) {
    const rootPreview = tree.root.substring(0, 20) + '...';
    console.log(
      `| ${tree.treeType.padEnd(28)} | ${tree.entriesProcessed.toString().padStart(7)} | ${tree.entriesAdded.toString().padStart(6)} | ${tree.buildTime.toFixed(0).padStart(9)} | ${rootPreview.padEnd(24)} |`
    );
  }

  console.log('\n' + '='.repeat(70));
  console.log(`Total build time: ${(result.totalTime / 1000).toFixed(2)} seconds`);
  console.log('='.repeat(70));
}

// CLI entrypoint
async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const inputPath = process.argv[2] || path.join(__dirname, '../../../ofacdata/inputs/names.json');
  const outputDir = process.argv[3] || path.join(__dirname, '../../../ofacdata/outputs');

  console.log('='.repeat(60));
  console.log('OFAC Tree Builder');
  console.log('='.repeat(60));
  console.log(`Input: ${inputPath}`);
  console.log(`Output: ${outputDir}`);

  const result = await buildAllOfacTrees(inputPath, outputDir);
  printSummary(result);

  if (!result.success) {
    process.exit(1);
  }

  console.log('\n✅ All trees built successfully!');
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
