// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { defineConfig } from 'vite';

import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [
    react(),
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
  build: {
    target: ['chrome90', 'safari15.4'],
    rollupOptions: { output: { manualChunks: undefined } },
    assetsInlineLimit: 102400,
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: { host: '0.0.0.0', port: 5173 },
});
