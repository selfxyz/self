// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PROTOCOL_VERSION,
  STORAGE_DEFAULT_PROTECTION,
  STORAGE_KEY_MAX_LENGTH,
  type StoragePolicyTable,
} from '../src';
import {
  CONTRACT_PLAN,
  createNativeTargets,
  runGenerateCli,
} from '../src/node';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const storagePolicy = JSON.parse(
  readFileSync(path.join(packageRoot, 'storage', 'policy.json'), 'utf8'),
) as StoragePolicyTable;

const targets = createNativeTargets({
  plan: CONTRACT_PLAN,
  protocolVersion: PROTOCOL_VERSION,
  storagePolicy,
  storageKeyMaxLength: STORAGE_KEY_MAX_LENGTH,
  storageDefaultProtection: STORAGE_DEFAULT_PROTECTION,
});

process.exitCode = runGenerateCli(process.argv.slice(2), {
  schemaDir: path.join(packageRoot, 'schema'),
  outRoot: path.resolve(packageRoot, '..', '..'),
  targets,
  log: line => console.log(line),
});
