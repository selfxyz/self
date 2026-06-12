#!/usr/bin/env node
// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { execSync } = require('child_process');
const { existsSync, readdirSync, statSync, readFileSync } = require('fs');
const { basename, join, relative } = require('path');

function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

function analyzeReactNativeBundle(platform) {
  console.log(`📱 Analyzing React Native Bundle (${platform})`);
  console.log('============================================');

  // Use existing bundle analysis but with tree shaking focus
  const bundleAnalyzeScript = join(__dirname, 'bundle-analyze-ci.cjs');

  try {
    console.log('🔨 Running bundle analysis...');
    execSync(`node ${bundleAnalyzeScript} ${platform}`, {
      stdio: 'inherit',
    });

    // Additional tree shaking specific analysis
    const tmpDir = join(
      require('os').tmpdir(),
      'react-native-bundle-visualizer',
    );
    const reportPath = join(tmpDir, 'Self', 'output', 'explorer.html');

    if (existsSync(reportPath)) {
      console.log(`\n📊 Detailed bundle report: ${reportPath}`);
      console.log('💡 Look for:');
      console.log('   - Unused modules from @selfxyz/common');
      console.log('   - Large vendor chunks that could be optimized');
      console.log('   - Multiple copies of the same module');
    }
  } catch (error) {
    console.log('❌ Bundle analysis failed:', error.message);
  }
}

function categorizeImports(imports) {
  const constants = [
    'API_URL',
    'API_URL_STAGING',
    'countryCodes',
    'commonNames',
    'countries',
    'PASSPORT_ATTESTATION_ID',
    'ID_CARD_ATTESTATION_ID',
    'DEFAULT_MAJORITY',
    'CSCA_TREE_URL',
    'DSC_TREE_URL',
    'TREE_URL',
    'TREE_URL_STAGING',
    'PCR0_MANAGER_ADDRESS',
    'RPC_URL',
    'WS_DB_RELAYER',
  ];

  const utils = [
    'hash',
    'flexiblePoseidon',
    'customHasher',
    'generateCommitment',
    'generateNullifier',
    'formatMrz',
    'initPassportDataParsing',
    'buildSMT',
    'getLeafCscaTree',
    'getLeafDscTree',
    'generateCircuitInputsDSC',
    'generateCircuitInputsRegister',
    'generateCircuitInputsVCandDisclose',
    'formatEndpoint',
    'hashEndpointWithScope',
    'stringToBigInt',
    'bigIntToString',
    'genMockIdDoc',
    'generateMockDSC',
    'genAndInitMockPassportData',
  ];

  const types = [
    'PassportData',
    'DocumentCategory',
    'CertificateData',
    'PublicKeyDetailsECDSA',
    'PublicKeyDetailsRSA',
    'PassportMetadata',
    'UserIdType',
    'EndpointType',
    'SelfApp',
    'SelfAppDisclosureConfig',
    'IdDocInput',
    'Country3LetterCode',
  ];

  const suggestions = [];

  const constantImports = imports.filter(imp =>
    constants.includes(imp.replace(/^type\s+/, '')),
  );
  const utilImports = imports.filter(imp =>
    utils.includes(imp.replace(/^type\s+/, '')),
  );
  const typeImports = imports.filter(
    imp =>
      types.includes(imp.replace(/^type\s+/, '')) || imp.startsWith('type '),
  );

  if (constantImports.length > 0) {
    suggestions.push({
      category: 'constants',
      imports: constantImports,
      suggestion: `import { ${constantImports.join(', ')} } from '@selfxyz/common/constants';`,
    });
  }

  if (utilImports.length > 0) {
    suggestions.push({
      category: 'utils',
      imports: utilImports,
      suggestion: `import { ${utilImports.join(', ')} } from '@selfxyz/common/utils';`,
    });
  }

  if (typeImports.length > 0) {
    suggestions.push({
      category: 'types',
      imports: typeImports,
      suggestion: `import type { ${typeImports.map(t => t.replace(/^type\s+/, '')).join(', ')} } from '@selfxyz/common/types';`,
    });
  }

  return suggestions;
}

