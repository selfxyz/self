#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';

// Critical packages that cause real problems
const criticalPackages = [
  'ethers',
  'node-forge',
  'poseidon-lite',
  'snarkjs',
  'react',
  'react-native',
  '@tamagui/config',
  '@tamagui/lucide-icons',
];

// Core development tools
const coreDevPackages = [
  'typescript',
  'eslint',
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/parser',
  'prettier',
  'tsup',
  'vitest',
];

// Common type packages
const typePackages = [
  '@types/node',
  '@types/jest',
  '@types/react',
  '@types/react-native',
];

// Core blockchain/crypto packages
const cryptoPackages = [
  'circomlibjs',
  '@noble/curves',
  '@noble/hashes',
  'elliptic',
  'js-sha1',
  'js-sha256',
  'js-sha512',
  'uuid',
];

// React Native ecosystem
const reactNativePackages = [
  '@react-native/babel-preset',
  '@react-native/eslint-config',
  '@react-native-async-storage/async-storage',
  '@react-native-clipboard/clipboard',
  '@react-native-community/netinfo',
  '@react-native-firebase/app',
  '@react-native-firebase/messaging',
  '@react-native-firebase/remote-config',
  '@react-native-community/cli',
  '@react-native/gradle-plugin',
  '@react-native/metro-config',
  '@react-native/typescript-config',
];

// Tamagui UI framework (should be version-synced)
const tamaguiPackages = [
  '@tamagui/animations-css',
  '@tamagui/animations-react-native',
  '@tamagui/toast',
  '@tamagui/vite-plugin',
  '@tamagui/types',
];

// Analytics & monitoring
const analyticsPackages = [
  '@sentry/react',
  '@sentry/react-native',
  '@segment/analytics-react-native',
  '@segment/sovran-react-native',
];

// Zero-knowledge proof ecosystem
const zkPackages = [
  '@openpassport/zk-kit-imt',
  '@openpassport/zk-kit-lean-imt',
  '@openpassport/zk-kit-smt',
  '@openpassport/zk-email-circuits',
  '@zk-email/circuits',
  '@zk-email/helpers',
  '@zk-email/zk-regex-circom',
  '@zk-kit/circuits',
  '@zk-kit/imt',
  '@zk-kit/imt.sol',
  '@zk-kit/lean-imt',
];

// Hardhat/Solidity development
const hardhatPackages = [
  'hardhat',
  '@nomicfoundation/hardhat-ethers',
  '@nomicfoundation/hardhat-chai-matchers',
  '@nomicfoundation/hardhat-ignition',
  '@nomicfoundation/hardhat-ignition-ethers',
  '@nomicfoundation/hardhat-network-helpers',
  '@nomicfoundation/hardhat-toolbox',
  '@nomicfoundation/hardhat-verify',
  '@nomicfoundation/ignition-core',
  '@typechain/ethers-v6',
  '@typechain/hardhat',
];

// Testing framework
const testingPackages = [
  '@testing-library/react-native',
  '@babel/core',
  '@babel/runtime',
  '@babel/plugin-transform-private-methods',
  'jest',
  'mocha',
  'chai',
];

// Build tools
const buildPackages = [
  'vite',
  'ts-mocha',
  'ts-node',
  'ts-loader',
  'tsconfig-paths',
  'typechain',
  'tsx',
];

// Combine all packages to check
const packagesToCheck = [
  ...criticalPackages,
  ...coreDevPackages,
  ...typePackages,
  ...cryptoPackages,
  ...reactNativePackages,
  ...tamaguiPackages,
  ...analyticsPackages,
  ...zkPackages,
  ...hardhatPackages,
  ...testingPackages,
  ...buildPackages,
];

// Maps for tracking versions
const depVersions = new Map();
const pmVersions = new Map();
const workflowVersions = new Map();
const engineVersions = new Map();

// Packages that are intentionally different for technical reasons
const intentionallyDifferentPackages = [];

function record(map, key, version, filePath) {
  if (!version) return;
  if (!map.has(key)) map.set(key, new Map());
  const versions = map.get(key);
  if (!versions.has(version)) versions.set(version, []);
  versions.get(version).push(filePath);
}

async function collect(pkgPath) {
  const data = JSON.parse(await fs.readFile(pkgPath, 'utf8'));

  // Check all dependencies
  for (const dep of packagesToCheck) {
    const version =
      data.dependencies?.[dep] ||
      data.devDependencies?.[dep] ||
      data.peerDependencies?.[dep];
    record(depVersions, dep, version, pkgPath);
  }

  // Check package manager and engines
  record(pmVersions, 'packageManager', data.packageManager, pkgPath);
  record(engineVersions, 'engines.node', data.engines?.node, pkgPath);
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
    } else if (entry.isFile() && entry.name === 'package.json') {
      await collect(fullPath);
    }
  }
}

