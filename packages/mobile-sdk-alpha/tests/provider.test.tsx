/* @vitest-environment jsdom */
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import type { CryptoAdapter, NetworkAdapter, ScannerAdapter } from '../src/adapters/index';
import { SelfClientProvider, useSelfClient } from '../src/index';

import { renderHook } from '@testing-library/react';

const scanner: ScannerAdapter = {
  scan: async () => ({ mode: 'mrz', passportNumber: '', dateOfBirth: '', dateOfExpiry: '' }),
};

const network: NetworkAdapter = {
  http: { fetch: async () => new Response(null) },
  ws: {
    connect: () => ({
      send: () => {},
      close: () => {},
      onMessage: () => {},
      onError: () => {},
      onClose: () => {},
    }),
  },
};

const crypto: CryptoAdapter = {
  hash: async () => new Uint8Array(),
  sign: async () => new Uint8Array(),
};

describe('SelfClientProvider', () => {
  it('provides client through context', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SelfClientProvider config={{}} adapters={{ scanner, network, crypto }}>
        {children}
      </SelfClientProvider>
    );
    const { result } = renderHook(() => useSelfClient(), { wrapper });
    const sample = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10`;
    const info = result.current.extractMRZInfo(sample);
    expect(info.passportNumber).toBe('L898902C3');
    expect(info.validation.overall).toBe(true);
  });
});
