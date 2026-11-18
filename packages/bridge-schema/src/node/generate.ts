// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { SchemaDocument } from '../schemaDocument';
import { createSchemaValidator } from '../validator';
import { loadSchemas } from './loadSchemas';

export interface GeneratedFile {
  /** Relative to `outRoot`, with forward slashes. */
  readonly path: string;
  readonly content: string;
}

export interface GenerationTarget {
  readonly name: string;
  emit(schemas: readonly SchemaDocument[]): GeneratedFile[];
}

export interface GenerationOptions {
  readonly schemaDir: string;
  readonly outRoot: string;
  readonly targets: readonly GenerationTarget[];
  /** Compare with the files on disk and write nothing. */
  readonly check: boolean;
}

export interface GenerationReport {
  readonly files: readonly string[];
  /** Files whose content on disk differs from the generated content, or that are missing. */
  readonly changed: readonly string[];
}

function resolveInside(outRoot: string, relativePath: string): string {
  const resolved = path.resolve(outRoot, relativePath);
  const fromRoot = path.relative(outRoot, resolved);
  if (
    fromRoot === '' ||
    fromRoot.startsWith('..') ||
    path.isAbsolute(fromRoot)
  ) {
    throw new Error(`Generated path escapes the output root: ${relativePath}`);
  }
  return resolved;
}

export function generate(options: GenerationOptions): GenerationReport {
  const schemas = loadSchemas(options.schemaDir);
  createSchemaValidator(schemas);

  const outputs = new Map<string, string>();
  for (const target of options.targets) {
    for (const file of target.emit(schemas)) {
      if (outputs.has(file.path)) {
        throw new Error(
          `Target "${target.name}" emits ${file.path}, which another target already emits`,
        );
      }
      outputs.set(file.path, file.content);
    }
  }

  const changed: string[] = [];
  for (const [relativePath, content] of outputs) {
    const absolutePath = resolveInside(options.outRoot, relativePath);
    const current = existsSync(absolutePath)
      ? readFileSync(absolutePath, 'utf8')
      : undefined;
    if (current === content) {
      continue;
    }
    changed.push(relativePath);
    if (!options.check) {
      mkdirSync(path.dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, content, 'utf8');
    }
  }

  return { files: [...outputs.keys()], changed };
}

export interface GenerateCliOptions extends Omit<GenerationOptions, 'check'> {
  readonly log: (line: string) => void;
}

/** Returns the process exit code: 0 clean, 1 drift under `--check`, 2 bad usage. */
export function runGenerateCli(
  args: readonly string[],
  options: GenerateCliOptions,
): number {
  const unknown = args.filter(arg => arg !== '--check');
  if (unknown.length > 0) {
    options.log(
      `Unknown argument: ${unknown.join(' ')}\nUsage: generate [--check]`,
    );
    return 2;
  }
  const check = args.includes('--check');
  const report = generate({ ...options, check });

  if (check && report.changed.length > 0) {
    options.log(
      `Generated files are out of date:\n${report.changed.map(file => `  - ${file}`).join('\n')}`,
    );
    options.log(
      'Run `pnpm --filter @selfxyz/bridge-schema generate` and commit the result.',
    );
    return 1;
  }
  const verb = check
    ? 'up to date'
    : `generated, ${report.changed.length} written`;
  options.log(`${report.files.length} file(s) ${verb}.`);
  return 0;
}
