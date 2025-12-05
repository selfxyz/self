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

// Run patch-package with better error handling
try {
  const rootPatchRun = spawnSync('patch-package', ['--patch-dir', 'patches'], {
    cwd: repositoryRootPath,
    shell: true,
    stdio: isCI ? 'pipe' : 'inherit',
    timeout: 30000
  });
  if (rootPatchRun.status === 0) {
    if (!isCI) console.log('✓ Patches applied to root workspace');
  } else {
    const errorOutput = rootPatchRun.stderr?.toString() || rootPatchRun.stdout?.toString() || '';
    console.error(`patch-package failed for root workspace (exit code ${rootPatchRun.status})`);
    if (errorOutput) console.error(errorOutput);
    if (!isCI) process.exit(1);
  }

  // Also patch app/node_modules if it exists
  // Workspaces with isolated node_modules due to limited hoisting
  const workspaceRoots = [
    { name: 'app', path: path.join(repositoryRootPath, 'app') },
    { name: 'contracts', path: path.join(repositoryRootPath, 'contracts') }
  ];

  for (const workspace of workspaceRoots) {
    const workspaceNodeModules = path.join(workspace.path, 'node_modules');
    if (!fs.existsSync(workspaceNodeModules)) continue;

    const workspacePatchRun = spawnSync('patch-package', ['--patch-dir', '../patches'], {
      cwd: workspace.path,
      shell: true,
      stdio: isCI ? 'pipe' : 'inherit',
      timeout: 30000
    });

    if (workspacePatchRun.status === 0) {
      if (!isCI) console.log(`✓ Patches applied to ${workspace.name} workspace`);
    } else {
      const errorOutput = workspacePatchRun.stderr?.toString() || workspacePatchRun.stdout?.toString() || '';
      console.error(`patch-package failed for ${workspace.name} workspace (exit code ${workspacePatchRun.status})`);
      if (errorOutput) console.error(errorOutput);
      if (!isCI) process.exit(1);
    }
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
