import { poseidon2 } from 'poseidon-lite';

import { flexiblePoseidon } from './hash.js';

export function bigIntToString(bigInt: bigint): string {
  if (bigInt === 0n) return '';

  let result = '';
  let tempBigInt = bigInt;

  while (tempBigInt > 0n) {
    const charCode = Number(tempBigInt & 0xffn);
    result = String.fromCharCode(charCode) + result;
    tempBigInt = tempBigInt >> 8n;
  }

  return result;
}

export function formatEndpoint(endpoint: string): string {
  if (!endpoint) return '';
  return endpoint.replace(/^https?:\/\//, '').split('/')[0];
}

export function hashEndpointWithScope(endpoint: string, scope: string): string {
  const formattedEndpoint = formatEndpoint(endpoint);
  const endpointChunks: string[] = [];
  let remaining = formattedEndpoint;
  while (remaining.length > 0) {
    const chunk = remaining.slice(0, 31);
    endpointChunks.push(chunk);
    remaining = remaining.slice(31);
  }
  if (endpointChunks.length > 16) {
    throw new Error('Endpoint must be less than 496 characters');
  }
  const chunkedEndpointBigInts = endpointChunks.map(stringToBigInt);
  const endpointHash = flexiblePoseidon(chunkedEndpointBigInts);
  const scopeBigInt = stringToBigInt(scope);
  return poseidon2([endpointHash, scopeBigInt]).toString();
}

export function stringToBigInt(str: string): bigint {
  // Validate input contains only ASCII characters
  if (!/^[\x00-\x7F]*$/.test(str)) {
    throw new Error('Input must contain only ASCII characters (0-127)');
  }

  let result = 0n;
  for (let i = 0; i < str.length; i++) {
    result = (result << 8n) | BigInt(str.charCodeAt(i));
  }

  // Check size limit
  const MAX_VALUE = (1n << 248n) - 1n;
  if (result > MAX_VALUE) {
    console.log(`str: ${str}, str.length: ${str.length}`);
    throw new Error('Resulting BigInt exceeds maximum size of 31 bytes');
  }

  return result;
}
