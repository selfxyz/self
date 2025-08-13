#!/usr/bin/env node
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

function search(dir, target) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      const found = search(full, target);
      if (found) return found;
    } else if (entry === target) {
      return full;
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
