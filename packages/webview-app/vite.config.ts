// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: { global: 'globalThis' },
  build: {
    target: ['chrome90', 'safari15'],
    rollupOptions: { output: { manualChunks: undefined } },
    assetsInlineLimit: 102400,
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: { host: '0.0.0.0', port: 5173 },
});
