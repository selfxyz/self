import { describe, expect, it } from 'vitest';

import { humanizeContractError } from './contractErrors.js';

describe('humanizeContractError', () => {
  it('decodes a known custom error selector', () => {
    // 0xda7bd3a6 = InvalidVcAndDiscloseProof
    expect(humanizeContractError('0xda7bd3a6')).toBe('Invalid Vc And Disclose Proof');
  });

  it('decodes a known SCREAMING_CASE selector', () => {
    // 0x034acfcc = REGISTERED_COMMITMENT
    expect(humanizeContractError('0x034acfcc')).toBe('Registered Commitment');
  });

  it('decodes Error(string) standard revert', () => {
    // ABI encoding of Error("Insufficient balance")
    const encoded =
      '0x08c379a0' +
      '0000000000000000000000000000000000000000000000000000000000000020' +
      '0000000000000000000000000000000000000000000000000000000000000014' +
      '496e73756666696369656e742062616c616e636500000000000000000000000000';
    expect(humanizeContractError(encoded)).toBe('Insufficient balance');
  });

  it('decodes Panic(uint256) arithmetic overflow', () => {
    const encoded =
      '0x4e487b71' + '0000000000000000000000000000000000000000000000000000000000000011';
    expect(humanizeContractError(encoded)).toBe('Arithmetic overflow or underflow');
  });

  it('decodes Panic(uint256) division by zero', () => {
    const encoded =
      '0x4e487b71' + '0000000000000000000000000000000000000000000000000000000000000012';
    expect(humanizeContractError(encoded)).toBe('Division or modulo by zero');
  });

  it('decodes Panic(uint256) array out of bounds', () => {
    const encoded =
      '0x4e487b71' + '0000000000000000000000000000000000000000000000000000000000000032';
    expect(humanizeContractError(encoded)).toBe('Array out of bounds');
  });

  it('decodes Panic(uint256) unknown code gracefully', () => {
    const encoded =
      '0x4e487b71' + '00000000000000000000000000000000000000000000000000000000000000ff';
    expect(humanizeContractError(encoded)).toBe('Contract panic (code 255)');
  });

  it('returns original string for unknown selector', () => {
    expect(humanizeContractError('0xdeadbeef')).toBe('0xdeadbeef');
  });

  it('returns original string for non-hex input', () => {
    expect(humanizeContractError('something went wrong')).toBe('something went wrong');
  });

  it('returns original string for empty input', () => {
    expect(humanizeContractError('')).toBe('');
  });

  it('handles mixed-case selector input', () => {
    expect(humanizeContractError('0xDA7BD3A6')).toBe('Invalid Vc And Disclose Proof');
  });

  it('decodes a known selector with ABI-encoded params appended', () => {
    // Custom errors with parameters include the selector followed by ABI-encoded data
    const selectorWithPayload = '0xda7bd3a6' + '0'.repeat(64);
    expect(humanizeContractError(selectorWithPayload)).toBe('Invalid Vc And Disclose Proof');
  });
});
