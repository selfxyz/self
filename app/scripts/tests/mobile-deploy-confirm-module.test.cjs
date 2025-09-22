// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { describe, it } = require('node:test');
const assert = require('node:assert');
const child_process = require('child_process');

describe('performIOSBuildCleanup', () => {
  it('executes cleanup script for ios', () => {
    const deploy = require('../mobile-deploy-confirm.cjs');
    let called = null;
    const original = child_process.execSync;
    deploy._setExecSync(cmd => {
      called = cmd;
    });
    deploy.performIOSBuildCleanup('ios');
    deploy._setExecSync(original);
    assert(called && called.includes('cleanup-ios-build.sh'));
  });

  it('does nothing for android', () => {
    const deploy = require('../mobile-deploy-confirm.cjs');
    let called = false;
    const original = child_process.execSync;
    deploy._setExecSync(() => {
      called = true;
    });
    deploy.performIOSBuildCleanup('android');
    deploy._setExecSync(original);
    assert.strictEqual(called, false);
  });
});

describe('executeLocalFastlaneDeployment', () => {
  it('invokes cleanup after deployment', async () => {
    const deploy = require('../mobile-deploy-confirm.cjs');
    deploy._setExecSync(() => {});

    let cleanupCalled = false;
    const originalCleanup = deploy.performIOSBuildCleanup;
    deploy._setPerformIOSBuildCleanup(() => {
      cleanupCalled = true;
    });

    await deploy.executeLocalFastlaneDeployment('ios');

    deploy._setPerformIOSBuildCleanup(originalCleanup);
    deploy._setExecSync(child_process.execSync);
    assert.strictEqual(cleanupCalled, true);
  });
});
