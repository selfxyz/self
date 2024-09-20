import { assert, expect } from 'chai';
import fs from 'fs';
const forge = require('node-forge');
import path from 'path';
import { wasm as wasm_tester } from 'circom_tester';
import { getCSCAInputs } from '../../common/src/utils/csca';
import {
  mock_dsc_sha1_rsa_2048,
  mock_dsc_sha256_rsa_2048,
  mock_dsc_sha256_rsapss_2048,
  mock_csca_sha1_rsa_2048,
  mock_csca_sha256_rsa_2048,
  mock_csca_sha256_rsapss_2048,
} from '../../common/src/constants/mockCertificates';
import { k_dsc, n_dsc } from '../../common/src/constants/constants';
import { getCircuitName } from '../../common/src/utils/certificates/handleCertificate';
import { customHasher } from '../../common/src/utils/pubkeyTree';
import { poseidon2 } from 'poseidon-lite';

const sigAlgs = [
  { sigAlg: 'rsa', hashFunction: 'sha256' },
  // { sigAlg: 'rsa', hashFunction: 'sha1' },
  // { sigAlg: 'rsapss', hashFunction: 'sha256' },
];

sigAlgs.forEach(({ sigAlg, hashFunction }) => {
  describe(`DSC chain certificate - ${hashFunction.toUpperCase()} ${sigAlg.toUpperCase()}`, function () {
    this.timeout(0); // Disable timeout
    let circuit;
    const max_cert_bytes = 960;

    // Mock certificates based on signature algorithm and hash function
    let dscCertPem;
    let cscaCertPem;

    switch (`${sigAlg}_${hashFunction}`) {
      case 'rsa_sha256':
        dscCertPem = mock_dsc_sha256_rsa_2048;
        cscaCertPem = mock_csca_sha256_rsa_2048;
        break;
      case 'rsa_sha1':
        dscCertPem = mock_dsc_sha1_rsa_2048;
        cscaCertPem = mock_csca_sha1_rsa_2048;
        break;
      case 'rsapss_sha256':
        dscCertPem = mock_dsc_sha256_rsapss_2048;
        cscaCertPem = mock_csca_sha256_rsapss_2048;
        break;
      default:
        throw new Error('Unsupported signature algorithm and hash function combination');
    }

    const dscCert = forge.pki.certificateFromPem(dscCertPem);
    const cscaCert = forge.pki.certificateFromPem(cscaCertPem);

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
        `../circuits/dsc/instances/${getCircuitName('dsc', sigAlg, hashFunction)}_2048.circom`
      );
      circuit = await wasm_tester(circuitPath, {
        include: [
          'node_modules',
          './node_modules/@zk-kit/binary-merkle-root.circom/src',
          './node_modules/circomlib/circuits',
        ],
      });
    });

    // it('verify dsc has been signed by the csca', () => {
    //   const tbsCertAsn1 = forge.pki.getTBSCertificate(dscCert);
    //   const tbsCertDer = forge.asn1.toDer(tbsCertAsn1).getBytes();
    //   let md;
    //   switch (hashFunction) {
    //     case 'sha256':
    //       md = forge.md.sha256.create();
    //       break;
    //     case 'sha1':
    //       md = forge.md.sha1.create();
    //       break;
    //     default:
    //       throw new Error('Unsupported hash function');
    //   }
    //   md.update(tbsCertDer);
    //   const tbsHash = md.digest().getBytes();
    //   const signature = dscCert.signature;
    //   const publicKey = cscaCert.publicKey;
    //   const verified = publicKey.verify(tbsHash, signature);
    //   expect(verified).to.be.true;
    // });

    it('should compile and load the circuit', () => {
      expect(circuit).to.not.be.undefined;
    });

    it('should compute the correct output', async () => {
      const witness = await circuit.calculateWitness(inputs.inputs, true);
      const blinded_dsc_commitment = (await circuit.getOutput(witness, ['blinded_dsc_commitment'])).blinded_dsc_commitment;
      console.log('\x1b[34m%s\x1b[0m', 'blinded_dsc_commitment: ', blinded_dsc_commitment);
      expect(blinded_dsc_commitment).to.be.not.null;
    });
  });
});
