// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { type GenerationTarget, runGenerateCli } from '../src/node';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const targets: GenerationTarget[] = [];

process.exitCode = runGenerateCli(process.argv.slice(2), {
  schemaDir: path.join(packageRoot, 'schema'),
  outRoot: path.resolve(packageRoot, '..', '..'),
  targets,
  log: line => console.log(line),
});
