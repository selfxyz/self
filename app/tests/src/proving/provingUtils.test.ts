// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { getPayload, getWSDbRelayerUrl } from '@/proving';

describe('provingUtils', () => {
  /**
   * Note: encryptAES256GCM is tested in @selfxyz/common where it's defined.
   * Testing it here would require mixing node-forge instances (app uses
   * node-forge@^1.3.1, common uses a forked version) which causes silent
   * failures in CI where the packages are built separately.
   *
   * The encryption/decryption roundtrip test belongs in the common package
   * where both the function and node-forge are from the same source.
   */

  it('getPayload returns disclose payload', () => {
    const inputs = { foo: 'bar' };
    const payload = getPayload(
      inputs,
      'disclose',
      'vc_and_disclose',
      'https',
      'https://example.com',
      2,
      '0xabc',
    );
    expect(payload).toEqual({
      type: 'disclose',
      endpointType: 'https',
      endpoint: 'https://example.com',
      onchain: false,
      circuit: { name: 'vc_and_disclose', inputs: JSON.stringify(inputs) },
      version: 2,
      userDefinedData: '0xabc',
      selfDefinedData: '',
    });
  });

  it('getPayload returns register payload', () => {
    const payload = getPayload(
      { a: 1 },
      'register',
      'register_circuit',
      'celo',
      'https://self.xyz',
    );
    expect(payload).toEqual({
      type: 'register',
      onchain: true,
      endpointType: 'celo',
      circuit: { name: 'register_circuit', inputs: JSON.stringify({ a: 1 }) },
    });
  });

  it('getWSDbRelayerUrl handles endpoint types', () => {
    expect(getWSDbRelayerUrl('celo')).toContain('websocket.self.xyz');
    expect(getWSDbRelayerUrl('https')).toContain('websocket.self.xyz');
    expect(getWSDbRelayerUrl('staging_celo')).toContain(
      'websocket.staging.self.xyz',
    );
  });
});
