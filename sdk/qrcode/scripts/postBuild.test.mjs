import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { shimConfigs } from './shimConfigs.js';

test('postbuild generates loadable ESM and CommonJS deep-import shims', async (t) => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'self-qrcode-postbuild-'));
  t.after(() => {
    assert.equal(path.dirname(fixture), path.resolve(tmpdir()));
    rmSync(fixture, { recursive: true, force: true });
  });

  const scripts = path.join(fixture, 'scripts');
  const dist = path.join(fixture, 'dist');
  mkdirSync(scripts);
  mkdirSync(path.join(dist, 'esm'), { recursive: true });
  mkdirSync(path.join(dist, 'cjs'), { recursive: true });
  writeFileSync(
    path.join(fixture, 'package.json'),
    JSON.stringify({ type: 'module', version: '0.0.0-test' })
  );
  for (const script of ['postBuild.mjs', 'shimConfigs.js']) {
    copyFileSync(fileURLToPath(new URL(script, import.meta.url)), path.join(scripts, script));
  }

  for (const { shimPath, targetPath } of shimConfigs) {
    const target = path.resolve(dist, shimPath, targetPath);
    const cjsTarget = target
      .replace(`${path.sep}esm${path.sep}`, `${path.sep}cjs${path.sep}`)
      .replace(/\.js$/, '.cjs');
    mkdirSync(path.dirname(target), { recursive: true });
    mkdirSync(path.dirname(cjsTarget), { recursive: true });
    writeFileSync(target, `export const value = ${JSON.stringify(shimPath)};\n`);
    writeFileSync(cjsTarget, `exports.value = ${JSON.stringify(shimPath)};\n`);
  }

  execFileSync(process.execPath, [path.join(scripts, 'postBuild.mjs')], { cwd: fixture });

  const require = createRequire(import.meta.url);
  for (const { shimPath } of shimConfigs) {
    const shim = path.join(dist, shimPath);
    const esm = await import(pathToFileURL(path.join(shim, 'index.js')).href);
    assert.equal(esm.value, shimPath);
    assert.equal(require(path.join(shim, 'index.cjs')).value, shimPath);
  }
});
