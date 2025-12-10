/**
 * OFAC Update Pipeline
 *
 * Main entry point for the complete OFAC update workflow:
 * 1. Download latest SDN XML from Treasury
 * 2. Parse XML to extract sanctioned individuals
 * 3. Build all OFAC Merkle trees
 * 4. Output roots for on-chain updates
 *
 * Usage:
 *   npx tsx common/scripts/ofac/index.ts [--skip-download] [--output-dir <path>]
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { buildAllOfacTrees, type AllTreesResult } from './buildAllTrees.js';
import { downloadOfacSdn } from './downloadSdn.js';
import { parseOfacSdn, saveOfacData } from './parseSdn.js';

export interface PipelineResult {
  success: boolean;
  downloadedFile?: string;
  parsedEntries?: number;
  trees?: AllTreesResult;
  roots?: Record<string, string>;
  error?: string;
}

export interface PipelineOptions {
  skipDownload?: boolean;
  rawDir?: string;
  inputDir?: string;
  outputDir?: string;
}

/**
 * Run the complete OFAC update pipeline
 */
export async function runOfacPipeline(options: PipelineOptions = {}): Promise<PipelineResult> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const baseDir = path.join(__dirname, '../../../ofacdata');
  const rawDir = options.rawDir || path.join(baseDir, 'raw');
  const inputDir = options.inputDir || path.join(baseDir, 'inputs');
  const outputDir = options.outputDir || path.join(baseDir, 'outputs');

  console.log('\n' + '═'.repeat(70));
  console.log('         OFAC UPDATE PIPELINE');
  console.log('═'.repeat(70));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Step 1: Download SDN XML
    let xmlPath = path.join(rawDir, 'sdn-latest.xml');

    if (!options.skipDownload) {
      console.log('\n📥 STEP 1: Downloading OFAC SDN list...');
      console.log('-'.repeat(50));
      const downloadResult = await downloadOfacSdn(rawDir);

      if (!downloadResult.success) {
        return {
          success: false,
          error: `Download failed: ${downloadResult.error}`,
        };
      }
      xmlPath = downloadResult.filePath!;
      console.log(`✅ Downloaded: ${xmlPath}`);
    } else {
      console.log('\n📥 STEP 1: Skipping download (using existing file)');
      if (!fs.existsSync(xmlPath)) {
        return {
          success: false,
          error: `No existing XML file found at: ${xmlPath}`,
        };
      }
      console.log(`   Using: ${xmlPath}`);
    }

    // Step 2: Parse XML
    console.log('\n📄 STEP 2: Parsing SDN XML...');
    console.log('-'.repeat(50));
    const parseResult = await parseOfacSdn(xmlPath);

    if (!parseResult.success) {
      return {
        success: false,
        error: `Parsing failed: ${parseResult.error}`,
      };
    }

    saveOfacData(parseResult.entries, inputDir);
    console.log(`✅ Parsed ${parseResult.entries.length} entries`);

    // Step 3: Build trees
    console.log('\n🌳 STEP 3: Building Merkle trees...');
    console.log('-'.repeat(50));
    const namesPath = path.join(inputDir, 'names.json');
    const treesResult = await buildAllOfacTrees(namesPath, outputDir);

    if (!treesResult.success) {
      return {
        success: false,
        error: `Tree building failed: ${treesResult.error}`,
      };
    }

    // Collect roots
    const roots: Record<string, string> = {};
    for (const tree of treesResult.trees) {
      roots[tree.treeType] = tree.root;
    }

    // Step 4: Summary
    console.log('\n📊 STEP 4: Pipeline complete!');
    console.log('-'.repeat(50));
    console.log('\nNew OFAC Roots:');
    console.log(JSON.stringify(roots, null, 2));

    // Save roots to a file for easy access
    const rootsPath = path.join(outputDir, 'latest-roots.json');
    fs.writeFileSync(
      rootsPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          roots,
        },
        null,
        2
      )
    );
    console.log(`\nRoots saved to: ${rootsPath}`);

    return {
      success: true,
      downloadedFile: xmlPath,
      parsedEntries: parseResult.entries.length,
      trees: treesResult,
      roots,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

// CLI entrypoint
async function main() {
  const args = process.argv.slice(2);
  const skipDownload = args.includes('--skip-download');
  const outputDirIndex = args.indexOf('--output-dir');
  const outputDir = outputDirIndex >= 0 ? args[outputDirIndex + 1] : undefined;

  const result = await runOfacPipeline({
    skipDownload,
    outputDir,
  });

  console.log('\n' + '═'.repeat(70));
  if (result.success) {
    console.log('✅ OFAC UPDATE PIPELINE COMPLETED SUCCESSFULLY');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Upload trees to tree server');
    console.log('  2. Prepare multisig transaction with new roots');
    console.log('  3. Get 2/5 dev approvals on Safe');
  } else {
    console.log('❌ OFAC UPDATE PIPELINE FAILED');
    console.log(`   Error: ${result.error}`);
    process.exit(1);
  }
  console.log('═'.repeat(70));
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
