import { assert, expect } from 'chai';
import fs from 'fs';
const forge = require('node-forge');
import path from 'path';
import { wasm as wasm_tester } from 'circom_tester';
import { getCSCAInputs } from '../../../common/src/utils/csca';
import {
  mock_dsc_sha256_rsa_2048,
  mock_csca_sha256_rsa_2048,
} from '../../../common/src/constants/mockCertificates';
import { k_dsc, n_dsc } from '../../../common/src/constants/constants';

describe('DSC chain certificate - SHA256 RSA', function () {
  this.timeout(0); // Disable timeout
  let circuit;
  const max_cert_bytes = 960;
  const dscCert = forge.pki.certificateFromPem(mock_dsc_sha256_rsa_2048);
  const cscaCert = forge.pki.certificateFromPem(mock_csca_sha256_rsa_2048);

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
      '../../circuits/tests/dsc/dsc_sha256_rsa_2048.circom'
    );
    circuit = await wasm_tester(circuitPath, {
      include: [
        'node_modules',
        './node_modules/@zk-kit/binary-merkle-root.circom/src',
        './node_modules/circomlib/circuits',
      ],
    });
  });

  it('verify dsc has been signed by the csca', () => {
    const tbsCertAsn1 = forge.pki.getTBSCertificate(dscCert);
    const tbsCertDer = forge.asn1.toDer(tbsCertAsn1).getBytes();
    const md = forge.md.sha256.create();
    md.update(tbsCertDer);
    const tbsHash = md.digest().getBytes();
    const signature = dscCert.signature;
    const publicKey = cscaCert.publicKey;
    const verified = publicKey.verify(tbsHash, signature);
    expect(verified).to.be.true;
  });

  it('should compile and load the circuit', () => {
    expect(circuit).to.not.be.undefined;
  });

  it('should compute the correct output', async () => {
    const witness = await circuit.calculateWitness(inputs.inputs, true);
  });
});
