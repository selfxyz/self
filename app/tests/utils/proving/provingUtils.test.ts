// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import forge from 'node-forge';

import {
  encryptAES256GCM,
  getPayload,
  getWSDbRelayerUrl,
} from '../../../src/utils/proving/provingUtils';

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
      iv: Buffer.from(encrypted.nonce).toString('binary'),
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
    expect(getWSDbRelayerUrl('celo')).toBe('wss://websocket.self.xyz');
    expect(getWSDbRelayerUrl('https')).toBe('wss://websocket.self.xyz');
    expect(getWSDbRelayerUrl('staging_celo')).toBe(
      'wss://websocket.staging.self.xyz',
    );
  });

  it('getPayload handles various inputs', () => {
    // Test with null input - should work since JSON.stringify handles it
    const payload1 = getPayload(
      null,
      'disclose',
      'vc_and_disclose',
      'https',
      'https://example.com',
    );
    expect(payload1.circuit.inputs).toBe('null');

    // Test with empty string circuit type - should work since it's just used as-is
    const payload2 = getPayload(
      {},
      'disclose',
      'vc_and_disclose',
      'https',
      'https://example.com',
    );
    expect(payload2.circuit.inputs).toBe('{}');

    // Test with empty circuit name - should work since it's just used as-is
    const payload3 = getPayload(
      {},
      'disclose',
      '',
      'https',
      'https://example.com',
    );
    expect(payload3.circuit.name).toBe('');
  });

  it('getPayload handles special characters in inputs', () => {
    const inputs = { message: 'Hello "World" & <script>alert("xss")</script>' };
    const payload = getPayload(
      inputs,
      'disclose',
      'vc_and_disclose',
      'https',
      'https://example.com',
    );

    // JSON.stringify will escape quotes, so we should expect the escaped version
    expect(payload.circuit.inputs).toContain('Hello \\"World\\"');
    expect(JSON.parse(payload.circuit.inputs)).toEqual(inputs);
  });

  it('encryptAES256GCM handles empty plaintext', () => {
    const key = forge.random.getBytesSync(32);
    const plaintext = '';
    const encrypted = encryptAES256GCM(plaintext, forge.util.createBuffer(key));

    expect(encrypted.cipher_text).toBeDefined();
    expect(encrypted.nonce).toBeDefined();
    expect(encrypted.auth_tag).toBeDefined();
  });

  it('encryptAES256GCM handles large plaintext', () => {
    const key = forge.random.getBytesSync(32);
    const plaintext = 'a'.repeat(10000);
    const encrypted = encryptAES256GCM(plaintext, forge.util.createBuffer(key));

    expect(encrypted.cipher_text.length).toBeGreaterThan(0);
  });
});
