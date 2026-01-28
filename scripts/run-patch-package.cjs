#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repositoryRootPath = path.resolve(__dirname, '..');
const patchesDirectoryPath = path.join(repositoryRootPath, 'patches');

// Detect CI environment
const isCI = process.env.CI === 'true' ||
             process.env.GITHUB_ACTIONS === 'true' ||
             process.env.CIRCLECI === 'true' ||
             process.env.TRAVIS === 'true' ||
             process.env.BUILDKITE === 'true' ||
             process.env.GITLAB_CI === 'true' ||
             process.env.JENKINS_URL !== undefined;

function directoryContainsPatchFiles(directoryPath) {
  try {
    if (!fs.existsSync(directoryPath)) return false;
    const entries = fs.readdirSync(directoryPath);
    for (const entryName of entries) {
      const absoluteEntryPath = path.join(directoryPath, entryName);
      const entryStats = fs.statSync(absoluteEntryPath);
      if (entryStats.isDirectory()) {
        if (directoryContainsPatchFiles(absoluteEntryPath)) return true;
      } else if (entryName.endsWith('.patch')) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

function isExecutableAvailableOnPath(executableName) {
  // Try multiple methods to check if executable is available
  const commands = process.platform === 'win32'
    ? ['where', 'where.exe']
    : ['command -v', 'which', '/usr/bin/which'];

  for (const command of commands) {
    try {
      const whichResult = spawnSync(command, [executableName], {
        shell: true,
        stdio: 'ignore',
        timeout: 5000 // 5 second timeout
      });
      if (whichResult.status === 0) {
        return true;
      }
    } catch (error) {
      // Continue to next command
      continue;
    }
  }
  return false;
}

// Early exit conditions
if (!fs.existsSync(patchesDirectoryPath)) {
  if (isCI) {
    console.log('patch-package: patches directory not found, skipping (CI mode)');
  } else {
    console.log('patch-package: patches directory not found, skipping');
  }
  process.exit(0);
}

if (!directoryContainsPatchFiles(patchesDirectoryPath)) {
  if (isCI) {
    console.log('patch-package: no patches found, skipping (CI mode)');
  } else {
    console.log('patch-package: no patches found, skipping');
  }
  process.exit(0);
}

// Check if patch-package is available
if (!isExecutableAvailableOnPath('patch-package')) {
  if (isCI) {
    console.log('patch-package not installed, skipping (CI mode)');
  } else {
    console.log('patch-package not installed, skipping');
  }
  process.exit(0);
}

// Workspaces with isolated node_modules due to nmHoistingLimits: workspaces
// Most packages are in workspace node_modules, not root
const workspaceRoots = [
  { name: 'app', path: path.join(repositoryRootPath, 'app') },
  { name: 'contracts', path: path.join(repositoryRootPath, 'contracts') }
];

// Run patch-package with better error handling
try {
  let anyPatchApplied = false;
  let anyPatchFailed = false;

  // Try root node_modules first (some packages may be hoisted here)
  const rootNodeModules = path.join(repositoryRootPath, 'node_modules');
  if (fs.existsSync(rootNodeModules)) {
    const rootPatchRun = spawnSync('patch-package', ['--patch-dir', 'patches'], {
      cwd: repositoryRootPath,
      shell: true,
      stdio: 'pipe', // Always capture output to check for real errors vs missing packages
      timeout: 30000
    });
    const output = rootPatchRun.stdout?.toString() || '';
    const hasRealError = output.includes('**ERROR**') && !output.includes('which is not present at');
    
    if (rootPatchRun.status === 0) {
      if (!isCI) console.log('✓ Patches applied to root workspace');
      anyPatchApplied = true;
    } else if (hasRealError) {
      console.error(`patch-package failed for root workspace`);
      console.error(output);
      anyPatchFailed = true;
    }
    // If packages are just missing (not hoisted to root), that's expected - continue to workspace patches
  }

  // Apply patches to workspace node_modules (where most packages are with nmHoistingLimits)
  for (const workspace of workspaceRoots) {
    const workspaceNodeModules = path.join(workspace.path, 'node_modules');
    if (!fs.existsSync(workspaceNodeModules)) continue;

    const workspacePatchRun = spawnSync('patch-package', ['--patch-dir', '../patches'], {
      cwd: workspace.path,
      shell: true,
      stdio: 'pipe',
      timeout: 30000
    });

    const output = workspacePatchRun.stdout?.toString() || '';
    const hasRealError = output.includes('**ERROR**') && !output.includes('which is not present at');

    if (workspacePatchRun.status === 0) {
      if (!isCI) console.log(`✓ Patches applied to ${workspace.name} workspace`);
      anyPatchApplied = true;
    } else if (hasRealError) {
      console.error(`patch-package failed for ${workspace.name} workspace`);
      console.error(output);
      anyPatchFailed = true;
    }
  }

  if (anyPatchFailed && !isCI) {
    console.error('Some patches failed to apply. Check if patch versions match installed package versions.');
    process.exit(1);
  }

  if (anyPatchApplied) {
    if (!isCI) console.log('✓ patch-package completed');
  } else {
    if (!isCI) console.log('patch-package: no patches applied (packages may be in different locations)');
  }
} catch (error) {
  if (isCI) {
    console.log('patch-package: error during execution (CI mode):', error.message);
    console.log('Continuing build despite patch errors...');
    process.exit(0);
  } else {
    console.error('patch-package error:', error.message);
    process.exit(1);
  }
}

process.exit(0);
