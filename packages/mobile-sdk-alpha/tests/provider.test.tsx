/* @vitest-environment jsdom */
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

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
});
