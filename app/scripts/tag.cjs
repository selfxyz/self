#!/usr/bin/env node
// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { execSync } = require('child_process');
const { readFileSync } = require('fs');
const { join } = require('path');

// Get package version
function getVersion() {
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, '../package.json'), 'utf8'),
  );
  return packageJson.version;
}

// Check if working directory is clean
function isWorkingDirectoryClean() {
  try {
    const status = execSync('git status --porcelain').toString();
    return status.trim() === '';
  } catch (error) {
    console.error('Error checking git status:', error.message);
    return false;
  }
}

// Create an empty commit
function createEmptyCommit(version) {
  try {
    execSync(`git commit --allow-empty -m "chore: release v${version}"`);
    console.log(`Created empty commit for v${version}`);
  } catch (error) {
    console.error('Error creating commit:', error.message);
    process.exit(1);
  }
}

// Create git tag
function createTag(version) {
  try {
    execSync(`git tag v${version}`);
    console.log(`Created tag v${version}`);
  } catch (error) {
    console.error('Error creating tag:', error.message);
    process.exit(1);
  }
}

// Push tag to remote
function pushTag(version) {
  try {
    execSync(`git push origin v${version}`);
    console.log(`Pushed tag v${version} to remote`);
  } catch (error) {
    console.error('Error pushing tag:', error.message);
    process.exit(1);
  }
}

// Remove tag locally and from remote
function removeTag(version) {
  try {
    execSync(`git tag -d v${version}`);
    execSync(`git push origin :refs/tags/v${version}`);
    console.log(`Removed tag v${version}`);
  } catch (error) {
    console.error('Error removing tag:', error.message);
    process.exit(1);
  }
}

// Main function to handle commands
function main() {
  const command = process.argv[2];
  const version = getVersion();

  switch (command) {
    case 'commit':
      if (!isWorkingDirectoryClean()) {
        console.error(
          'Error: Working directory is not clean. Please commit or stash changes first.',
        );
        process.exit(1);
      }
      createEmptyCommit(version);
      break;

    case 'create':
      createTag(version);
      break;

    case 'push':
      pushTag(version);
      break;

    case 'remove':
      removeTag(version);
      break;

    case 'release':
      if (!isWorkingDirectoryClean()) {
        console.error(
          'Error: Working directory is not clean. Please commit or stash changes first.',
        );
        process.exit(1);
      }
      createEmptyCommit(version);
      createTag(version);
      pushTag(version);
      break;

    default:
      console.log('Usage: node tag.cjs [commit|create|push|remove|release]');
      process.exit(1);
  }
}

main();
