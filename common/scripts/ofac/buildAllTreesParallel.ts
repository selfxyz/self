/**
 * OFAC Tree Builder - Parallel Version
 *
 * Builds all OFAC Merkle trees in parallel using async execution.
 * Provides better progress tracking compared to sequential building.
 */

import * as fs from 'fs';
import * as path from 'path';

import { buildAadhaarSMTAsync, buildSMTAsync } from '../../src/utils/trees.js';
import type { OfacEntry } from './parseSdn.js';
import { ProgressMonitor } from './progressMonitor.js';

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

function loadEntries(inputPath: string): OfacEntry[] {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }
  const content = fs.readFileSync(inputPath, 'utf-8');
  return JSON.parse(content) as OfacEntry[];
}

/**
 * Build a single tree and save it
 * This function is designed to be run in parallel with others
 */
async function buildSingleTree(
  entries: OfacEntry[],
  treeType: string,
  outputFile: string,
  outputDir: string,
  treeIndex: number,
  monitor: ProgressMonitor | null,
  filterFn?: (e: OfacEntry) => boolean
): Promise<TreeBuildResult> {
  const startTime = performance.now();

  // Filter entries
  const filteredEntries = filterFn ? entries.filter(filterFn) : entries;

  if (monitor) {
    monitor.updateTree(treeIndex, {
      status: 'building',
      totalEntries: filteredEntries.length
    });
  }

  await new Promise(resolve => setImmediate(resolve));

  // Build tree based on type
  let count: number, buildTime: number, tree: any;

  try {
    if (treeType.startsWith('aadhaar_')) {
      const baseType = treeType.replace('aadhaar_', '') as 'name_and_dob' | 'name_and_yob';
      [count, buildTime, tree] = await buildAadhaarSMTAsync(filteredEntries, baseType, monitor, treeIndex);
    } else {
      [count, buildTime, tree] = await buildSMTAsync(filteredEntries, treeType as any, monitor, treeIndex);
    }

    // Export and save
    const treeExport = tree.export();
    const outputPath = path.join(outputDir, outputFile);
    fs.writeFileSync(outputPath, JSON.stringify(treeExport));

    const totalTime = performance.now() - startTime;

    // Update monitor with completion
    if (monitor) {
      monitor.updateTree(treeIndex, {
        status: 'completed',
        entriesAdded: count,
        entriesProcessed: filteredEntries.length,
        totalEntries: filteredEntries.length
      });
    }

    return {
      treeType,
      entriesProcessed: filteredEntries.length,
      entriesAdded: count,
      buildTime,
      root: tree.root.toString(),
      exportPath: outputPath,
    };
  } catch (error) {
    if (monitor) {
      monitor.updateTree(treeIndex, { status: 'failed' });
    }
    throw error;
  }
}

/**
 * Build all OFAC trees in PARALLEL
 */
