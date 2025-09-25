#!/usr/bin/env node

// Force CommonJS mode
// @ts-nocheck

// Comprehensive build validation for Angular SDK
const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Angular SDK Build...\n');

const distPath = path.join(__dirname, '../../dist/qrcode-angular');
const packageJson = JSON.parse(fs.readFileSync(path.join(distPath, 'package.json'), 'utf8'));

// Test 1: Build artifacts exist
const requiredFiles = [
  'index.d.ts',
  'public-api.d.ts',
  'package.json',
  'README.md',
  'fesm2022/selfxyz-qrcode-angular.mjs',
  'fesm2022/selfxyz-qrcode-angular.mjs.map',
  'esm2022/selfxyz-qrcode-angular.mjs',
  'lib/components/self-qrcode/self-qrcode.component.d.ts',
  'lib/components/led/led.component.d.ts',
  'lib/services/websocket.service.d.ts',
];

console.log('📁 Checking build artifacts...');
let missingFiles = [];
for (const file of requiredFiles) {
  const filePath = path.join(distPath, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} (MISSING)`);
    missingFiles.push(file);
  }
}

if (missingFiles.length > 0) {
  console.log(`\n❌ Missing ${missingFiles.length} required files!`);
  process.exit(1);
}

// Test 2: Package.json validation
console.log('\n📦 Validating package.json...');
const requiredFields = [
  'name',
  'version',
  'main',
  'module',
  'types',
  'exports',
  'peerDependencies',
];
for (const field of requiredFields) {
  if (packageJson[field]) {
    console.log(
      `  ✅ ${field}: ${typeof packageJson[field] === 'object' ? 'configured' : packageJson[field]}`
    );
  } else {
    console.log(`  ❌ ${field}: missing`);
    process.exit(1);
  }
}

// Test 3: Exports validation
console.log('\n🚀 Validating exports...');
const pkgExports = packageJson.exports;
if (pkgExports && pkgExports['.']) {
  const mainExport = pkgExports['.'];
  console.log(`  ✅ Main export types: ${mainExport.types}`);
  console.log(`  ✅ Main export default: ${mainExport.default}`);
  console.log(`  ✅ ESM2022 export: ${mainExport.esm2022}`);
} else {
  console.log('  ❌ Main export missing');
  process.exit(1);
}

// Test 4: Bundle size validation
console.log('\n📊 Checking bundle sizes...');
const mainBundle = path.join(distPath, 'fesm2022/selfxyz-qrcode-angular.mjs');
const bundleStats = fs.statSync(mainBundle);
const bundleSizeKB = bundleStats.size / 1024;

console.log(`  📦 Main bundle: ${bundleSizeKB.toFixed(2)}KB`);
if (bundleSizeKB > 100) {
  console.log('  ⚠️  Bundle size is quite large (>100KB)');
} else {
  console.log('  ✅ Bundle size is reasonable');
}

// Test 5: TypeScript definitions validation
console.log('\n🔧 Validating TypeScript definitions...');
const indexDts = fs.readFileSync(path.join(distPath, 'index.d.ts'), 'utf8');
const publicApiDts = fs.readFileSync(path.join(distPath, 'public-api.d.ts'), 'utf8');

if (indexDts.includes("export * from './public-api'")) {
  console.log('  ✅ Index.d.ts exports public API');
} else {
  console.log('  ❌ Index.d.ts missing public API export');
  process.exit(1);
}

const requiredExports = [
  'SelfQRcodeComponent',
  'SelfQRcodeWrapperComponent',
  'LedComponent',
  'WebSocketService',
  'SelfQRcodeAngularModule',
];

let missingExports = [];
for (const exportName of requiredExports) {
  if (publicApiDts.includes(exportName)) {
    console.log(`  ✅ ${exportName} exported`);
  } else {
    console.log(`  ❌ ${exportName} missing from exports`);
    missingExports.push(exportName);
  }
}

if (missingExports.length > 0) {
  console.log(`\n❌ Missing ${missingExports.length} required exports!`);
  process.exit(1);
}

// Test 6: Bundle content validation
console.log('\n🔍 Validating bundle content...');
const bundleContent = fs.readFileSync(mainBundle, 'utf8');

const requiredImports = [
  '@angular/core',
  '@angular/common',
  'angularx-qrcode',
  'rxjs',
  'socket.io-client',
  '@selfxyz/common',
];

for (const importName of requiredImports) {
  if (bundleContent.includes(importName)) {
    console.log(`  ✅ ${importName} imported`);
  } else {
    console.log(`  ❌ ${importName} missing from bundle`);
    process.exit(1);
  }
}

// Test 7: Peer dependencies validation
console.log('\n🔗 Validating peer dependencies...');
const peerDeps = packageJson.peerDependencies;
const expectedPeerDeps = {
  '@angular/core': '^18.0.0',
  '@angular/common': '^18.0.0',
  '@selfxyz/common': 'workspace:^',
  rxjs: '^7.8.0',
};

for (const [dep, version] of Object.entries(expectedPeerDeps)) {
  if (peerDeps[dep] === version) {
    console.log(`  ✅ ${dep}: ${version}`);
  } else {
    console.log(`  ❌ ${dep}: expected ${version}, got ${peerDeps[dep] || 'missing'}`);
    process.exit(1);
  }
}

console.log('\n🎉 All validations passed!');
console.log('\n📋 Build Summary:');
console.log(`  📦 Package: ${packageJson.name}@${packageJson.version}`);
console.log(`  📁 Output: ${distPath}`);
console.log(`  📊 Bundle size: ${bundleSizeKB.toFixed(2)}KB`);
console.log(`  🔧 TypeScript: Full definitions included`);
console.log(`  🚀 Exports: Properly configured`);
console.log(
  `  🔗 Dependencies: ${Object.keys(packageJson.dependencies || {}).length} runtime, ${Object.keys(peerDeps).length} peer`
);
console.log('\n✅ Angular SDK is ready for distribution!');
