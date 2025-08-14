#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';

// Packages we care to unify across workspaces
const packagesToCheck = ['@types/node', 'typescript'];

// Map<packageName, Map<version, string[]>>
const depVersions = new Map();
const pmVersions = new Map();
const workflowVersions = new Map();

function record(map, key, version, filePath) {
  if (!version) return;
  if (!map.has(key)) map.set(key, new Map());
  const versions = map.get(key);
  if (!versions.has(version)) versions.set(version, []);
  versions.get(version).push(filePath);
}

async function collect(pkgPath) {
  const data = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
  for (const dep of packagesToCheck) {
    const version =
      data.dependencies?.[dep] ||
      data.devDependencies?.[dep] ||
      data.peerDependencies?.[dep];
    record(depVersions, dep, version, pkgPath);
  }
  record(pmVersions, 'packageManager', data.packageManager, pkgPath);
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
    } else if (entry.isFile() && entry.name === 'package.json') {
      await collect(fullPath);
    }
  }
}

async function scanWorkflows() {
  const wfDir = path.join(process.cwd(), '.github', 'workflows');
  let files;
  try {
    files = await fs.readdir(wfDir);
  } catch (err) {
    if (err.code === 'ENOENT') return; // No workflows directory
    throw err;
  }
  for (const file of files) {
    if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue;
    const fullPath = path.join(wfDir, file);
    const content = await fs.readFile(fullPath, 'utf8');
    const envMatch = content.match(/NODE_VERSION:\s*([^\n]+)/);
    const envVersion = envMatch ? envMatch[1].trim().replace(/['"]/g, '') : null;
    const regex = /node[-_]version:\s*([^\n]+)/g;
    let m;
    while ((m = regex.exec(content))) {
      let version = m[1].trim().replace(/['"]/g, '');
      if (version.includes('${{') && envVersion) {
        version = envVersion;
      }
      record(workflowVersions, 'workflow node-version', version, fullPath);
    }
  }
}

await walk(process.cwd());
await scanWorkflows();

function report(map) {
  let mismatch = false;
  for (const [name, versions] of map.entries()) {
    if (versions.size <= 1) continue;
    mismatch = true;
    console.log(`\n${name} mismatches:`);
    for (const [v, files] of versions) {
      console.log(`  ${v}: ${files.join(', ')}`);
    }
  }
  return mismatch;
}

const hasDepMismatch = report(depVersions);
const hasPmMismatch = report(pmVersions);
const hasWorkflowMismatch = report(workflowVersions);

process.exit(hasDepMismatch || hasPmMismatch || hasWorkflowMismatch ? 1 : 0);
