/* @vitest-environment jsdom */
import React from 'react';

import type { CryptoAdapter, NetworkAdapter, ScannerAdapter } from '../src/adapters';
import { SelfMobileSdk, useSelfClient } from '../src/index';

// eslint-disable-next-line import/no-unresolved
// @ts-ignore
import { render, screen } from '@testing-library/react';

const sample = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10`;

function Consumer() {
  const client = useSelfClient();
  const info = client.extractMRZInfo(sample);
  return <span>{info.passportNumber}</span>;
}

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

describe('SelfMobileSdk', () => {
  it('provides client to children', () => {
    render(
      <SelfMobileSdk config={{}} adapters={{ scanner, network, crypto }}>
        <Consumer />
      </SelfMobileSdk>,
    );
    expect(screen.getByText('L898902C3')).toBeTruthy();
  });
});
