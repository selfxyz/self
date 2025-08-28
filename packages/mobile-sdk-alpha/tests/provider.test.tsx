// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/* @vitest-environment jsdom */
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import * as clientModule from '../src/client';
import { SelfClientProvider, useSelfClient } from '../src/index';
import { expectedMRZResult, mockAdapters, sampleMRZ } from './utils/testHelpers';

import { renderHook } from '@testing-library/react';

describe('SelfClientProvider Context', () => {
  it('provides client through context with MRZ parsing capability', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SelfClientProvider config={{}} adapters={mockAdapters}>
        {children}
      </SelfClientProvider>
    );

    const { result } = renderHook(() => useSelfClient(), { wrapper });
    const info = result.current.extractMRZInfo(sampleMRZ);

    expect(info.passportNumber).toBe(expectedMRZResult.passportNumber);
    expect(info.validation.overall).toBe(expectedMRZResult.validation.overall);
  });

  it('throws error when used outside provider', () => {
    expect(() => {
      renderHook(() => useSelfClient());
    }).toThrow('useSelfClient must be used within a SelfClientProvider');
  });

  it('memoises the client instance across re-renders', () => {
    const spy = vi.spyOn(clientModule, 'createSelfClient');
    const config = {};
    const adapters = mockAdapters;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SelfClientProvider config={config} adapters={adapters}>
        {children}
      </SelfClientProvider>
    );

    const { result, rerender } = renderHook(() => useSelfClient(), { wrapper });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
