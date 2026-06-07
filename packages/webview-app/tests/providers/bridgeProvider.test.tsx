// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import type React from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { WebViewBridge } from '@selfxyz/webview-bridge';

import { BridgeProvider, useBridge } from '../../src/providers/BridgeProvider';

import { cleanup, render } from '@testing-library/react';

const Probe: React.FC<{ onBridge: (bridge: WebViewBridge) => void }> = ({ onBridge }) => {
  onBridge(useBridge());
  return null;
};

describe('BridgeProvider', () => {
  afterEach(() => {
    cleanup();
    delete (globalThis as { SelfNativeBridge?: unknown }).SelfNativeBridge;
  });

  it('uses the injected bridge without constructing a default that clobbers globalThis.SelfNativeBridge', () => {
    const injected = {} as WebViewBridge;
    const sentinel = {} as WebViewBridge;
    (globalThis as { SelfNativeBridge?: unknown }).SelfNativeBridge = sentinel;

    let resolved: WebViewBridge | undefined;
    render(
      <BridgeProvider bridge={injected}>
        <Probe onBridge={b => (resolved = b)} />
      </BridgeProvider>,
    );

    expect(resolved).toBe(injected);
    // No default WebViewBridge was constructed, so the global is untouched.
    expect((globalThis as { SelfNativeBridge?: unknown }).SelfNativeBridge).toBe(sentinel);
  });

  it('constructs a default bridge when none is injected', () => {
    let resolved: WebViewBridge | undefined;
    render(
      <BridgeProvider>
        <Probe onBridge={b => (resolved = b)} />
      </BridgeProvider>,
    );

    expect(resolved).toBeInstanceOf(WebViewBridge);
    expect((globalThis as { SelfNativeBridge?: unknown }).SelfNativeBridge).toBe(resolved);
  });
});
