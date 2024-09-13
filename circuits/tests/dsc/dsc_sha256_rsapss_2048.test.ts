import { assert, expect } from 'chai';
import fs from 'fs';
const forge = require('node-forge');
import path from 'path';
import { wasm as wasm_tester } from 'circom_tester';
import { getCSCAInputs } from '../../../common/src/utils/csca';
import crypto from 'crypto';
import {
  mock_dsc_sha256_rsapss_2048,
  mock_csca_sha256_rsapss_2048,
} from '../../../common/src/constants/mockCertificates';
import { k_dsc, n_dsc } from '../../../common/src/constants/constants';

describe('DSC chain certificate - SHA256 RSA-PSS', function () {
  this.timeout(0); // Disable timeout
  let circuit;
  const max_cert_bytes = 960;
  const dscCert = forge.pki.certificateFromPem(mock_dsc_sha256_rsapss_2048);
  const cscaCert = forge.pki.certificateFromPem(mock_csca_sha256_rsapss_2048);

  const inputs = getCSCAInputs(
    BigInt(0).toString(),
    dscCert,
    cscaCert,
    n_dsc,
    k_dsc,
    n_dsc,
    k_dsc,
    max_cert_bytes,
    true
  );

  before(async () => {
    const circuitPath = path.resolve(
      __dirname,
      '../../circuits/tests/dsc/dsc_sha256_rsapss_2048.circom'
    );
    circuit = await wasm_tester(circuitPath, {
      include: [
        'node_modules',
        './node_modules/@zk-kit/binary-merkle-root.circom/src',
        './node_modules/circomlib/circuits',
      ],
    });
  });
  // TODO: Verify the certificate chain in ts too.
  // it('verify dsc has been signed by the csca using RSA-PSS', () => {
  //     // Extract TBS (To Be Signed) certificate
  //     const tbsCertAsn1 = forge.pki.getTBSCertificate(dscCert);
  //     const tbsCertDer = forge.asn1.toDer(tbsCertAsn1).getBytes();

  //     // Create SHA-256 hash of the TBS certificate
  //     const tbsHash = crypto.createHash('sha256').update(Buffer.from(tbsCertDer, 'binary')).digest();

  //     // Extract signature from DSC certificate
  //     const signature = Buffer.from(dscCert.signature, 'binary');

  //     // Get public key from CSCA certificate
  //     const publicKeyPem = forge.pki.publicKeyToPem(cscaCert.publicKey);
  //     const publicKey = crypto.createPublicKey(publicKeyPem);

  //     // Verify signature
  //     const pssOptions = {
  //         saltLength: 32,
  //         mgf1Hash: 'sha256'
  //     };

  //     try {
  //         const verifier = crypto.createVerify('RSA-SHA256');
  //         verifier.update(tbsHash);
  //         const isValid = verifier.verify({
  //             key: publicKey,
  //             padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
  //             saltLength: pssOptions.saltLength
  //         }, signature);

  //         console.log('TBS Hash:', tbsHash.toString('hex'));
  //         console.log('Signature:', signature.toString('hex'));
  //         console.log('Public Key:', publicKeyPem);
  //         console.log('Verification result:', isValid);

  //         expect(isValid).to.be.true;
  //     } catch (error) {
  //         console.error('Verification error:', error);
  //         throw error;
  //     }
  // })

  it('should compile and load the circuit', () => {
    expect(circuit).to.not.be.undefined;
  });

  it('should compute the correct output', async () => {
    const witness = await circuit.calculateWitness(inputs.inputs, true);
  });
  it('should fail to calculate witness with invalid inputs', async function () {
    try {
      const invalidInputs = {
        ...inputs.inputs,
        dsc_signature: Array(k_dsc)
          .fill(0)
          .map((byte) => BigInt(byte).toString()),
      };
      await circuit.calculateWitness(invalidInputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
    }
  });
});
