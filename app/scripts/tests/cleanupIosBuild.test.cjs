// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { mkdtempSync, mkdirSync, writeFileSync, readFileSync } = require('fs');
const { join, resolve } = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { spawnSync } = require('child_process');
const { describe, it } = require('node:test');
const assert = require('node:assert');

const SCRIPT = resolve(__dirname, '../cleanup-ios-build.sh');

describe('cleanup-ios-build.sh', () => {
  it('resets pbxproj and reapplies versions', () => {
    const tmp = mkdtempSync(join(os.tmpdir(), 'cleanup-test-'));
    const projectName = 'MyApp';
    const iosDir = join(tmp, 'ios', `${projectName}.xcodeproj`);
    mkdirSync(iosDir, { recursive: true });
    const pbxPath = join(iosDir, 'project.pbxproj');
    writeFileSync(
      pbxPath,
      'CURRENT_PROJECT_VERSION = 1;\nMARKETING_VERSION = 1.0.0;\n',
    );

    const cwd = process.cwd();
    process.chdir(tmp);
    execSync('git init -q');
    execSync('git config user.email "test@example.com"');
    execSync('git config user.name "Test"');
    execSync(`git add ${pbxPath}`);
    execSync('git commit -m init -q');

    writeFileSync(
      pbxPath,
      'CURRENT_PROJECT_VERSION = 2;\nMARKETING_VERSION = 2.0.0;\nSomeArtifact = 123;\n',
    );

    execSync(`IOS_PROJECT_NAME=${projectName} bash ${SCRIPT}`);
    process.chdir(cwd);

    const result = readFileSync(pbxPath, 'utf8');
    assert(result.includes('CURRENT_PROJECT_VERSION = 2;'));
    assert(result.includes('MARKETING_VERSION = 2.0.0;'));
    assert(!result.includes('SomeArtifact'));
  });

  it('fails when the pbxproj file does not exist', () => {
    const tmp = mkdtempSync(join(os.tmpdir(), 'cleanup-test-'));

    const result = spawnSync('bash', [SCRIPT], {
      cwd: tmp,
      env: { ...process.env, IOS_PROJECT_NAME: 'MissingProject' },
      encoding: 'utf8',
    });

    assert.notStrictEqual(result.status, 0);
    assert(result.stderr.includes('Project file not found'));
  });

  it('fails when version information cannot be extracted', () => {
    const tmp = mkdtempSync(join(os.tmpdir(), 'cleanup-test-'));
    const projectName = 'BadApp';
    const iosDir = join(tmp, 'ios', `${projectName}.xcodeproj`);
    mkdirSync(iosDir, { recursive: true });
    const pbxPath = join(iosDir, 'project.pbxproj');
    writeFileSync(
      pbxPath,
      'CURRENT_PROJECT_VERSION = ;\nMARKETING_VERSION = ;\n',
    );

    const cwd = process.cwd();
    process.chdir(tmp);
    execSync('git init -q');
    execSync('git config user.email "test@example.com"');
    execSync('git config user.name "Test"');
    execSync(`git add ${pbxPath}`);
    execSync('git commit -m init -q');

    const result = spawnSync('bash', [SCRIPT], {
      cwd: tmp,
      env: { ...process.env, IOS_PROJECT_NAME: projectName },
      encoding: 'utf8',
    });

    process.chdir(cwd);

    assert.notStrictEqual(result.status, 0);
    assert(result.stderr.includes('Failed to extract version information'));
  });
});
