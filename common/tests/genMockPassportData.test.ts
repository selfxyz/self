import { assert, expect } from 'chai';
import { describe, it } from 'mocha';
import { genMockPassportData } from '../src/utils/genMockPassportData';
import { PassportData, SignatureAlgorithm } from '../src/utils/types';
import { parsePassportData, verifySignature } from '../src/utils/parsePassportData';

const testCases = [
  { dgHashAlgo: 'sha1', eContentHashAlgo: 'sha1', sigAlg: 'rsa_sha1_65537_2048' },
  { dgHashAlgo: 'sha1', eContentHashAlgo: 'sha1', sigAlg: 'rsa_sha256_65537_2048' },
  { dgHashAlgo: 'sha256', eContentHashAlgo: 'sha256', sigAlg: 'rsapss_sha256_65537_2048' },
  { dgHashAlgo: 'sha256', eContentHashAlgo: 'sha256', sigAlg: 'ecdsa_sha256_secp256r1_256' },
  { dgHashAlgo: 'sha1', eContentHashAlgo: 'sha1', sigAlg: 'ecdsa_sha1_secp256r1_256' },
];

describe('Mock Passport Data Generator', function () {
  this.timeout(0);

  testCases.forEach(({ dgHashAlgo, eContentHashAlgo, sigAlg }) => {
    it(`should generate valid passport data for ${sigAlg}`, () => {
      const passportData = genMockPassportData(
        dgHashAlgo,
        eContentHashAlgo,
        sigAlg as SignatureAlgorithm,
        'FRA',
        '000101',
        '300101'
      );
      expect(passportData).to.exist;
      expect(verify(passportData, dgHashAlgo, eContentHashAlgo)).to.be.true;
    });
  });
});



function verify(passportData: PassportData, dgHashAlgo: string, eContentHashAlgo: string): boolean {
  const passportMetaData = parsePassportData(passportData);
  console.log('passportMetaData', passportMetaData);

  expect(passportMetaData.dg1HashFunction).to.equal(dgHashAlgo);
  expect(passportMetaData.eContentHashFunction).to.equal(eContentHashAlgo);

  return verifySignature(passportData, passportMetaData.signedAttrHashFunction);
}
