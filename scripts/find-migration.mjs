#!/usr/bin/env node
import { readdirSync } from 'fs';
import { join } from 'path';

function search(dir, target) {
  const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out']);
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const dirent of entries) {
    const name = dirent.name;
    if (dirent.isDirectory()) {
      if (SKIP.has(name) || dirent.isSymbolicLink()) continue;
      const found = search(join(dir, name), target);
      if (found) return found;
    } else if (name === target) {
      return join(dir, name);
    }
  }
  return null;
}

const result = search(process.cwd(), 'mobile-sdk-migration.mdc');
if (result) {
  console.log(result);
} else {
  console.error('mobile-sdk-migration.mdc not found');
  process.exit(1);
}
