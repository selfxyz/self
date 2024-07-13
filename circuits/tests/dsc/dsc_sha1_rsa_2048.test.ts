import { assert, expect } from 'chai'
import fs from 'fs'
const forge = require('node-forge');
import path from 'path';
const wasm_tester = require("circom_tester").wasm;
import { splitToWords } from '../../../common/src/utils/utils';
import { sha256Pad } from '../../../common/src/utils/shaPad';
import { findStartIndex, getCSCAInputs } from '../../../common/src/utils/csca';

describe('DSC chain certificate', function () {
    this.timeout(0); // Disable timeout
    let circuit;
    const n_dsc = 121;
    const k_dsc = 17;
    const n_csca = 121;
    const k_csca = 17;
    const max_cert_bytes = 1664;
    const dsc = fs.readFileSync('../common/src/mock_certificates/sha1_rsa_2048/mock_dsc.crt', 'utf8');
    const csca = fs.readFileSync('../common/src/mock_certificates/sha1_rsa_2048/mock_csca.crt', 'utf8');
    const dscCert = forge.pki.certificateFromPem(dsc);
    const cscaCert = forge.pki.certificateFromPem(csca);


    const inputs = getCSCAInputs(BigInt(0).toString(), dscCert, cscaCert, n_dsc, k_dsc, n_csca, k_csca, max_cert_bytes, true);
    //    console.log("inputs:", inputs);

    before(async () => {
        const circuitPath = path.resolve(__dirname, '../../circuits/tests/dsc/dsc_sha1_rsa_2048.circom');
        console.log("Circuit path:", circuitPath);
        circuit = await wasm_tester(
            circuitPath,
            {
                include: [
                    "node_modules",
                    "./node_modules/@zk-kit/binary-merkle-root.circom/src",
                    "./node_modules/circomlib/circuits"
                ]
            }
        );
    });

    it('verify dsc has been signed by the csca', () => {
        // Extract the TBS (To Be Signed) portion of the DSC
        const dscCert = forge.pki.certificateFromPem(dsc);
        const tbsCertAsn1 = forge.pki.getTBSCertificate(dscCert);
        const tbsCertDer = forge.asn1.toDer(tbsCertAsn1).getBytes();

        // Calculate SHA1 hash of the TBS
        const md = forge.md.sha1.create();
        md.update(tbsCertDer);
        const tbsHash = md.digest().getBytes();
        // convert the tbsHash to a bigint
        const tbsHashHex = forge.util.bytesToHex(tbsHash);
        const tbsHashBigInt = BigInt('0x' + tbsHashHex);
        console.log("tbsHashBigInt:", tbsHashBigInt); // 1257666055290860319966758211557505011700834915784n
        // 1257666055290860319966758211557505011700834915784

        // Extract the signature from the DSC
        const signature = dscCert.signature;

        // Get the public key from the CSCA certificate
        const cscaCert = forge.pki.certificateFromPem(csca);
        const publicKey = cscaCert.publicKey;

        // Verify the signature
        const verified = publicKey.verify(tbsHash, signature);

        expect(verified).to.be.true;
    })

    // it('should compile and load the circuit', () => {
    //     expect(circuit).to.not.be.undefined;
    // })

    it('should compute the correct output', async () => {
        console.log("Inputs:", inputs);
        const witness = await circuit.calculateWitness(inputs, true);
        console.log(witness);
    })

})