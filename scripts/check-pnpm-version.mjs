#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (
      e.name === 'node_modules' ||
      e.name === '.git' ||
      e.name.startsWith('.next')
    )
      continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else if (e.name === 'package.json') out.push(full);
  }
  return out;
}

const errors = [];

const rootPkg = await readJson(path.join(repoRoot, 'package.json'));
if (!rootPkg.packageManager || !rootPkg.packageManager.startsWith('pnpm@')) {
  errors.push(
    `Root package.json must declare "packageManager": "pnpm@<version>..."`,
  );
}
const rootVersion = rootPkg.packageManager;

const pkgFiles = await walk(repoRoot);
for (const f of pkgFiles) {
  if (f === path.join(repoRoot, 'package.json')) continue;
  const pkg = await readJson(f);
  if (pkg.packageManager) {
    errors.push(
      `${path.relative(repoRoot, f)} declares "packageManager". Remove it — only root package.json should pin pnpm.`,
    );
  }
}

async function scanGithub(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await scanGithub(full)));
    else if (e.name.endsWith('.yml') || e.name.endsWith('.yaml'))
      out.push(full);
  }
  return out;
}

const ghDir = path.join(repoRoot, '.github');
try {
  const ghFiles = await scanGithub(ghDir);
  const pin = /pnpm@\d+\.\d+\.\d+/g;
  for (const f of ghFiles) {
    const text = await fs.readFile(f, 'utf8');
    const matches = text.match(pin);
    if (matches) {
      errors.push(
        `${path.relative(repoRoot, f)} hardcodes ${matches.join(', ')}. Drop the explicit version — \`corepack enable\` will pick up root package.json's packageManager.`,
      );
    }
  }
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}

if (errors.length) {
  console.error('pnpm version single-source-of-truth check failed:\n');
  for (const e of errors) console.error(`  - ${e}`);
  console.error(
    `\nSingle source of truth: root package.json -> "packageManager": "${rootVersion}"`,
  );
  process.exit(1);
}

console.log(
  `pnpm version OK — single source of truth is root package.json (${rootVersion})`,
);
