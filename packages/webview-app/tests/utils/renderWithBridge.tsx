// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';

import type { BridgeDomain } from '@selfxyz/webview-bridge';
import { WebViewBridge } from '@selfxyz/webview-bridge';
import { MockNativeBridge } from '@selfxyz/webview-bridge/mock';

import { App } from '../../src/App';
import { BridgeProvider } from '../../src/providers/BridgeProvider';

import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';

type InitialEntry = string | { pathname: string; search?: string; state?: unknown };

export interface HostConfig {
  mode?: 'self-app' | 'embed';
  verificationRequest?: { userId?: string; scope?: string; [key: string]: unknown } | null;
  referenceId?: string;
  [key: string]: unknown;
}

export interface RenderWithBridgeOptions {
  initialEntries: InitialEntry[];
  // Host config returned from lifecycle.getConfig. Defaults to self-app mode.
  config?: HostConfig;
  // Seed values for the in-memory secure storage map (key -> string value).
  storage?: Record<string, string>;
  // Seed for the documents-domain store (catalog object + documents by id).
  documents?: { catalog?: unknown; byId?: Record<string, unknown> };
  // Caller hook to register flow-specific handlers (camera/scanMRZ, nfc/scanPassport,
  // etc.) or to override any baseline handler. Runs after defaults are registered.
  setupHandlers?: (mock: MockNativeBridge) => void;
}

export interface HarnessDocumentsStore {
  catalog: { value: unknown };
  byId: Map<string, unknown>;
}

export interface RenderWithBridgeResult extends RenderResult {
  mock: MockNativeBridge;
  bridge: WebViewBridge;
  storage: Map<string, string>;
  documents: HarnessDocumentsStore;
}

const LocationProbe: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location-probe" data-pathname={location.pathname} />;
};

export function currentPath(result: RenderWithBridgeResult): string {
  return result.getByTestId('location-probe').getAttribute('data-pathname') ?? '';
}

/**
 * Mounts the real webview-app (route table + provider stack) over a
 * MockNativeBridge-backed WebViewBridge, at a chosen router entry. Tests drive
 * real routing and real bridge round-trips; only the native side is mocked.
 */
export function renderWithBridge(options: RenderWithBridgeOptions): RenderWithBridgeResult {
  const { initialEntries, config, storage: seed, documents: documentsSeed, setupHandlers } = options;

  const mock = new MockNativeBridge();
  const storage = new Map<string, string>(Object.entries(seed ?? {}));
  const documents: HarnessDocumentsStore = {
    catalog: { value: documentsSeed?.catalog ?? null },
    byId: new Map(Object.entries(documentsSeed?.byId ?? {})),
  };

  // Awaited boot request: operating mode + reference id.
  mock.handle('lifecycle', 'getConfig', () => ({ mode: 'self-app', ...config }));

  // Awaited / fire-and-forget lifecycle calls made during normal render.
  mock.handleWith('lifecycle', 'ready', {});
  mock.handleWith('lifecycle', 'setResult', {});
  mock.handleWith('lifecycle', 'dismiss', {});
  mock.handleWith('haptic', 'trigger', {});

  // Secure storage backed by an in-memory map. Covers the secret manager
  // (mnemonic/private key); documents live on the documents domain below.
  mock.handle('secureStorage', 'get', params => {
    const key = params.key as string;
    return storage.has(key) ? storage.get(key) : null;
  });
  mock.handle('secureStorage', 'set', params => {
    storage.set(params.key as string, params.value as string);
    return {};
  });
  mock.handle('secureStorage', 'remove', params => {
    storage.delete(params.key as string);
    return {};
  });

  // Documents domain, mirroring rn-sdk DocumentsHandler semantics (an unset
  // catalog loads as null; the web-side typed adapter normalizes it).
  mock.handle('documents', 'loadCatalog', () => documents.catalog.value);
  mock.handle('documents', 'saveCatalog', params => {
    documents.catalog.value = params.catalog;
    return {};
  });
  mock.handle('documents', 'loadById', params => documents.byId.get(params.id as string) ?? null);
  mock.handle('documents', 'save', params => {
    documents.byId.set(params.id as string, params.data);
    return {};
  });
  mock.handle('documents', 'delete', params => {
    documents.byId.delete(params.id as string);
    return {};
  });

  setupHandlers?.(mock);

  const bridge = new WebViewBridge({ transport: mock });
  mock.connect(bridge);

  const result = render(
    <BridgeProvider bridge={bridge}>
      <App
        renderRouter={children => (
          <MemoryRouter initialEntries={initialEntries}>
            {children}
            <LocationProbe />
          </MemoryRouter>
        )}
      />
    </BridgeProvider>,
  );

  return Object.assign(result, { mock, bridge, storage, documents });
}

export type { BridgeDomain };
