#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';

// Core development tools
const coreDevPackages = [
  '@types/node',
  'typescript',
  'eslint',
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/parser',
  'prettier',
  'tsup',
  'ts-node',
  'ts-mocha',
  'jest',
  'mocha',
  'chai',
  'vitest',
];

// Common type packages
const typePackages = [
  '@types/jest',
  '@types/mocha',
  '@types/chai',
  '@types/node-forge',
  '@types/circomlibjs',
  '@types/snarkjs',
  '@types/js-sha1',
  '@types/chai-as-promised',
  '@types/expect',
  '@types/uuid',
  '@types/react',
  '@types/react-dom',
  '@types/react-native',
  '@types/react-native-dotenv',
  '@types/react-native-sqlite-storage',
  '@types/react-native-web',
  '@types/react-test-renderer',
  '@types/add',
  '@types/elliptic',
  '@types/react-native-sqlite-storage',
];

// ESLint plugins and configs
const eslintPackages = [
  'eslint-config-prettier',
  'eslint-plugin-import',
  'eslint-plugin-prettier',
  'eslint-plugin-simple-import-sort',
  'eslint-plugin-sort-exports',
  'eslint-plugin-jest',
  'eslint-plugin-header',
  'eslint-import-resolver-typescript',
];

// Core blockchain/crypto packages
const cryptoPackages = [
  'ethers',
  'node-forge',
  'poseidon-lite',
  'snarkjs',
  'js-sha1',
  'js-sha256',
  'js-sha512',
  'uuid',
  'axios',
  'chai-as-promised',
  'circomlibjs',
  'ts-loader',
  'typechain',
  '@typechain/ethers-v6',
  '@typechain/hardhat',
];

// React Native ecosystem
const reactNativePackages = [
  'react',
  'react-dom',
  'react-native',
  '@react-native-async-storage/async-storage',
  '@react-native-clipboard/clipboard',
  '@react-native-community/netinfo',
  '@react-native-firebase/app',
  '@react-native-firebase/messaging',
  '@react-native-firebase/remote-config',
  '@react-native-community/cli',
  '@react-native/babel-preset',
  '@react-native/eslint-config',
  '@react-native/gradle-plugin',
  '@react-native/metro-config',
  '@react-native/typescript-config',
  '@testing-library/react-hooks',
  '@testing-library/react-native',
];

// UI Framework (Tamagui)
const tamaguiPackages = [
  '@tamagui/animations-css',
  '@tamagui/animations-react-native',
  '@tamagui/config',
  '@tamagui/lucide-icons',
  '@tamagui/toast',
  '@tamagui/vite-plugin',
  '@tamagui/types',
];

// ZK/Crypto ecosystem
const zkPackages = [
  '@openpassport/zk-kit-imt',
  '@openpassport/zk-kit-lean-imt',
  '@openpassport/zk-kit-smt',
  '@openpassport/zk-email-circuits',
  '@zk-email/circuits',
  '@zk-email/helpers',
  '@zk-email/zk-regex-circom',
  '@zk-kit/binary-merkle-root.circom',
  '@zk-kit/circuits',
  '@zk-kit/imt',
  '@zk-kit/imt.sol',
  '@zk-kit/lean-imt',
  '@noble/curves',
  '@noble/hashes',
];

// Hardhat/Solidity ecosystem
const hardhatPackages = [
  '@nomicfoundation/hardhat-chai-matchers',
  '@nomicfoundation/hardhat-ethers',
  '@nomicfoundation/hardhat-ignition',
  '@nomicfoundation/hardhat-ignition-ethers',
  '@nomicfoundation/hardhat-network-helpers',
  '@nomicfoundation/hardhat-toolbox',
  '@nomicfoundation/hardhat-verify',
  '@nomicfoundation/ignition-core',
  'hardhat',
  'hardhat-gas-reporter',
  'prettier-plugin-solidity',
  'solidity-coverage',
];

// Build tools
const buildPackages = [
  '@babel/core',
  '@babel/runtime',
  '@babel/plugin-transform-private-methods',
  '@vitejs/plugin-react-swc',
  '@size-limit/preset-big-lib',
  '@yarnpkg/sdks',
  '@tsconfig/react-native',
  'tsup',
  'vite',
  'rollup-plugin-visualizer',
  'ts-morph',
];

// Combine all packages
const packagesToCheck = [
  ...coreDevPackages,
  ...typePackages,
  ...eslintPackages,
  ...cryptoPackages,
  ...reactNativePackages,
  ...tamaguiPackages,
  ...zkPackages,
  ...hardhatPackages,
  ...buildPackages,
];

