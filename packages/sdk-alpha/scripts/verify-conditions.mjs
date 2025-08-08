import { readFile } from 'node:fs/promises';
const pkg = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
);
const errors = [];

if (pkg.type !== 'module') errors.push('package.json must set type: module');
if (!pkg.exports || !pkg.exports['.'])
  errors.push("package.json must define conditional exports for '.'");
if (pkg.sideEffects !== false)
  errors.push('package.json must set sideEffects: false for tree-shaking');
if (!pkg.scripts?.build?.includes('tsup'))
  errors.push('build script should use tsup');

if (errors.length) {
  console.error('Export conditions validation failed:');
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
} else {
  console.log('OK: export conditions & packaging validated.');
}
