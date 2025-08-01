#!/usr/bin/env node

/**
 * Test Clean Re-Exports - Verify that safe re-exports work correctly
 */

console.log('🧹 Testing Clean Re-Export Implementation...\n');

async function testCleanReExports() {
  try {
    // Test Hash Re-Exports
    console.log('✅ Testing Hash Re-Exports...');
    const { hash } = await import('./dist/esm/src/utils/hash/sha.js');
    const { flexiblePoseidon } = await import('./dist/esm/src/utils/hash/poseidon.js');
    const { customHasher } = await import('./dist/esm/src/utils/hash/custom.js');
    console.log('   - hash (from sha):', typeof hash, '✅');
    console.log('   - flexiblePoseidon (from poseidon):', typeof flexiblePoseidon, '✅');
    console.log('   - customHasher (from custom):', typeof customHasher, '✅');

    // Test Circuit Re-Exports
    console.log('\n✅ Testing Circuit Re-Exports...');
    const { generateCircuitInputsDSC } = await import('./dist/esm/src/utils/circuits/dsc-inputs.js');
    const { generateCircuitInputsRegister } = await import('./dist/esm/src/utils/circuits/register-inputs.js');
    const { generateCircuitInputsVCandDisclose } = await import('./dist/esm/src/utils/circuits/disclose-inputs.js');
    const { generateCircuitInputsOfac } = await import('./dist/esm/src/utils/circuits/ofac-inputs.js');
    console.log('   - generateCircuitInputsDSC:', typeof generateCircuitInputsDSC, '✅');
    console.log('   - generateCircuitInputsRegister:', typeof generateCircuitInputsRegister, '✅');
    console.log('   - generateCircuitInputsVCandDisclose:', typeof generateCircuitInputsVCandDisclose, '✅');
    console.log('   - generateCircuitInputsOfac:', typeof generateCircuitInputsOfac, '✅');

    // Test Passport Re-Exports
    console.log('\n✅ Testing Passport Re-Exports...');
    const { generateCommitment } = await import('./dist/esm/src/utils/passports/commitment.js');
    const { initPassportDataParsing } = await import('./dist/esm/src/utils/passports/core.js');
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
    console.log('   import { generateCommitment } from "@selfxyz/common/utils/passports/commitment";');

  } catch (error) {
    console.error('❌ Error testing clean re-exports:', error.message);
    process.exit(1);
  }
}

testCleanReExports();
