#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('bundle-analyze-ci.cjs', () => {
  const scriptPath = path.join(__dirname, '..', 'bundle-analyze-ci.cjs');

  it('should exit with error when no platform is provided', () => {
    assert.throws(() => {
      execSync(`node ${scriptPath}`, { stdio: 'pipe' });
    });
  });

  it('should exit with error when invalid platform is provided', () => {
    assert.throws(() => {
      execSync(`node ${scriptPath} invalid-platform`, { stdio: 'pipe' });
    });
  });

  it('should have human-readable thresholds defined', () => {
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');

    // Check that the DRY checkBundleSize function exists
    assert(scriptContent.includes('function checkBundleSize'));
    assert(scriptContent.includes('thresholdMB * 1024 * 1024'));

    // Check that WARNING_INCREASE is removed
    assert(!scriptContent.includes('BUNDLE_WARNING_INCREASE'));
    assert(!scriptContent.includes('WARNING_INCREASE'));
  });

  it('should have formatBytes function', () => {
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    assert(scriptContent.includes('function formatBytes'));
  });

  it('should have proper error handling for missing bundle file', () => {
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    assert(scriptContent.includes('Bundle file not found'));
    assert(scriptContent.includes('process.exit(1)'));
  });

  it('should have helpful error message with threshold update instructions', () => {
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    assert(
      scriptContent.includes(
        'To increase the threshold, edit BUNDLE_THRESHOLDS_MB',
      ),
    );
  });

  it('should use DRY approach with checkBundleSize function', () => {
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    assert(scriptContent.includes('checkBundleSize(bundleSize, platform)'));
    assert(scriptContent.includes('return false'));
    assert(scriptContent.includes('return true'));
  });
});
