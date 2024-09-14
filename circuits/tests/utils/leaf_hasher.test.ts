import { expect } from 'chai';
import { X509Certificate } from 'crypto';
import path from 'path';
import { wasm as wasm_tester } from 'circom_tester';
import forge from 'node-forge';

import {
  mock_dsc_sha256_rsa_2048,
  mock_csca_sha256_rsa_2048,
  mock_dsc_sha1_rsa_2048,
  mock_csca_sha1_rsa_2048,
} from '../../../common/src/constants/mockCertificates';
import { hexToDecimal, splitToWords } from '../../../common/src/utils/utils';
import { getLeaf, leafHasherLight } from '../../../common/src/utils/pubkeyTree';
import { k_dsc, n_dsc, SignatureAlgorithmIndex } from '../../../common/src/constants/constants';
import { parseDSC } from '../../../common/src/utils/handleCertificate';

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

  describe('LeafHasherLight - getLeaf', async () => {
    const { dscCert, cscaCert, dscCert_forge, cscaCert_forge } = loadCertificates(
      mock_dsc_sha256_rsa_2048,
      mock_csca_sha256_rsa_2048
    );
    const { signatureAlgorithm, hashFunction, modulus, x, y } = parseDSC(dscCert.toString());
    const sigAlgIndex = SignatureAlgorithmIndex[`${signatureAlgorithm}_${hashFunction}`]
    const leaf_light = getLeaf(dscCert.toString(), n_dsc, k_dsc);
    console.log('\x1b[34m', 'leafHasherLight: ', leaf_light, '\x1b[0m');

    it('should extract and log certificate information', async () => {
      const inputs = {
        in: splitToWords(BigInt(hexToDecimal(modulus)), n_dsc, k_dsc),
        sigAlg: SignatureAlgorithmIndex[`${signatureAlgorithm}_${hashFunction}`]
      };
      const witness = await circuit.calculateWitness(inputs, true);
      const output = await circuit.getOutput(witness, ['out']);
      console.log('\x1b[34m', 'output: ', output, '\x1b[0m');
    });
  });
});
