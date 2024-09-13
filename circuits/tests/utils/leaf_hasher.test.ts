import { expect } from 'chai';
import { X509Certificate } from 'crypto';
import path from 'path';
import {
  computeLeafFromModulusBigInt,
  getCSCAInputs,
  getTBSHash,
  leafHasherLight,
} from '../../../common/src/utils/csca';
import { wasm as wasm_tester } from 'circom_tester';
import forge from 'node-forge';

import {
  mock_dsc_sha256_rsa_2048,
  mock_csca_sha256_rsa_2048,
  mock_dsc_sha1_rsa_2048,
  mock_csca_sha1_rsa_2048,
} from '../../../common/src/constants/mockCertificates';
import { splitToWords } from '../../../common/src/utils/utils';

function loadCertificates(dscCertContent: string, cscaCertContent: string) {
  const dscCert = new X509Certificate(dscCertContent);
  const cscaCert = new X509Certificate(cscaCertContent);
  const dscCert_forge = forge.pki.certificateFromPem(dscCertContent);
  const cscaCert_forge = forge.pki.certificateFromPem(cscaCertContent);

  return { dscCert, cscaCert, dscCert_forge, cscaCert_forge };
}

describe('LeafHasher Light', function () {
  this.timeout(0);
  let circuit;

  this.beforeAll(async () => {
    const circuitPath = path.resolve(
      __dirname,
      '../../circuits/tests/utils/leafHasherLight_tester.circom'
    );
    circuit = await wasm_tester(circuitPath, {
      include: [
        'node_modules',
        './node_modules/@zk-kit/binary-merkle-root.circom/src',
        './node_modules/circomlib/circuits',
      ],
    });
  });
  describe('Circuit', () => {
    it('should compile and load the circuit', () => {
      expect(circuit).not.to.be.undefined;
    });
  });

  describe('SHA-256 certificates', async () => {
    const { dscCert, cscaCert, dscCert_forge, cscaCert_forge } = loadCertificates(
      mock_dsc_sha256_rsa_2048,
      mock_csca_sha256_rsa_2048
    );
    const bigInt = BigInt(2n ** 4096n - 1n);
    const leaf = computeLeafFromModulusBigInt(bigInt);
    const n = 120;
    const k = 35;
    const bigInt_formatted = splitToWords(bigInt, BigInt(n), BigInt(k));
    const leaf_light = leafHasherLight(bigInt_formatted);
    console.log('\x1b[34m', 'leafHasher: ', leaf, '\x1b[0m');
    console.log('\x1b[34m', 'leafHasherLight: ', leaf_light, '\x1b[0m');

    it('should extract and log certificate information', async () => {
      const inputs = {
        in: splitToWords(bigInt, BigInt(n), BigInt(k)),
      };
      const witness = await circuit.calculateWitness(inputs, true);
      const output = await circuit.getOutput(witness, ['out']);
      console.log('\x1b[34m', 'output: ', output, '\x1b[0m');
    });
  });
});