// Metadata fields to check for consistency
const metadataFields = [
  'license',
  'author',
  'type',
  'private',
  'sideEffects',
  'publishConfig',
];

// Common script patterns to check
const scriptPatterns = [
  'build',
  'build:types',
  'build:watch',
  'format',
  'lint',
  'lint:imports',
  'test',
  'types',
  'prepublishOnly',
  'publish',
];

// Export fields to check
const exportFields = ['exports', 'main', 'module', 'types', 'files'];

// Maps for tracking versions
const depVersions = new Map();
const pmVersions = new Map();
const workflowVersions = new Map();
const engineVersions = new Map();
const tsConfigVersions = new Map();
const metadataVersions = new Map();
const scriptVersions = new Map();
const exportVersions = new Map();
const workspaceVersions = new Map();

function record(map, key, version, filePath) {
  if (!version) return;
  if (!map.has(key)) map.set(key, new Map());
  const versions = map.get(key);
  if (!versions.has(version)) versions.set(version, []);
  versions.get(version).push(filePath);
}

function collectMetadata(data, pkgPath) {
  for (const field of metadataFields) {
    const value = data[field];
    if (value !== undefined) {
      record(metadataVersions, field, JSON.stringify(value), pkgPath);
    }
  }
}

function collectScripts(data, pkgPath) {
  if (!data.scripts) return;

  for (const pattern of scriptPatterns) {
    const script = data.scripts[pattern];
    if (script) {
      record(scriptVersions, pattern, script, pkgPath);
    }
  }
}

function collectExports(data, pkgPath) {
  for (const field of exportFields) {
    const value = data[field];
    if (value !== undefined) {
      record(exportVersions, field, JSON.stringify(value), pkgPath);
    }
  }
}

function collectWorkspaceDeps(data, pkgPath) {
  const allDeps = {
    ...data.dependencies,
    ...data.devDependencies,
    ...data.peerDependencies,
  };

  for (const [dep, version] of Object.entries(allDeps || {})) {
    if (dep.startsWith('@selfxyz/') && version.startsWith('workspace:')) {
      record(workspaceVersions, dep, version, pkgPath);
    }
  }
}

async function collect(pkgPath) {
  const data = JSON.parse(await fs.readFile(pkgPath, 'utf8'));

  // Check all dependency types
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

  // Collect metadata, scripts, exports, and workspace deps
  collectMetadata(data, pkgPath);
  collectScripts(data, pkgPath);
  collectExports(data, pkgPath);
  collectWorkspaceDeps(data, pkgPath);
}

