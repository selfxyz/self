import { expect } from 'chai';
import { X509Certificate } from 'crypto';
import path from 'path';
import { getCSCAInputs, getTBSHash } from '../../../common/src/utils/csca';
const wasm_tester = require('circom_tester').wasm;
import forge from 'node-forge';

import {
  mock_dsc_sha256_rsa_2048,
  mock_csca_sha256_rsa_2048,
  mock_dsc_sha1_rsa_2048,
  mock_csca_sha1_rsa_2048,
} from '../../../common/src/constants/mockCertificates';

function loadCertificates(dscCertContent: string, cscaCertContent: string) {
  const dscCert = new X509Certificate(dscCertContent);
  const cscaCert = new X509Certificate(cscaCertContent);
  const dscCert_forge = forge.pki.certificateFromPem(dscCertContent);
  const cscaCert_forge = forge.pki.certificateFromPem(cscaCertContent);

  return { dscCert, cscaCert, dscCert_forge, cscaCert_forge };
}

describe('RSA Verifier', function () {
  this.timeout(0);
  let circuit;

  this.beforeAll(async () => {
    const circuitPath = path.resolve(__dirname, '../../circuits/tests/utils/rsa_verifier.circom');
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
    const n = 121;
    const k = 17;

    it('should verify DSC has been signed by the CSCA', () => {
      const isVerified = dscCert.verify(cscaCert.publicKey);
      console.log(`SHA-256 DSC certificate verification result: ${isVerified}`);
      expect(isVerified).to.be.true;
    });

    // it('should extract and log certificate information', async () => {
    //   const csca_inputs = getCSCAInputs('0', dscCert_forge, cscaCert_forge, n, k, n, k, 2048, true);
    //   const tbsCertificateHashFormatted = getTBSHash(dscCert_forge, 'sha256', n, k);

    //   const inputs = {
    //     message: tbsCertificateHashFormatted,
    //     signature: csca_inputs.inputs.dsc_signature,
    //     modulus: csca_inputs.inputs.dsc_modulus,
    //   };
    //   const witness = await circuit.calculateWitness(inputs, true);
    // });


  });

  describe('SHA-1 certificates', () => {
    const { dscCert, cscaCert, dscCert_forge, cscaCert_forge } = loadCertificates(
      mock_dsc_sha1_rsa_2048,
      mock_csca_sha1_rsa_2048
    );

    it('should verify DSC has been signed by the CSCA', () => {
      const isVerified = dscCert.verify(cscaCert.publicKey);
      console.log(`SHA-1 DSC certificate verification result: ${isVerified}`);
      expect(isVerified).to.be.true;
    });
    /// TODO: Use SHA1RSA verifier circuit (won't work either case because of padding)
    // it('should extract and log certificate information', async () => {
    //     const csca_inputs = getCSCAInputs("0", dscCert_forge, cscaCert_forge, 64, 32, 64, 32, 2048, true);
    //     const tbsCertificateHashFormatted = getTBSHash(dscCert_forge, 'sha1');

    //     const inputs = {
    //         "message": tbsCertificateHashFormatted,
    //         "signature": csca_inputs.dsc_signature,
    //         "modulus": csca_inputs.csca_modulus
    //     }
    //     console.log("final inputs: ", inputs);
    //     const witness = await circuit.calculateWitness(inputs, true);
    //     console.log(witness);
    // });
  });
});