function compareImportPatterns() {
  console.log('\n🔬 Import Pattern Analysis');
  console.log('==========================');

  const srcDir = join(__dirname, '..', 'src');

  if (!existsSync(srcDir)) {
    console.log('❌ Source directory not found');
    return;
  }

  // Find TypeScript/JavaScript files
  const findFiles = (dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) => {
    const files = [];
    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      if (statSync(fullPath).isDirectory()) {
        files.push(...findFiles(fullPath, extensions));
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
    return files;
  };

  const files = findFiles(srcDir);

  // Analyze import patterns
  let totalFiles = 0;
  let filesWithCommonImports = 0;
  let starImports = 0;
  let namedImports = 0;
  let granularImports = 0;

  const importPatterns = {
    star: [],
    mixed: [],
    granular: [],
  };

  const fileConversionOpportunities = [];

  files.forEach(file => {
    const content = readFileSync(file, 'utf8');
    totalFiles++;

    // Check for @selfxyz/common imports
    const commonImportRegex = /import.*from\s+['"]@selfxyz\/common[^'"]*['"]/g;
    const matches = content.match(commonImportRegex) || [];

    if (matches.length > 0) {
      filesWithCommonImports++;

      const fileInfo = {
        file: relative(srcDir, file),
        imports: [],
        conversionOpportunities: [],
        priority: 0,
      };

      matches.forEach(match => {
        if (match.includes('* as')) {
          starImports++;
          importPatterns.star.push({
            file: relative(srcDir, file),
            import: match.trim(),
          });
          fileInfo.imports.push({ type: 'star', import: match.trim() });
          fileInfo.priority += 3; // High priority for star imports
        } else if (
          match.includes('/constants') ||
          match.includes('/utils') ||
          match.includes('/types')
        ) {
          granularImports++;
          importPatterns.granular.push({
            file: relative(srcDir, file),
            import: match.trim(),
          });
          fileInfo.imports.push({ type: 'granular', import: match.trim() });
        } else {
          namedImports++;
          importPatterns.mixed.push({
            file: relative(srcDir, file),
            import: match.trim(),
          });
          fileInfo.imports.push({ type: 'mixed', import: match.trim() });
          fileInfo.priority += 1; // Medium priority for mixed imports

          // Analyze what specific imports this file has and suggest granular equivalents
          const namedImportMatches = match.match(/import\s+\{([^}]+)\}/);
          if (namedImportMatches) {
            const imports = namedImportMatches[1]
              .split(',')
              .map(i => i.trim())
              .filter(i => i && !i.includes('type'));

            const suggestions = categorizeImports(imports);
            if (suggestions.length > 0) {
              fileInfo.conversionOpportunities = suggestions;
            }
          }
        }
      });

      if (fileInfo.priority > 0) {
        fileConversionOpportunities.push(fileInfo);
      }
    }
  });

  console.log(`📁 Analyzed ${totalFiles} files`);
  console.log(`📦 Files importing @selfxyz/common: ${filesWithCommonImports}`);
  console.log(`⭐ Star imports (import *): ${starImports}`);
  console.log(`📝 Named imports: ${namedImports}`);
  console.log(`🎯 Granular imports: ${granularImports}`);

  // Show recommendations
  console.log('\n💡 OPTIMIZATION OPPORTUNITIES:');

  if (starImports > 0) {
    console.log(
      `❌ Found ${starImports} star imports - these prevent tree shaking`,
    );
    if (importPatterns.star.length <= 5) {
      console.log('   Examples:');
      importPatterns.star.slice(0, 5).forEach(item => {
        console.log(`   📄 ${item.file}: ${item.import}`);
      });
    }
  }

  if (namedImports > granularImports) {
    console.log(
      `⚠️  More mixed imports (${namedImports}) than granular (${granularImports})`,
    );
    console.log(
      '   Consider using granular imports like "@selfxyz/common/constants"',
    );
  }

  if (granularImports > 0) {
    console.log(`✅ Good: ${granularImports} granular imports found`);
  }

  // Calculate tree shaking score
  const totalImports = starImports + namedImports + granularImports;
  let score = 0;
  if (totalImports > 0) {
    score =
      ((granularImports * 100 + namedImports * 50) / (totalImports * 100)) *
      100;
    console.log(`\n📊 Tree Shaking Score: ${score.toFixed(1)}%`);

    if (score < 50) {
      console.log('🔴 Poor - Many star imports detected');
    } else if (score < 80) {
      console.log('🟡 Good - Mix of import patterns');
    } else {
      console.log('🟢 Excellent - Mostly granular imports');
    }
  }

  // Show detailed conversion opportunities
  if (fileConversionOpportunities.length > 0) {
    console.log('\n🎯 CONVERSION OPPORTUNITIES BY IMPACT:');
    console.log('=====================================');

    // Group files by opportunity type
    const opportunityGroups = {
      highImpact: fileConversionOpportunities.filter(
        f => f.imports.length >= 2,
      ),
      constantsOnly: fileConversionOpportunities.filter(
        f =>
          f.conversionOpportunities.some(opp => opp.category === 'constants') &&
          f.conversionOpportunities.length === 1,
      ),
      utilsOnly: fileConversionOpportunities.filter(
        f =>
          f.conversionOpportunities.some(opp => opp.category === 'utils') &&
          f.conversionOpportunities.length === 1,
      ),
      typesOnly: fileConversionOpportunities.filter(
        f =>
          f.conversionOpportunities.some(opp => opp.category === 'types') &&
          f.conversionOpportunities.length === 1,
      ),
      mixedCategories: fileConversionOpportunities.filter(
        f => f.conversionOpportunities.length > 1,
      ),
      needsAnalysis: fileConversionOpportunities.filter(
        f => f.conversionOpportunities.length === 0,
      ),
    };

    // Show High Impact Opportunities (multiple imports)
    if (opportunityGroups.highImpact.length > 0) {
      console.log(
        '\n🚀 HIGH IMPACT OPPORTUNITIES (Multiple imports per file):',
      );
      opportunityGroups.highImpact
        .sort((a, b) => b.imports.length - a.imports.length)
        .forEach((fileInfo, index) => {
          console.log(
            `\n${index + 1}. 📄 ${fileInfo.file} (${fileInfo.imports.length} imports)`,
          );

          fileInfo.imports
            .filter(imp => imp.type === 'mixed')
            .forEach(imp => {
              console.log(`   ⚠️  ${imp.import}`);
            });

          if (fileInfo.conversionOpportunities.length > 0) {
            console.log('   ✅ Convert to:');
            fileInfo.conversionOpportunities.forEach(suggestion => {
              console.log(`      ${suggestion.suggestion}`);
            });
          }

          const estimatedImprovement = fileInfo.imports.length * 2.5;
          console.log(
            `   📈 Estimated score improvement: +${estimatedImprovement.toFixed(1)}%`,
          );
        });
    }

    // Show by Category for easier batch conversion
    if (opportunityGroups.constantsOnly.length > 0) {
      console.log('\n🔧 CONSTANTS CONVERSION OPPORTUNITIES:');
      console.log('   (Convert these together for consistency)');
      opportunityGroups.constantsOnly.forEach(fileInfo => {
        const suggestion = fileInfo.conversionOpportunities.find(
          opp => opp.category === 'constants',
        );
        console.log(`   📄 ${fileInfo.file}`);
        console.log(`      ${suggestion.suggestion}`);
      });
    }

    if (opportunityGroups.utilsOnly.length > 0) {
      console.log('\n⚙️  UTILS CONVERSION OPPORTUNITIES:');
      console.log('   (Convert these together for consistency)');
      opportunityGroups.utilsOnly.forEach(fileInfo => {
        const suggestion = fileInfo.conversionOpportunities.find(
          opp => opp.category === 'utils',
        );
        console.log(`   📄 ${fileInfo.file}`);
        console.log(`      ${suggestion.suggestion}`);
      });
    }

    if (opportunityGroups.typesOnly.length > 0) {
      console.log('\n🏷️  TYPES CONVERSION OPPORTUNITIES:');
      console.log('   (Convert these together for consistency)');
      opportunityGroups.typesOnly.forEach(fileInfo => {
        const suggestion = fileInfo.conversionOpportunities.find(
          opp => opp.category === 'types',
        );
        console.log(`   📄 ${fileInfo.file}`);
        console.log(`      ${suggestion.suggestion}`);
      });
    }

    if (opportunityGroups.mixedCategories.length > 0) {
      console.log('\n🔀 MIXED CATEGORY OPPORTUNITIES:');
      console.log('   (Files importing from multiple categories)');
      opportunityGroups.mixedCategories.forEach(fileInfo => {
        console.log(`   📄 ${fileInfo.file}`);
        fileInfo.conversionOpportunities.forEach(suggestion => {
          console.log(`      ${suggestion.suggestion}`);
        });
      });
    }

    if (opportunityGroups.needsAnalysis.length > 0) {
      console.log('\n❓ NEEDS MANUAL ANALYSIS:');
      console.log('   (Imports not automatically categorized)');
      opportunityGroups.needsAnalysis.forEach(fileInfo => {
        console.log(`   📄 ${fileInfo.file}`);
        fileInfo.imports
          .filter(imp => imp.type === 'mixed')
          .forEach(imp => {
            console.log(`      ${imp.import}`);
          });
      });
    }

    // Summary stats
    console.log('\n📈 CONVERSION SUMMARY:');
    console.log(
      `🚀 High Impact: ${opportunityGroups.highImpact.length} files (multiple imports each)`,
    );
    console.log(
      `🔧 Constants Only: ${opportunityGroups.constantsOnly.length} files`,
    );
    console.log(`⚙️  Utils Only: ${opportunityGroups.utilsOnly.length} files`);
    console.log(`🏷️  Types Only: ${opportunityGroups.typesOnly.length} files`);
    console.log(
      `🔀 Mixed Categories: ${opportunityGroups.mixedCategories.length} files`,
    );
    console.log(
      `❓ Needs Analysis: ${opportunityGroups.needsAnalysis.length} files`,
    );

    const potentialScoreImprovement = Math.min(
      95,
      score +
        opportunityGroups.highImpact.length * 5 +
        fileConversionOpportunities.length * 2,
    );
    console.log(
      `🎯 Potential score after conversion: ~${potentialScoreImprovement.toFixed(1)}%`,
    );

    console.log('\n💡 RECOMMENDED CONVERSION ORDER:');
    console.log('1. Start with HIGH IMPACT files (biggest score improvement)');
    console.log('2. Batch convert by category (constants → utils → types)');
    console.log('3. Handle mixed categories individually');
    console.log('4. Manually analyze remaining files');
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🌳 Tree Shaking Bundle Analysis');
  console.log('==============================');

  switch (command) {
    case 'android':
    case 'ios':
      analyzeReactNativeBundle(command);
      break;
    case 'imports':
      compareImportPatterns();
      break;
    case 'all':
    default:
      compareImportPatterns();
      break;
  }

  if (!command || command === 'all') {
    console.log('\n🚀 NEXT STEPS:');
    console.log(
      '1. Run "pnpm test:tree-shaking" to test different import patterns',
    );
    console.log(
      '2. Run "pnpm analyze:tree-shaking android" for mobile bundle analysis',
    );
    console.log(
      '3. Check the generated reports for optimization opportunities',
    );
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzeReactNativeBundle,
  compareImportPatterns,
};
