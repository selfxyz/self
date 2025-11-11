// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import forge from 'node-forge';

import {
  encryptAES256GCM,
  getPayload,
  getWSDbRelayerUrl,
} from '@/utils/proving';

describe('provingUtils', () => {
  it('encryptAES256GCM encrypts and decrypts correctly', () => {
    const key = forge.random.getBytesSync(32);
    const plaintext = 'hello world';
    const encrypted = encryptAES256GCM(plaintext, forge.util.createBuffer(key));

    const decipher = forge.cipher.createDecipher(
      'AES-GCM',
      forge.util.createBuffer(key),
    );
    decipher.start({
      iv: forge.util.createBuffer(
        Buffer.from(encrypted.nonce).toString('binary'),
      ),
      tagLength: 128,
      tag: forge.util.createBuffer(
        Buffer.from(encrypted.auth_tag).toString('binary'),
      ),
    });
    decipher.update(
      forge.util.createBuffer(
        Buffer.from(encrypted.cipher_text).toString('binary'),
      ),
    );
    const success = decipher.finish();
    const decrypted = decipher.output.toString();

    expect(success).toBe(true);
    expect(decrypted).toBe(plaintext);
  });

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
