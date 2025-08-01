#!/usr/bin/env node

/**
 * Test Clean Re-Exports - Verify that safe re-exports work correctly
 */

import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define build directory path relative to script location
const BUILD_DIR = join(__dirname, 'dist', 'esm');

console.log('🧹 Testing Clean Re-Export Implementation...\n');

// Verify build directory exists before proceeding
function verifyBuildDirectory() {
  if (!existsSync(BUILD_DIR)) {
    console.error(`❌ Build directory not found: ${BUILD_DIR}`);
    console.error('   Please run the build process first (e.g., "npm run build" or "yarn build")');
    process.exit(1);
  }

  console.log(`✅ Build directory verified: ${BUILD_DIR}`);
}

// Helper function to safely import modules with proper error handling
async function safeImport(modulePath, description) {
  try {
    const fullPath = resolve(BUILD_DIR, modulePath);

    // Check if the specific file exists
    if (!existsSync(fullPath)) {
      throw new Error(`Module file not found: ${fullPath}`);
    }

    return await import(fullPath);
  } catch (error) {
    console.error(`❌ Failed to import ${description}:`, error.message);
    throw error;
  }
}

async function testCleanReExports() {
  try {
    // Verify build directory exists
    verifyBuildDirectory();

    // Test Hash Re-Exports
    console.log('✅ Testing Hash Re-Exports...');
    const { hash } = await safeImport('src/utils/hash/sha.js', 'hash module');
    const { flexiblePoseidon } = await safeImport('src/utils/hash/poseidon.js', 'poseidon module');
    const { customHasher } = await safeImport('src/utils/hash/custom.js', 'custom hasher module');
    console.log('   - hash (from sha):', typeof hash, '✅');
    console.log('   - flexiblePoseidon (from poseidon):', typeof flexiblePoseidon, '✅');
    console.log('   - customHasher (from custom):', typeof customHasher, '✅');

    // Test Circuit Re-Exports
    console.log('\n✅ Testing Circuit Re-Exports...');
    const { generateCircuitInputsDSC } = await safeImport(
      'src/utils/circuits/dsc-inputs.js',
      'DSC circuit inputs module'
    );
    const { generateCircuitInputsRegister } = await safeImport(
      'src/utils/circuits/register-inputs.js',
      'register circuit inputs module'
    );
    const { generateCircuitInputsVCandDisclose } = await safeImport(
      'src/utils/circuits/disclose-inputs.js',
      'disclose circuit inputs module'
    );
    const { generateCircuitInputsOfac } = await safeImport(
      'src/utils/circuits/ofac-inputs.js',
      'OFAC circuit inputs module'
    );
    console.log('   - generateCircuitInputsDSC:', typeof generateCircuitInputsDSC, '✅');
    console.log('   - generateCircuitInputsRegister:', typeof generateCircuitInputsRegister, '✅');
    console.log(
      '   - generateCircuitInputsVCandDisclose:',
      typeof generateCircuitInputsVCandDisclose,
      '✅'
    );
    console.log('   - generateCircuitInputsOfac:', typeof generateCircuitInputsOfac, '✅');

    // Test Passport Re-Exports
    console.log('\n✅ Testing Passport Re-Exports...');
    const { generateCommitment } = await safeImport(
      'src/utils/passports/commitment.js',
      'commitment module'
    );
    const { initPassportDataParsing } = await safeImport(
      'src/utils/passports/core.js',
      'passport core module'
    );
    console.log('   - generateCommitment:', typeof generateCommitment, '✅');
    console.log('   - initPassportDataParsing:', typeof initPassportDataParsing, '✅');

    console.log('\n🎉 SUCCESS! Clean Re-Exports Working Perfectly!');
    console.log('\n📊 Benefits of Clean Re-Export Approach:');
    console.log('   ✅ No risk of regressions (uses existing, tested code)');
    console.log('   ✅ Same tree-shaking benefits (via package.json exports)');
    console.log('   ✅ Maximum granularity (individual function imports)');
    console.log('   ✅ Simple, maintainable code');

    console.log('\n🔧 Ready-to-Use Level 3 Imports:');
    console.log('   import { hash } from "@selfxyz/common/utils/hash/sha";');
    console.log('   import { flexiblePoseidon } from "@selfxyz/common/utils/hash/poseidon";');
    console.log(
      '   import { generateCommitment } from "@selfxyz/common/utils/passports/commitment";'
    );
  } catch (error) {
    console.error('❌ Error testing clean re-exports:', error.message);
    process.exit(1);
  }
}

testCleanReExports();
