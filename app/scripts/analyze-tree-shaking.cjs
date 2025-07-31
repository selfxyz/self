#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

function analyzeWebBundle() {
  console.log('🕸️  Analyzing Web Bundle for Tree Shaking');
  console.log('=========================================');

  const distDir = path.join(__dirname, '..', 'dist');

  if (!fs.existsSync(distDir)) {
    console.log('❌ Web build not found. Run "yarn web:build" first.');
    return;
  }

  // Analyze chunk sizes
  const files = fs.readdirSync(distDir).filter(f => f.endsWith('.js'));

  console.log('\n📦 JavaScript Chunks:');
  let totalSize = 0;

  files.forEach(file => {
    const filePath = path.join(distDir, file);
    const size = fs.statSync(filePath).size;
    totalSize += size;

    // Categorize chunks
    let category = '📄';
    if (file.includes('vendor-')) category = '📚';
    if (file.includes('screens-')) category = '🖥️ ';
    if (file.includes('index')) category = '🏠';

    console.log(`${category} ${file.padEnd(40)} ${formatBytes(size)}`);
  });

  console.log(`\n📊 Total JavaScript: ${formatBytes(totalSize)}`);

  // Check for source maps (indicates tree shaking info)
  const sourceMaps = files.filter(f => f.endsWith('.map'));
  if (sourceMaps.length > 0) {
    console.log(`📍 Source maps available: ${sourceMaps.length} files`);
  }

  // Analyze vendor chunks for common imports
  const vendorChunks = files.filter(f => f.includes('vendor-'));
  if (vendorChunks.length > 0) {
    console.log('\n🔍 Vendor Chunk Analysis:');
    vendorChunks.forEach(chunk => {
      const size = fs.statSync(path.join(distDir, chunk)).size;
      console.log(`   ${chunk}: ${formatBytes(size)}`);
    });
  }

  // Look for @selfxyz/common usage patterns
  console.log('\n🌳 Tree Shaking Indicators:');

  try {
    // Check if chunks are split (good for tree shaking)
    const chunkCount = files.filter(f => !f.includes('vendor-')).length;
    if (chunkCount > 1) {
      console.log('✅ Code splitting enabled - helps with tree shaking');
    }

    // Check for multiple vendor chunks (indicates good chunking strategy)
    if (vendorChunks.length > 3) {
      console.log('✅ Multiple vendor chunks - good separation of concerns');
    }

    // Size-based heuristics
    if (totalSize < 2 * 1024 * 1024) {
      // Less than 2MB
      console.log(
        '✅ Reasonable total bundle size - tree shaking likely working',
      );
    } else {
      console.log('⚠️  Large bundle size - check for unused imports');
    }
  } catch (error) {
    console.log('❌ Could not analyze bundle details:', error.message);
  }
}

function analyzeReactNativeBundle(platform) {
  console.log(`📱 Analyzing React Native Bundle (${platform})`);
  console.log('============================================');

  // Use existing bundle analysis but with tree shaking focus
  const bundleAnalyzeScript = path.join(__dirname, 'bundle-analyze-ci.cjs');

  try {
    console.log('🔨 Running bundle analysis...');
    execSync(`node ${bundleAnalyzeScript} ${platform}`, {
      stdio: 'inherit',
    });

    // Additional tree shaking specific analysis
    const tmpDir = path.join(
      require('os').tmpdir(),
      'react-native-bundle-visualizer',
    );
    const reportPath = path.join(
      tmpDir,
      'OpenPassport',
      'output',
      'explorer.html',
    );

    if (fs.existsSync(reportPath)) {
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

function compareImportPatterns() {
  console.log('\n🔬 Import Pattern Analysis');
  console.log('==========================');

  const srcDir = path.join(__dirname, '..', 'src');

  if (!fs.existsSync(srcDir)) {
    console.log('❌ Source directory not found');
    return;
  }

  // Find TypeScript/JavaScript files
  const findFiles = (dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) => {
    const files = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
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

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    totalFiles++;

    // Check for @selfxyz/common imports
    const commonImportRegex = /import.*from\s+['"]@selfxyz\/common[^'"]*['"]/g;
    const matches = content.match(commonImportRegex) || [];

    if (matches.length > 0) {
      filesWithCommonImports++;

      matches.forEach(match => {
        if (match.includes('* as')) {
          starImports++;
          importPatterns.star.push({
            file: path.relative(srcDir, file),
            import: match.trim(),
          });
        } else if (
          match.includes('/constants') ||
          match.includes('/utils') ||
          match.includes('/types')
        ) {
          granularImports++;
          importPatterns.granular.push({
            file: path.relative(srcDir, file),
            import: match.trim(),
          });
        } else {
          namedImports++;
          importPatterns.mixed.push({
            file: path.relative(srcDir, file),
            import: match.trim(),
          });
        }
      });
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
  if (totalImports > 0) {
    const score = (
      ((granularImports * 100 + namedImports * 50) / (totalImports * 100)) *
      100
    ).toFixed(1);
    console.log(`\n📊 Tree Shaking Score: ${score}%`);

    if (score < 50) {
      console.log('🔴 Poor - Many star imports detected');
    } else if (score < 80) {
      console.log('🟡 Good - Mix of import patterns');
    } else {
      console.log('🟢 Excellent - Mostly granular imports');
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🌳 Tree Shaking Bundle Analysis');
  console.log('==============================');

  switch (command) {
    case 'web':
      analyzeWebBundle();
      break;
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
      console.log('\n');
      analyzeWebBundle();
      break;
  }

  if (!command || command === 'all') {
    console.log('\n🚀 NEXT STEPS:');
    console.log(
      '1. Run "yarn test:tree-shaking" to test different import patterns',
    );
    console.log(
      '2. Run "yarn analyze:tree-shaking android" for mobile bundle analysis',
    );
    console.log(
      '3. Run "yarn analyze:tree-shaking web" after "yarn web:build"',
    );
    console.log(
      '4. Check the generated reports for optimization opportunities',
    );
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzeWebBundle,
  analyzeReactNativeBundle,
  compareImportPatterns,
};
