// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Remove duplicate React Native native modules from workspace packages
 * to prevent "tried to register two views with the same name" errors.
 *
 * These modules should only exist in app/node_modules and be hoisted
 * for use by all workspace packages.
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE_PACKAGES = [
  'packages/mobile-sdk-alpha',
];

const NATIVE_MODULES_TO_REMOVE = [
  'react-native-webview',
  'react-native-blur-effect',
];

function removeModule(workspacePackage, moduleName) {
  const modulePath = path.join(__dirname, '..', workspacePackage, 'node_modules', moduleName);

  if (fs.existsSync(modulePath)) {
    console.log(`Removing duplicate native module: ${modulePath}`);
    fs.rmSync(modulePath, { recursive: true, force: true });
  }
}

function main() {
  console.log('Cleaning up duplicate native modules from workspace packages...');

  for (const workspace of WORKSPACE_PACKAGES) {
    for (const module of NATIVE_MODULES_TO_REMOVE) {
      removeModule(workspace, module);
    }
  }

  console.log('Done cleaning up duplicate native modules.');
}

main();