async function checkTsConfig(dir) {
  const tsConfigPath = path.join(dir, 'tsconfig.json');
  try {
    const data = JSON.parse(await fs.readFile(tsConfigPath, 'utf8'));
    if (data.extends) {
      record(tsConfigVersions, 'tsconfig.extends', data.extends, tsConfigPath);
    }
    if (data.compilerOptions?.target) {
      record(
        tsConfigVersions,
        'tsconfig.target',
        data.compilerOptions.target,
        tsConfigPath,
      );
    }
    if (data.compilerOptions?.module) {
      record(
        tsConfigVersions,
        'tsconfig.module',
        data.compilerOptions.module,
        tsConfigPath,
      );
    }
  } catch (err) {
    // No tsconfig.json or invalid JSON
  }
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
      await checkTsConfig(path.dirname(fullPath));
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

    // Check for NODE_VERSION env var
    const envMatch = content.match(/NODE_VERSION:\s*([^\n]+)/);
    const envVersion = envMatch
      ? envMatch[1].trim().replace(/['"]/g, '')
      : null;

    // Check for node-version in setup-node action
    const setupNodeMatch = content.match(/node-version:\s*([^\n]+)/g);
    if (setupNodeMatch) {
      for (const match of setupNodeMatch) {
        let version = match
          .replace(/node-version:\s*/, '')
          .trim()
          .replace(/['"]/g, '');
        if (version.includes('${{') && envVersion) {
          version = envVersion;
        }
        record(workflowVersions, 'workflow node-version', version, fullPath);
      }
    }

    // Check for yarn version in corepack
    const yarnMatch = content.match(/yarn@([\d.]+)/);
    if (yarnMatch) {
      record(workflowVersions, 'workflow yarn-version', yarnMatch[1], fullPath);
    }

    // Check for Ruby version
    const rubyMatch = content.match(/RUBY_VERSION:\s*([^\n]+)/);
    if (rubyMatch) {
      record(
        workflowVersions,
        'workflow ruby-version',
        rubyMatch[1].trim().replace(/['"]/g, ''),
        fullPath,
      );
    }

    // Check for Java version
    const javaMatch = content.match(/JAVA_VERSION:\s*([^\n]+)/);
    if (javaMatch) {
      record(
        workflowVersions,
        'workflow java-version',
        javaMatch[1].trim().replace(/['"]/g, ''),
        fullPath,
      );
    }
  }
}

await walk(process.cwd());
await scanWorkflows();

function report(map, title) {
  let mismatch = false;
  for (const [name, versions] of map.entries()) {
    if (versions.size <= 1) continue;
    mismatch = true;
    console.log(`\n${title} - ${name} mismatches:`);
    for (const [v, files] of versions) {
      console.log(`  ${v}: ${files.join(', ')}`);
    }
  }
  return mismatch;
}

const hasDepMismatch = report(depVersions, 'Dependencies');
const hasPmMismatch = report(pmVersions, 'Package Manager');
const hasWorkflowMismatch = report(workflowVersions, 'Workflows');
const hasEngineMismatch = report(engineVersions, 'Node Engine');
const hasTsConfigMismatch = report(tsConfigVersions, 'TypeScript Config');
const hasMetadataMismatch = report(metadataVersions, 'Package Metadata');
const hasScriptMismatch = report(scriptVersions, 'Scripts');
const hasExportMismatch = report(exportVersions, 'Exports');
const hasWorkspaceMismatch = report(
  workspaceVersions,
  'Workspace Dependencies',
);

// Additional validation
let hasValidationError = false;

// Check that workflow Node.js versions match engine requirements
const engineNodeVersions = engineVersions.get('engines.node');
if (engineNodeVersions && engineNodeVersions.size > 0) {
  const expectedNodeVersion = Array.from(engineNodeVersions.keys())[0];
  const workflowNodeVersions = workflowVersions.get('workflow node-version');
  if (workflowNodeVersions) {
    for (const [version, files] of workflowNodeVersions) {
      if (!version.includes(expectedNodeVersion)) {
        console.log(`\nWorkflow Node.js version mismatch:`);
        console.log(`  Expected: ${expectedNodeVersion} (from engines.node)`);
        console.log(`  Found: ${version} in ${files.join(', ')}`);
        hasValidationError = true;
      }
    }
  }
}

// Check that all @selfxyz packages have consistent license
const licenseVersions = metadataVersions.get('license');
if (licenseVersions && licenseVersions.size > 1) {
  console.log(`\nLicense inconsistency detected across @selfxyz packages:`);
  for (const [license, files] of licenseVersions) {
    const selfxyzFiles = files.filter(
      f => f.includes('@selfxyz') || f.includes('selfxyz'),
    );
    if (selfxyzFiles.length > 0) {
      console.log(`  ${license}: ${selfxyzFiles.join(', ')}`);
    }
  }
}

// Check for critical package version mismatches
const criticalPackages = ['ethers', 'node-forge', 'poseidon-lite', 'snarkjs'];
for (const pkg of criticalPackages) {
  const versions = depVersions.get(pkg);
  if (versions && versions.size > 1) {
    console.log(
      `\n⚠️  CRITICAL: ${pkg} has multiple versions across packages:`,
    );
    for (const [version, files] of versions) {
      console.log(`  ${version}: ${files.join(', ')}`);
    }
    hasValidationError = true;
  }
}

// Summary
console.log('\n' + '='.repeat(80));
console.log('PACKAGE VERSION CONSISTENCY CHECK SUMMARY');
console.log('='.repeat(80));

const totalIssues = [
  hasDepMismatch,
  hasPmMismatch,
  hasWorkflowMismatch,
  hasEngineMismatch,
  hasTsConfigMismatch,
  hasMetadataMismatch,
  hasScriptMismatch,
  hasExportMismatch,
  hasWorkspaceMismatch,
  hasValidationError,
].filter(Boolean).length;

if (totalIssues === 0) {
  console.log('✅ All package versions are consistent across the monorepo!');
} else {
  console.log(`❌ Found ${totalIssues} category(ies) with version mismatches`);
  console.log('\nRecommendations:');
  console.log(
    '1. Standardize critical package versions (ethers, node-forge, poseidon-lite, snarkjs)',
  );
  console.log(
    '2. Align workflow Node.js versions with package.json engine requirements',
  );
  console.log(
    '3. Ensure consistent license and metadata across @selfxyz packages',
  );
  console.log('4. Standardize script patterns and export configurations');
}

process.exit(totalIssues > 0 ? 1 : 0);
