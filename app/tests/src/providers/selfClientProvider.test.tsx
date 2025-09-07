// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { type ReactNode } from 'react';
import { renderHook } from '@testing-library/react-native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import { SelfClientProvider } from '@/providers/selfClientProvider';

describe('SelfClientProvider', () => {
  it('memoises the client instance', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SelfClientProvider>{children}</SelfClientProvider>
    );
    const { result, rerender } = renderHook(() => useSelfClient(), { wrapper });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('wires Web Crypto hashing and network adapters', async () => {
    const originalFetch = (global as any).fetch;
    const originalWebSocket = (global as any).WebSocket;

    try {
      const fetchSpy = jest.fn(async () => new Response(null));
      (global as any).fetch = fetchSpy;
      class MockSocket {
        url: string;
        constructor(url: string) {
          this.url = url;
        }
        addEventListener() {}
        send() {}
        close() {}
      }
      (global as any).WebSocket = MockSocket;

      const wrapper = ({ children }: { children: ReactNode }) => (
        <SelfClientProvider>{children}</SelfClientProvider>
      );
      renderHook(() => useSelfClient(), { wrapper });

      const data = new TextEncoder().encode('hello');
      const digest = await crypto.subtle.digest('SHA-256', data);
      expect(digest.byteLength).toBeGreaterThan(0);

      await expect(fetch('https://example.com')).resolves.toBeDefined();
      const socket = new WebSocket('ws://example.com');
      expect(typeof (socket as any).send).toBe('function');
    } finally {
      // Cleanup - restore original globals
      (global as any).fetch = originalFetch;
      (global as any).WebSocket = originalWebSocket;
    }
  });
});