async function scanWorkflows() {
  const wfDir = path.join(process.cwd(), '.github', 'workflows');
  let files;
  try {
    files = await fs.readdir(wfDir);
  } catch (err) {
    if (err.code === 'ENOENT') return; // No workflows directory
    throw err;
  }

  for (const file of files) {
    if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue;
    const fullPath = path.join(wfDir, file);
    const content = await fs.readFile(fullPath, 'utf8');

    // Check for node-version in setup-node action
    const setupNodeMatch = content.match(/node-version:\s*([^\n]+)/g);
    if (setupNodeMatch) {
      for (const match of setupNodeMatch) {
        let version = match
          .replace(/node-version:\s*/, '')
          .trim()
          .replace(/['"]/g, '');
        record(workflowVersions, 'workflow node-version', version, fullPath);
      }
    }
  }
}

await walk(process.cwd());
await scanWorkflows();

// Check for critical package version mismatches
let hasCriticalIssues = false;

for (const pkg of criticalPackages) {
  const versions = depVersions.get(pkg);
  if (versions && versions.size > 1) {
    if (!hasCriticalIssues) {
      console.log('🚨 CRITICAL VERSION MISMATCHES:');
      console.log(
        'These can cause build failures, security issues, or runtime errors:\n',
      );
    }
    hasCriticalIssues = true;
    console.log(`${pkg}:`);
    for (const [version, files] of versions) {
      const shortFiles = files.map(f =>
        f.replace(process.cwd(), '').replace('/package.json', ''),
      );
      console.log(`  ${version}: ${shortFiles.join(', ')}`);
    }
    console.log('');
  }
}

// Check workflow Node.js version mismatches
let hasWorkflowIssues = false;
const engineNodeVersions = engineVersions.get('engines.node');
if (engineNodeVersions && engineNodeVersions.size > 0) {
  const engineValues = [...engineNodeVersions.keys()].sort();
  // If multiple engines.node constraints exist across packages, report that first.
  if (engineValues.length > 1) {
    console.log('🚨 ENGINES.NODE MISMATCH:');
    console.log(
      'Different Node.js engine constraints found across packages:\n',
    );
    for (const v of engineValues) {
      const files = engineNodeVersions.get(v);
      const list = Array.isArray(files)
        ? files.slice().sort()
        : [...files].sort();
      const shortFiles = list.map(f =>
        f.replace(process.cwd(), '').replace('/package.json', ''),
      );
      console.log(`  ${v}: ${shortFiles.join(', ')}`);
    }
    console.log('');
    hasWorkflowIssues = true;
  }

  // Compare workflows against the first (sorted) engines.node as expected
  const expectedNodeVersion = engineValues[0];
  const workflowNodeVersions = workflowVersions.get('workflow node-version');
  if (workflowNodeVersions) {
    const mismatches = [...workflowNodeVersions.keys()]
      .filter(v => {
        const versionStr = String(v);
        // Skip dynamic versions like ${{ env.NODE_VERSION }} - these are set from .nvmrc
        if (
          versionStr.includes('${{') ||
          versionStr.includes('env.NODE_VERSION')
        ) {
          return false;
        }
        return !versionStr.includes(expectedNodeVersion);
      })
      .sort();
    if (mismatches.length) {
      console.log('🚨 WORKFLOW VERSION MISMATCH:');
      console.log('CI/CD may fail due to Node.js version mismatch:\n');
      console.log(`Expected: ${expectedNodeVersion} (from engines.node)`);
      for (const v of mismatches) {
        console.log(`Found: ${v} in workflows`);
      }
      console.log('');
      hasWorkflowIssues = true;
    }
  }
}

// Check packageManager mismatches
let hasPmIssues = false;
const pm = pmVersions.get('packageManager');
if (pm && pm.size > 1) {
  console.log('🚨 PACKAGE MANAGER VERSION MISMATCH:');
  console.log(
    'Yarn/PNPM/NPM versions should be consistent across the monorepo:\n',
  );
  for (const v of [...pm.keys()].sort()) {
    const files = pm.get(v);
    const list = Array.isArray(files)
      ? files.slice().sort()
      : [...files].sort();
    const shortFiles = list.map(f =>
      f.replace(process.cwd(), '').replace('/package.json', ''),
    );
    console.log(`  ${v}: ${shortFiles.join(', ')}`);
  }
  console.log('');
  hasPmIssues = true;
}

// Check for other package mismatches
let hasOtherIssues = false;
let hasIntentionalDifferences = intentionallyDifferentPackages.length > 0;
const categories = [
  { name: 'React Native', packages: reactNativePackages },
  { name: 'Tamagui UI', packages: tamaguiPackages },
  { name: 'Analytics', packages: analyticsPackages },
  { name: 'ZK Proofs', packages: zkPackages },
  { name: 'Hardhat', packages: hardhatPackages },
  { name: 'Testing', packages: testingPackages },
  { name: 'Build Tools', packages: buildPackages },
  { name: 'Core Dev', packages: coreDevPackages },
  { name: 'Types', packages: typePackages },
  { name: 'Crypto', packages: cryptoPackages },
];

for (const category of categories) {
  let categoryHasIssues = false;

  for (const pkg of category.packages) {
    if (criticalPackages.includes(pkg)) continue; // Skip critical packages, already shown above

    const versions = depVersions.get(pkg);
    if (versions && versions.size > 1) {
      if (!hasOtherIssues) {
        console.log('📦 OTHER VERSION MISMATCHES:');
        console.log('These should be standardized for consistency:\n');
      }
      if (!categoryHasIssues) {
        console.log(`${category.name}:`);
        categoryHasIssues = true;
      }
      hasOtherIssues = true;
      console.log(`  ${pkg}:`);
      for (const [version, files] of versions) {
        const shortFiles = files.map(f =>
          f.replace(process.cwd(), '').replace('/package.json', ''),
        );
        console.log(`    ${version}: ${shortFiles.join(', ')}`);
      }
    }
  }

  if (categoryHasIssues) {
    console.log('');
  }
}

// Summary
console.log('='.repeat(60));
console.log('PACKAGE VERSION CONSISTENCY CHECK SUMMARY');
console.log('='.repeat(60));

const totalIssues = [
  hasCriticalIssues,
  hasWorkflowIssues,
  hasPmIssues,
  hasOtherIssues,
].filter(Boolean).length;

if (totalIssues === 0) {
  console.log('✅ All package versions are consistent across the monorepo!');
} else {
  console.log(`❌ Found ${totalIssues} category(ies) with version mismatches`);

  // Show summary of mismatched packages
  console.log('\n📋 Mismatched Packages:');

  if (hasCriticalIssues) {
    console.log('  🚨 Critical:');
    for (const pkg of criticalPackages) {
      const versions = depVersions.get(pkg);
      if (versions && versions.size > 1) {
        const versionList = Array.from(versions.keys()).join(', ');
        console.log(`    • ${pkg}: ${versionList}`);
      }
    }
  }

  if (hasWorkflowIssues) {
    console.log('  🚨 Workflow:');
    console.log('    • Node.js version mismatch');
  }

  if (hasPmIssues) {
    console.log('  🚨 Package Manager:');
    console.log('    • Package manager version mismatch');
  }

  if (hasOtherIssues) {
    console.log('  📦 Other:');

    // Group by category for better readability
    const categories = [
      { name: 'React Native', packages: reactNativePackages },
      { name: 'Tamagui UI', packages: tamaguiPackages },
      { name: 'Analytics', packages: analyticsPackages },
      { name: 'ZK Proofs', packages: zkPackages },
      { name: 'Hardhat', packages: hardhatPackages },
      { name: 'Testing', packages: testingPackages },
      { name: 'Build Tools', packages: buildPackages },
      { name: 'Core Dev', packages: coreDevPackages },
      { name: 'Types', packages: typePackages },
      { name: 'Crypto', packages: cryptoPackages },
    ];

    for (const category of categories) {
      const mismatchedInCategory = category.packages.filter(pkg => {
        if (
          criticalPackages.includes(pkg) ||
          intentionallyDifferentPackages.includes(pkg)
        ) {
          return false; // Skip already reported packages
        }
        const versions = depVersions.get(pkg);
        return versions && versions.size > 1;
      });

      if (mismatchedInCategory.length > 0) {
        console.log(`    ${category.name}:`);
        for (const pkg of mismatchedInCategory) {
          const versions = depVersions.get(pkg);
          const versionList = Array.from(versions.keys()).join(', ');
          console.log(`      • ${pkg}: ${versionList}`);
        }
      }
    }
  }
}

// Only fail CI for critical issues that can break builds or security
const criticalIssues = [
  hasCriticalIssues,
  hasWorkflowIssues,
  hasPmIssues,
].filter(Boolean).length;

if (criticalIssues > 0) {
  console.log(
    `\n🚨 FAILING CI: Found ${criticalIssues} critical issue(s) that must be fixed.`,
  );
  process.exit(1);
} else if (hasOtherIssues || hasIntentionalDifferences) {
  let message = '⚠️  CI PASSING: ';
  const parts = [];
  if (hasOtherIssues) parts.push('non-critical version mismatches');
  if (hasIntentionalDifferences)
    parts.push('intentional technical differences');
  message += `Found ${parts.join(' and ')}.`;

  console.log(`\n${message}`);
  if (hasOtherIssues) {
    console.log(
      'Non-critical mismatches should be addressed but do not block development.',
    );
  }
  if (hasIntentionalDifferences) {
    console.log(
      'Intentional differences are acceptable for technical requirements.',
    );
  }
  process.exit(0);
} else {
  process.exit(0);
}
