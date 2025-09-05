#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repositoryRootPath = path.resolve(__dirname, '..');
const patchesDirectoryPath = path.join(repositoryRootPath, 'patches');

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
  const whichCommand = process.platform === 'win32' ? 'where' : 'command -v';
  const whichResult = spawnSync(whichCommand, [executableName], { shell: true, stdio: 'ignore' });
  return whichResult.status === 0;
}

if (!fs.existsSync(patchesDirectoryPath)) {
  console.log('patch-package: patches directory not found, skipping');
  process.exit(0);
}

if (!directoryContainsPatchFiles(patchesDirectoryPath)) {
  console.log('patch-package: no patches found, skipping');
  process.exit(0);
}

if (!isExecutableAvailableOnPath('patch-package')) {
  console.log('patch-package not installed, skipping');
  process.exit(0);
}

const patchRun = spawnSync('patch-package', { shell: true, stdio: 'inherit' });
if (patchRun.status !== 0) {
  process.exit(patchRun.status || 1);
}

process.exit(0);
