// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Buffer } from 'buffer';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { initSentry } from './config/sentry';
import { BridgeProvider } from './providers/BridgeProvider';
import { installAssetPathShim } from './utils/assetPathShim';

import './polyfills';
import './fonts.css';
import './recovery.css';
import './reset.css';

initSentry();
installAssetPathShim();
globalThis.Buffer = Buffer;

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100%',
        maxWidth: 430,
        margin: '0 auto',
      }}
    >
      <BridgeProvider>
        <App />
      </BridgeProvider>
    </div>
  </React.StrictMode>,
);
