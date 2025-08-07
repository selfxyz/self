#!/usr/bin/env node

/**
 * Comprehensive Export Validation - Check for missing exports and validate package.json configuration
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define paths
const BUILD_DIR = join(__dirname, '..', 'dist', 'esm');
const PACKAGE_JSON_PATH = join(__dirname, '..', 'package.json');

console.log('🔍 Comprehensive Export Validation...\n');

// Performance tracking
const startTime = Date.now();
let totalExports = 0;
let validExports = 0;
let missingExports = 0;
let invalidExports = 0;

// Load package.json exports configuration
function loadPackageExports() {
  try {
    const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8'));
    return packageJson.exports || {};
  } catch (error) {
    console.error('❌ Failed to load package.json:', error.message);
    return {};
  }
}

// Get all available modules from build directory
function getAvailableModules() {
  const modules = new Set();

  function scanDirectory(dirPath, prefix = '') {
    const fullPath = join(BUILD_DIR, dirPath);
    if (!existsSync(fullPath)) return;

    const items = readdirSync(fullPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = prefix ? `${prefix}/${item.name}` : item.name;

      if (item.isDirectory()) {
        scanDirectory(`${dirPath}/${item.name}`, itemPath);
      } else if (item.name.endsWith('.js')) {
        const modulePath = itemPath.replace('.js', '');
        modules.add(modulePath);
      }
    }
  }

  scanDirectory('src');
  return Array.from(modules);
}

// Validate package.json exports against available modules
function validatePackageExports() {
  console.log('✅ Validating Package.json Exports Configuration...');

  const packageExports = loadPackageExports();
  const availableModules = getAvailableModules();

  const exportPaths = Object.keys(packageExports).filter(
    (key) =>
      key.startsWith('./utils/') || key.startsWith('./constants/') || key.startsWith('./types/')
  );

  console.log(`   Found ${exportPaths.length} configured exports`);
  console.log(`   Found ${availableModules.length} available modules`);

  for (const exportPath of exportPaths) {
    totalExports++;
    const cleanPath = exportPath.replace('./', '').replace('/index', '');

    // Check if the module exists
    const moduleExists = availableModules.some(
      (module) => module.includes(cleanPath) || cleanPath.includes(module)
    );

    if (moduleExists) {
      console.log(`   ✅ ${exportPath}`);
      validExports++;
    } else {
      console.log(`   ❌ ${exportPath} (module not found)`);
      missingExports++;
    }
  }
}

// Check for modules that should be exported but aren't
function findMissingExports() {
  console.log('\n✅ Checking for Missing Exports...');

  const packageExports = loadPackageExports();
  const availableModules = getAvailableModules();

  const exportPaths = Object.keys(packageExports).filter(
    (key) =>
      key.startsWith('./utils/') || key.startsWith('./constants/') || key.startsWith('./types/')
  );

  const configuredModules = new Set(
    exportPaths.map((path) => path.replace('./', '').replace('/index', ''))
  );

  const missingModules = availableModules.filter((module) => {
    // Skip internal modules that shouldn't be exported
    if (module.includes('internal') || module.includes('private')) {
      return false;
    }

    // Check if this module should be exported
    const shouldBeExported =
      module.startsWith('src/utils/') ||
      module.startsWith('src/constants/') ||
      module.startsWith('src/types/');

    if (!shouldBeExported) return false;

    // Check if it's already configured
    const cleanModule = module.replace('src/', '');
    return !configuredModules.has(cleanModule);
  });

  if (missingModules.length > 0) {
    console.log(`   Found ${missingModules.length} modules that could be exported:`);
    missingModules.forEach((module) => {
      console.log(`   📝 ${module.replace('src/', './')}`);
    });
  } else {
    console.log('   ✅ All relevant modules are properly exported');
  }
}

// Generate export suggestions
function generateExportSuggestions() {
  console.log('\n💡 Export Configuration Suggestions:');
  console.log('   • Consider adding granular exports for frequently used utilities');
  console.log('   • Ensure all public APIs are properly exported');
  console.log('   • Use consistent naming patterns for export paths');
  console.log('   • Consider adding JSDoc comments for better documentation');
}

async function runValidation() {
  try {
    // Verify build directory exists
    if (!existsSync(BUILD_DIR)) {
      console.error(`❌ Build directory not found: ${BUILD_DIR}`);
      console.error(
        '   Please run the build process first (e.g., "npm run build" or "yarn build")'
      );
      process.exit(1);
    }

    console.log(`✅ Build directory verified: ${BUILD_DIR}\n`);

    // Run validations
    validatePackageExports();
    findMissingExports();
    generateExportSuggestions();

    // Performance metrics
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('\n📊 Validation Results:');
    console.log(`   Total Exports Checked: ${totalExports}`);
    console.log(`   Valid Exports: ${validExports} ✅`);
    console.log(`   Missing Exports: ${missingExports} ❌`);
    console.log(`   Invalid Exports: ${invalidExports} ⚠️`);
    console.log(
      `   Success Rate: ${totalExports > 0 ? ((validExports / totalExports) * 100).toFixed(1) : 0}%`
    );
    console.log(`   Duration: ${duration}ms`);

    if (missingExports === 0 && invalidExports === 0) {
      console.log('\n🎉 SUCCESS! All exports are properly configured!');
    } else {
      console.log(
        `\n⚠️  Found ${missingExports + invalidExports} issue(s) with exports configuration.`
      );
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during validation:', error.message);
    process.exit(1);
  }
}

runValidation();