export async function buildAllOfacTreesParallel(
  inputPath: string,
  outputDir: string
): Promise<AllTreesResult> {
  const startTime = performance.now();

  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Load entries once
    console.log(`\nLoading entries from: ${inputPath}`);
    const entries = loadEntries(inputPath);
    console.log(`Loaded ${entries.length} entries`);

    // Calculate entry counts for each tree type
    const passportEntries = entries.filter((e) => !!(e.Pass_No && e.Pass_Country));

    // Initialize monitor but don't start yet
    const monitor = new ProgressMonitor([
      'passport_no+nationality',
      'name+dob',
      'name+yob',
      'name+dob (ID)',
      'name+yob (ID)',
      'Aadhaar name+dob',
      'Aadhaar name+yob',
    ]);

    // Pre-populate with entry counts (we know them in advance)
    monitor.updateTree(1, { totalEntries: passportEntries.length });
    monitor.updateTree(2, { totalEntries: entries.length });
    monitor.updateTree(3, { totalEntries: entries.length });
    monitor.updateTree(4, { totalEntries: entries.length });
    monitor.updateTree(5, { totalEntries: entries.length });
    monitor.updateTree(6, { totalEntries: entries.length });
    monitor.updateTree(7, { totalEntries: entries.length });

    console.log('Starting parallel tree building...\n');

    // Suppress verbose logs BEFORE starting monitor
    const logControl = ProgressMonitor.suppressLogs();

    // Start monitor AFTER suppressing logs
    monitor.start();

    // Give a moment for dashboard to render
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      // Mark all trees as building before starting promises
      for (let i = 1; i <= 7; i++) {
        monitor.updateTree(i, { status: 'building' });
      }

      // Force a render to show "building" status immediately
      await new Promise(resolve => setImmediate(resolve));

      const treePromises = [
        // Passport trees (3 trees)
        buildSingleTree(
          entries,
          'passport_no_and_nationality',
          'passportNoAndNationalitySMT.json',
          outputDir,
          1,
          monitor,
          (e) => !!(e.Pass_No && e.Pass_Country)
        ),
        buildSingleTree(
          entries,
          'name_and_dob',
          'nameAndDobSMT.json',
          outputDir,
          2,
          monitor
        ),
        buildSingleTree(
          entries,
          'name_and_yob',
          'nameAndYobSMT.json',
          outputDir,
          3,
          monitor
        ),

        // ID Card trees (2 trees)
        buildSingleTree(
          entries,
          'name_and_dob_id_card',
          'nameAndDobSMT_ID.json',
          outputDir,
          4,
          monitor
        ),
        buildSingleTree(
          entries,
          'name_and_yob_id_card',
          'nameAndYobSMT_ID.json',
          outputDir,
          5,
          monitor
        ),

        // Aadhaar trees (2 trees)
        buildSingleTree(
          entries,
          'aadhaar_name_and_dob',
          'nameAndDobSMT_AADHAAR.json',
          outputDir,
          6,
          monitor
        ),
        buildSingleTree(
          entries,
          'aadhaar_name_and_yob',
          'nameAndYobSMT_AADHAAR.json',
          outputDir,
          7,
          monitor
        ),
      ];

      // Start all promises
      const allResults = await Promise.all(treePromises);

      monitor.stop();
      logControl.restore();

      const totalTime = performance.now() - startTime;

      // Save roots summary
      const rootsSummary: Record<string, string> = {};
      for (const result of allResults) {
        rootsSummary[result.treeType] = result.root;
      }
      const rootsPath = path.join(outputDir, 'roots.json');
      fs.writeFileSync(rootsPath, JSON.stringify(rootsSummary, null, 2));

      console.log('\n┌─────────────────────────────────────────────────────────────┐');
      console.log(`│  ✅ ALL 7 TREES COMPLETED IN ${(totalTime / 1000).toFixed(1)}s`.padEnd(62) + '│');
      console.log('└─────────────────────────────────────────────────────────────┘');
      console.log(`\nRoots summary saved to: ${rootsPath}`);

      return {
        success: true,
        trees: allResults,
        totalTime,
      };
    } catch (error) {
      monitor.stop();
      logControl.restore();

      return {
        success: false,
        trees: [],
        totalTime: performance.now() - startTime,
        error: (error as Error).message,
      };
    }
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
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           📊 PARALLEL TREE BUILD SUMMARY                        ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  if (!result.success) {
    console.log(`\n❌ Build failed: ${result.error}`);
    return;
  }

  console.log('\n┌────────────────────────────────────────────────────────────────┐');
  console.log('│ Tree Name                      │ Entries │ Time   │ Status    │');
  console.log('├────────────────────────────────┼─────────┼────────┼───────────┤');

  const getIcon = (entries: number) => {
    if (entries > 15000) return '🔴';
    if (entries > 10000) return '🟡';
    if (entries > 5000) return '🟢';
    return '🔵';
  };

  for (const tree of result.trees) {
    const icon = getIcon(tree.entriesAdded);
    const name = tree.treeType
      .replace('_and_', '+')
      .replace('_id_card', ' (ID)')
      .replace('aadhaar_', 'Aadhaar ');
    const time = (tree.buildTime / 1000).toFixed(1) + 's';

    console.log(
      `│ ${icon} ${name.padEnd(29)} │ ${tree.entriesAdded.toString().padStart(7)} │ ${time.padStart(6)} │ ✅ Done   │`
    );
  }

  console.log('└────────────────────────────────────────────────────────────────┘');

  // Calculate stats
  const totalEntries = result.trees.reduce((sum, t) => sum + t.entriesAdded, 0);
  const avgTime = result.trees.reduce((sum, t) => sum + t.buildTime, 0) / result.trees.length;

  console.log('\n┌────────────────────────────────────────────────────────────────┐');
  console.log('│                    ⚡ PERFORMANCE METRICS                       │');
  console.log('├────────────────────────────────────────────────────────────────┤');
  console.log(`│ Total entries processed:   ${totalEntries.toString().padStart(10)}                      │`);
  console.log(`│ Trees built:               ${result.trees.length.toString().padStart(10)}                      │`);
  console.log(`│ Average time per tree:     ${(avgTime / 1000).toFixed(1).padStart(10)}s                     │`);
  console.log(`│ Total build time:          ${(result.totalTime / 1000).toFixed(1).padStart(10)}s                     │`);
  console.log('└────────────────────────────────────────────────────────────────┘');

  // Root hashes preview
  console.log('\n┌────────────────────────────────────────────────────────────────┐');
  console.log('│                    🔐 ROOT HASHES (Preview)                     │');
  console.log('└────────────────────────────────────────────────────────────────┘');

  for (const tree of result.trees.slice(0, 3)) {
    const rootPreview = tree.root.substring(0, 40) + '...';
    console.log(`  ${tree.treeType}: ${rootPreview}`);
  }
  console.log(`  ... and ${result.trees.length - 3} more`);

  console.log('\n✅ All trees built successfully!\n');
}

// CLI entrypoint
async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const inputPath = process.argv[2] || path.join(__dirname, '../../../ofacdata/inputs/names.json');
  const outputDir = process.argv[3] || path.join(__dirname, '../../../ofacdata/outputs');

  console.log('='.repeat(60));
  console.log('OFAC Tree Builder (PARALLEL VERSION)');
  console.log('='.repeat(60));
  console.log(`Input: ${inputPath}`);
  console.log(`Output: ${outputDir}`);

  const result = await buildAllOfacTreesParallel(inputPath, outputDir);
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
