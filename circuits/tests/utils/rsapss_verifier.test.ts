import { expect } from 'chai';
import { X509Certificate } from 'crypto';
import path from 'path';
import { getCSCAInputs, getTBSHash } from '../../../common/src/utils/csca';
const wasm_tester = require('circom_tester').wasm;
import forge from 'node-forge';

import {
  mock_dsc_sha256_rsapss_2048,
  mock_csca_sha256_rsapss_2048,
} from '../../../common/src/constants/mockCertificates';

function loadCertificates(dscCertContent: string, cscaCertContent: string) {
  const dscCert = new X509Certificate(dscCertContent);
  const cscaCert = new X509Certificate(cscaCertContent);
  const dscCert_forge = forge.pki.certificateFromPem(dscCertContent);
  const cscaCert_forge = forge.pki.certificateFromPem(cscaCertContent);

  return { dscCert, cscaCert, dscCert_forge, cscaCert_forge };
}

describe('RSAPSS Verifier', function () {
  this.timeout(0);
  let circuit;

  this.beforeAll(async () => {
    const circuitPath = path.resolve(__dirname, '../../circuits/tests/utils/rsapss_verifier.circom');
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
      mock_dsc_sha256_rsapss_2048,
      mock_csca_sha256_rsapss_2048
    );
    const n = 64;
    const k = 32;

    it('should verify DSC has been signed by the CSCA', () => {
      const isVerified = dscCert.verify(cscaCert.publicKey);
      console.log(`SHA-256 DSC certificate verification result: ${isVerified}`);
      expect(isVerified).to.be.true;
    });

    it('should extract and log certificate information', async () => {
      const csca_inputs = getCSCAInputs('0', dscCert_forge, cscaCert_forge, n, k, n, k, 960, true);
      // const tbsCertificateHashFormatted = getTBSHash(dscCert_forge, 'sha256', n, k);

      const inputs = {
        raw_message: csca_inputs.raw_dsc_cert,
        raw_message_padded_bytes: csca_inputs.raw_dsc_cert_padded_bytes,
        signature: csca_inputs.dsc_signature,
        modulus: csca_inputs.csca_modulus,
      };
      //const witness = await circuit.calculateWitness(inputs, true);
    });
  });
});
