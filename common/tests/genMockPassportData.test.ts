import { describe, expect, it } from 'vitest';

import { genAndInitMockPassportData } from '../src/utils/passports/genMockPassportData.js';
import { parsePassportData } from '../src/utils/passports/passport_parsing/parsePassportData.js';
import type { PassportData, SignatureAlgorithm } from '../src/utils/types.js';

const testCases = [
  { dgHashAlgo: 'sha1', eContentHashAlgo: 'sha1', sigAlg: 'rsa_sha1_65537_2048' },
  { dgHashAlgo: 'sha1', eContentHashAlgo: 'sha1', sigAlg: 'rsa_sha256_65537_2048' },
  { dgHashAlgo: 'sha256', eContentHashAlgo: 'sha256', sigAlg: 'rsapss_sha256_65537_2048' },
  { dgHashAlgo: 'sha256', eContentHashAlgo: 'sha256', sigAlg: 'ecdsa_sha256_secp256r1_256' },
  { dgHashAlgo: 'sha256', eContentHashAlgo: 'sha256', sigAlg: 'ecdsa_sha256_brainpoolP256r1_256' },
  { dgHashAlgo: 'sha1', eContentHashAlgo: 'sha1', sigAlg: 'ecdsa_sha1_secp256r1_256' },
];

describe('Mock Passport Data Generator', () => {
  testCases.forEach(({ dgHashAlgo, eContentHashAlgo, sigAlg }) => {
    it(`should generate valid passport data for ${sigAlg}`, () => {
      const passportData = genAndInitMockPassportData(
        dgHashAlgo,
        eContentHashAlgo,
        sigAlg as SignatureAlgorithm,
        'FRA',
        '000101',
        '300101'
      );
      expect(verify(passportData, dgHashAlgo, eContentHashAlgo, sigAlg)).toBe(true);
    });
  });
});

function verify(
  passportData: PassportData,
  dgHashAlgo: string,
  eContentHashAlgo: string,
  sigAlg: string
): boolean {
  const passportMetaData = parsePassportData(passportData);
  // console.log('passportMetaData', passportMetaData);

  expect(passportMetaData.dg1HashFunction).toBe(dgHashAlgo);
  expect(passportMetaData.eContentHashFunction).toBe(eContentHashAlgo);

  // regex to find the signature algorithm (ecdsa or rsa/rsapss) before first underscore
  const signatureAlgorithm = sigAlg.match(/^([^_]+)/)?.[1];

  expect(passportMetaData.signatureAlgorithm).toBe(signatureAlgorithm);

  return true;
}
