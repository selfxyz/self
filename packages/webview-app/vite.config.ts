// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { defineConfig, type Plugin } from 'vite';

import react from '@vitejs/plugin-react';

/**
 * Adds Subresource Integrity (SRI) hashes to script/link tags in HTML output.
 * Runs after all files are written to disk so hashes match the final bytes
 * (including sourcemap comments appended by Rollup).
 */
function subresourceIntegrity(): Plugin {
  let outDir = 'dist';
  return {
    name: 'subresource-integrity',
    enforce: 'post',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const htmlPath = join(outDir, 'index.html');
      let html: string;
      try {
        html = readFileSync(htmlPath, 'utf-8');
      } catch {
        return;
      }

      const updated = html.replace(
        /(<(?:script|link)[^>]*(?:src|href)="([^"]+)"[^>]*)(\/?>)/g,
        (match, before, assetPath, close) => {
          if (match.includes('integrity=')) return match;

          const filePath = join(outDir, assetPath);
          try {
            const content = readFileSync(filePath);
            const hash = createHash('sha384').update(content).digest('base64');
            return `${before} integrity="sha384-${hash}"${close}`;
          } catch {
            return match;
          }
        },
      );

      if (updated !== html) {
        writeFileSync(htmlPath, updated);
      }
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    subresourceIntegrity(),
    {
      name: 'serve-public-files',
      configureServer(server) {
        // Serve static files from public/ before SPA fallback rewrites them
        server.middlewares.use((req, _res, next) => {
          if (req.url?.match(/\.(json|html)(\?|$)/) && req.url !== '/index.html') {
            // Let Vite's static file serving handle it by removing accept header
            // that triggers the history fallback
            delete req.headers.accept;
          }
          next();
        });
      },
    },
  ],
  define: { global: 'globalThis' },
  resolve: {
    // The deprecated npm `crypto` placeholder package (a transitive dep of
    // `@zk-email/jwt-tx-builder-helpers`) has no entry point and breaks
    // vite's commonjs resolver under pnpm's strict layout. Redirect bare
    // `crypto` requires to the browser polyfill.
    alias: [{ find: /^crypto$/, replacement: 'crypto-browserify' }],
  },
  build: {
    target: ['chrome90', 'safari15.4'],
    rollupOptions: { output: { manualChunks: undefined } },
    assetsInlineLimit: 102400,
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: { host: '0.0.0.0', port: 5173, allowedHosts: ['.ngrok-free.app'] },
});
