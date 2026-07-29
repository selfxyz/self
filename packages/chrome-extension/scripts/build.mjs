// Builds the unpacked extension into dist/:
//   dist/                       copy of ../webview-app/dist at the ROOT, so the
//                               absolute public-asset URLs euclid hardcodes
//                               (/animations/..., /fonts/...) resolve on
//                               chrome-extension:// pages (the app's asset-path
//                               shim only activates on file:)
//   dist/index.html             gains a bridge-host.js script tag before the
//                               app bundle (SRI-hashed assets stay untouched)
//   dist/bridge-host.js         esbuild src/bridge-host.ts (classic script)
//   dist/background.js          esbuild src/background.ts (module worker)
//   dist/manifest.json          copied
//
// Prereq: the webview-app dist must exist (see the error below for the chain).

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const webviewDist = resolve(root, '../webview-app/dist');

if (!existsSync(join(webviewDist, 'index.html'))) {
  console.error('webview-app dist not found. Build it first:');
  console.error(
    '  pnpm --filter @selfxyz/common build && pnpm --filter @selfxyz/mobile-sdk-alpha build:ts-only && pnpm --filter @selfxyz/webview-bridge build && pnpm --filter @selfxyz/webview-app build',
  );
  process.exit(1);
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(webviewDist, dist, { recursive: true });

await build({
  entryPoints: [join(root, 'src/background.ts')],
  bundle: true,
  format: 'esm',
  outfile: join(dist, 'background.js'),
  target: 'chrome120',
});

for (const entry of ['bridge-host', 'link', 'unlock', 'content-script']) {
  await build({
    entryPoints: [join(root, `src/${entry}.ts`)],
    bundle: true,
    format: 'iife',
    outfile: join(dist, `${entry}.js`),
    target: 'chrome120',
  });
}

cpSync(join(root, 'pages/link.html'), join(dist, 'link.html'));
cpSync(join(root, 'pages/unlock.html'), join(dist, 'unlock.html'));

const indexPath = join(dist, 'index.html');
const html = readFileSync(indexPath, 'utf8');
const marker = '<script type="module"';
if (!html.includes(marker)) {
  console.error('Could not find the app module script tag in webview-app index.html');
  process.exit(1);
}
writeFileSync(indexPath, html.replace(marker, `<script src="./bridge-host.js"></script>\n    ${marker}`));

cpSync(join(root, 'icons'), join(dist, 'icons'), { recursive: true });

// Store builds differ from dev builds in two ways: the pinned `key` (which
// fixes the extension id for local loads and the harnesses) must not ship, and
// the version is a monotonic date stamp the store orders releases by.
const storeBuild = process.argv.includes('--store');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
if (storeBuild) {
  delete manifest.key;
  const now = new Date();
  const stamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0'),
    process.env.STORE_BUILD_NUMBER ?? '1',
  ].join('.');
  manifest.version = stamp;
  console.log(`Store build: key stripped, version ${stamp}`);
}
writeFileSync(join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

if (storeBuild) {
  const zip = join(root, `self-extension-${manifest.version}.zip`);
  execFileSync('zip', ['-qr', zip, '.'], { cwd: dist });
  console.log(`Store package: ${zip}`);
}

try {
  execFileSync('du', ['-sh', dist], { stdio: 'inherit' });
} catch {
  // best-effort size report
}
console.log(`Built unpacked extension at ${dist}`);
