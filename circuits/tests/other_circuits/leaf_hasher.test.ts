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
  mock_dsc_sha256_ecdsa,
} from '../../../common/src/constants/mockCertificates';
import { hexToDecimal, splitToWords, toUnsignedByte } from '../../../common/src/utils/utils';
import { getLeaf, customHasher } from '../../../common/src/utils/pubkeyTree';
import {
  k_dsc,
  k_dsc_ecdsa,
  n_dsc,
  n_dsc_ecdsa,
  SignatureAlgorithmIndex,
} from '../../../common/src/constants/constants';
import {
  parseCertificate,
  parseDSC,
} from '../../../common/src/utils/certificates/handleCertificate';
import { genMockPassportData } from '../../../common/src/utils/genMockPassportData';
import { generateCircuitInputsInCircuits } from '../utils/generateMockInputsInCircuits';

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
      '../../circuits/tests/utils/leafHasher_tester.circom'
    );
    circuit = await wasm_tester(circuitPath, {
      include: [
        'node_modules',
        './node_modules/@zk-kit/binary-merkle-root.circom/src',
        './node_modules/circomlib/circuits',
      ],
    });
  });

  // describe('CustomHasher - getLeaf ECDSA', async () => {
  //   const cert = mock_dsc_sha256_ecdsa;
  //   const { signatureAlgorithm, hashFunction, x, y, bits, curve, exponent } = parseCertificate(cert);
  //   console.log(parseCertificate(cert));
  //   const leaf_light = getLeaf(cert, n_dsc_ecdsa, k_dsc_ecdsa);
  //   console.log('\x1b[34m', 'customHasher output: ', leaf_light, '\x1b[0m');

  //   const passportData = genMockPassportData('ecdsa_sha256', 'FRA', '000101', '300101');
  //   const mock_inputs = generateCircuitInputsInCircuits(passportData, 'register');

  //   const signatureAlgorithmIndex = SignatureAlgorithmIndex[`${signatureAlgorithm}_${curve || exponent}_${hashFunction}_${bits}`];
  //   console.log('\x1b[34m', 'signatureAlgorithmIndex: ', signatureAlgorithmIndex, '\x1b[0m');
  //   it('should extract and log certificate information', async () => {
  //     const inputs = {
  //       in: mock_inputs.pubKey,
  //       sigAlg: signatureAlgorithmIndex,
  //     };
  //     const witness = await circuit.calculateWitness(inputs, true);
  //     const leafValueCircom = (await circuit.getOutput(witness, ['out'])).out;
  //     console.log('\x1b[34m', 'leafValueCircom: ', leafValueCircom, '\x1b[0m');
  //     expect(leafValueCircom).to.equal(leaf_light);
  //   });
  // });

  describe('CustomHasher - customHasher', async () => {
    const passportData = genMockPassportData('rsa_sha256', 'FRA', '000101', '300101');
    it('should extract and log certificate information', async () => {
      const inputs = {
        in: passportData.dg2Hash.map((x) => toUnsignedByte(x).toString()),
      };
      const witness = await circuit.calculateWitness(inputs, true);
      const leafValueCircom = (await circuit.getOutput(witness, ['out'])).out;
      console.log('\x1b[34m', 'hashValueCircom: ', leafValueCircom, '\x1b[0m');

      const hashValue = customHasher(passportData.dg2Hash.map((x) => toUnsignedByte(x).toString()));
      console.log('\x1b[34m', 'hashValue: ', hashValue, '\x1b[0m');
    });
  });

  // describe('CustomHasher - getLeaf RSA', async () => {
  //   const cert = mock_dsc_sha1_rsa_2048;
  //   const { signatureAlgorithm, hashFunction, modulus, x, y, bits, curve, exponent } =
  //     parseCertificate(cert);
  //   console.log(parseCertificate(cert));
  //   const leaf_light = getLeaf(cert, n_dsc, k_dsc);
  //   console.log('\x1b[34m', 'customHasher: ', leaf_light, '\x1b[0m');
  //   it('should extract and log certificate information', async () => {
  //     const inputs = {
  //       in: splitToWords(BigInt(hexToDecimal(modulus)), n_dsc, k_dsc),
  //       sigAlg:
  //         SignatureAlgorithmIndex[
  //         `${signatureAlgorithm}_${curve || exponent}_${hashFunction}_${bits}`
  //         ],
  //     };
  //     const witness = await circuit.calculateWitness(inputs, true);
  //     const leafValueCircom = (await circuit.getOutput(witness, ['out'])).out;
  //     expect(leafValueCircom).to.equal(leaf_light);
  //   });
  // });
});
