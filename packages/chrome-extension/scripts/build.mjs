import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
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
const moduleTag = html.match(/<script type="module"[^>]*><\/script>/);
if (!moduleTag) {
  console.error(
    'Could not find the app module script tag in webview-app index.html',
  );
  process.exit(1);
}
const src = moduleTag[0].match(/src="([^"]+)"/)?.[1];
const integrity = moduleTag[0].match(/integrity="([^"]+)"/)?.[1];
if (!src) {
  console.error('App module script tag has no src');
  process.exit(1);
}

// The app module is injected by bridge-host AFTER the custody gate passes, so
// a locked or fresh install never parses the multi-MB bundle just to bounce
// to unlock/link. The modulepreload keeps the fetch warm during the gate
// check, and the splash paints immediately instead of a blank #root.
const preload = `<link rel="modulepreload" id="self-app-module" href="${src}"${integrity ? ` integrity="${integrity}"` : ''} crossorigin>`;
const splash = `<div id="self-splash" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#F8FAFC;z-index:9999">
      <img src="./icons/icon-128.png" width="64" height="64" alt="" style="animation:self-splash-pulse 1.2s ease-in-out infinite">
      <style>@keyframes self-splash-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.94)}}</style>
    </div>`;
writeFileSync(
  indexPath,
  html
    .replace(
      moduleTag[0],
      `${preload}\n    <script src="./bridge-host.js"></script>`,
    )
    .replace('<div id="root"></div>', `${splash}\n    <div id="root"></div>`),
);

for (const file of execFileSync('find', [dist, '-name', '*.map'])
  .toString()
  .split('\n')
  .filter(Boolean)) {
  rmSync(file);
}

cpSync(join(root, 'icons'), join(dist, 'icons'), { recursive: true });

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
writeFileSync(
  join(dist, 'manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n',
);

if (storeBuild) {
  const zip = join(root, `self-extension-${manifest.version}.zip`);
  execFileSync('zip', ['-qr', zip, '.'], { cwd: dist });
  console.log(`Store package: ${zip}`);
}

try {
  execFileSync('du', ['-sh', dist], { stdio: 'inherit' });
} catch {}
console.log(`Built unpacked extension at ${dist}`);
