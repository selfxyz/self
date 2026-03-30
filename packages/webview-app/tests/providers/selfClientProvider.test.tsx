// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SelfClientProvider, useSelfClient } from '../../src/providers/SelfClientProvider';

import { cleanup, render, screen } from '@testing-library/react';

const navigateSpy = vi.fn();
const createSelfClientSpy = vi.fn();
const createListenersMapSpy = vi.fn();
const bridgeLifecycleAdapterSpy = vi.fn();
const bridgeHapticAdapterSpy = vi.fn();
const bridgeBiometricsAdapterSpy = vi.fn();
const consoleAnalyticsAdapterSpy = vi.fn();
const createKeychainDocumentsAdapterSpy = vi.fn();
const createSdkAdaptersSpy = vi.fn();
const indexedDBDocumentsAdapterSpy = vi.fn();
const noOpHapticAdapterSpy = vi.fn();

const bridgeMock = {
  isConnected: true,
  usesBrowserHostTransport: false,
  on: vi.fn(() => vi.fn()),
};

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateSpy,
}));

vi.mock('../../src/providers/BridgeProvider', () => ({
  useBridge: () => bridgeMock,
}));

vi.mock('../../src/providers/VerificationRequestProvider', () => ({
  useVerificationRequest: () => ({
    verificationId: undefined,
  }),
}));

vi.mock('@selfxyz/mobile-sdk-alpha/browser', () => ({
  createListenersMap: () => createListenersMapSpy(),
  createSelfClient: (args: unknown) => createSelfClientSpy(args),
}));

vi.mock('@selfxyz/webview-bridge/adapters', () => ({
  bridgeBiometricsAdapter: (bridge: unknown) => bridgeBiometricsAdapterSpy(bridge),
  bridgeHapticAdapter: (bridge: unknown) => bridgeHapticAdapterSpy(bridge),
  bridgeLifecycleAdapter: (bridge: unknown) => bridgeLifecycleAdapterSpy(bridge),
  consoleAnalyticsAdapter: () => consoleAnalyticsAdapterSpy(),
  createKeychainDocumentsAdapter: (bridge: unknown) => createKeychainDocumentsAdapterSpy(bridge),
  createSdkAdapters: (args: unknown) => createSdkAdaptersSpy(args),
  indexedDBDocumentsAdapter: () => indexedDBDocumentsAdapterSpy(),
  noOpHapticAdapter: () => noOpHapticAdapterSpy(),
}));

const Probe: React.FC = () => {
  const { documents, haptic } = useSelfClient();

  return (
    <div>
      <span data-testid="documents">{documents === indexedDbDocumentsAdapter ? 'indexeddb' : 'keychain'}</span>
      <span data-testid="haptic">{haptic === noOpHapticAdapter ? 'noop' : 'bridge'}</span>
    </div>
  );
};

const lifecycleAdapter = { ready: vi.fn(), setResult: vi.fn(), dismiss: vi.fn() };
const bridgeHapticAdapter = { trigger: vi.fn() };
const noOpHapticAdapter = { trigger: vi.fn() };
const biometricsAdapter = { authenticate: vi.fn(), isAvailable: vi.fn(), getBiometryType: vi.fn() };
const analyticsAdapter = { trackEvent: vi.fn() };
const keychainDocumentsAdapter = {
  loadDocumentCatalog: vi.fn(),
  saveDocumentCatalog: vi.fn(),
  loadDocumentById: vi.fn(),
  saveDocument: vi.fn(),
  deleteDocument: vi.fn(),
};
const indexedDbDocumentsAdapter = {
  loadDocumentCatalog: vi.fn(),
  saveDocumentCatalog: vi.fn(),
  loadDocumentById: vi.fn(),
  saveDocument: vi.fn(),
  deleteDocument: vi.fn(),
};

describe('SelfClientProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    bridgeMock.isConnected = true;
    bridgeMock.usesBrowserHostTransport = false;

    createListenersMapSpy.mockReturnValue({ map: new Map() });
    createSdkAdaptersSpy.mockReturnValue({ navigation: {}, documents: keychainDocumentsAdapter });
    createSelfClientSpy.mockImplementation(({ adapters }: { adapters: unknown }) => ({ adapters }));
    bridgeLifecycleAdapterSpy.mockReturnValue(lifecycleAdapter);
    bridgeHapticAdapterSpy.mockReturnValue(bridgeHapticAdapter);
    bridgeBiometricsAdapterSpy.mockReturnValue(biometricsAdapter);
    consoleAnalyticsAdapterSpy.mockReturnValue(analyticsAdapter);
    createKeychainDocumentsAdapterSpy.mockReturnValue(keychainDocumentsAdapter);
    indexedDBDocumentsAdapterSpy.mockReturnValue(indexedDbDocumentsAdapter);
    noOpHapticAdapterSpy.mockReturnValue(noOpHapticAdapter);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('uses bridge-backed adapters when native transport is available', () => {
    render(
      <SelfClientProvider>
        <Probe />
      </SelfClientProvider>,
    );

    expect(screen.getByTestId('documents').textContent).toBe('keychain');
    expect(screen.getByTestId('haptic').textContent).toBe('bridge');
    expect(createSelfClientSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        adapters: expect.objectContaining({
          documents: keychainDocumentsAdapter,
        }),
      }),
    );
    expect(lifecycleAdapter.ready).toHaveBeenCalledWith({});
  });

  it('uses browser-safe adapters when running without a native transport', () => {
    bridgeMock.isConnected = false;

    render(
      <SelfClientProvider>
        <Probe />
      </SelfClientProvider>,
    );

    expect(screen.getByTestId('documents').textContent).toBe('indexeddb');
    expect(screen.getByTestId('haptic').textContent).toBe('noop');
    expect(createSelfClientSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        adapters: expect.objectContaining({
          documents: indexedDbDocumentsAdapter,
        }),
      }),
    );
  });

  it('uses browser-safe storage when only browser-host lifecycle transport is available', () => {
    bridgeMock.usesBrowserHostTransport = true;

    render(
      <SelfClientProvider>
        <Probe />
      </SelfClientProvider>,
    );

    expect(screen.getByTestId('documents').textContent).toBe('indexeddb');
    expect(screen.getByTestId('haptic').textContent).toBe('noop');
    expect(createSelfClientSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        adapters: expect.objectContaining({
          documents: indexedDbDocumentsAdapter,
        }),
      }),
    );
  });
});
