import { assert, expect } from 'chai'
import fs from 'fs'
const forge = require('node-forge');
import path from 'path';
const wasm_tester = require("circom_tester").wasm;
import { splitToWords } from '../../common/src/utils/utils';
import { sha256Pad } from '../../common/src/utils/shaPad';
import { findStartIndex, getCSCAInputs } from '../../common/src/utils/csca';

describe('DSC chain certificate', function () {
    this.timeout(0); // Disable timeout
    let circuit;
    const n_dsc = 121;
    const k_dsc = 17;
    const n_csca = 121;
    const k_csca = 34;
    const max_cert_bytes = 1664;
    const dsc = fs.readFileSync('../common/src/mock_certificates/sha256_rsa_2048/mock_dsc.crt', 'utf8');
    const csca = fs.readFileSync('../common/src/mock_certificates/sha256_rsa_2048/mock_csca.crt', 'utf8');
    const dscCert = forge.pki.certificateFromPem(dsc);
    const cscaCert = forge.pki.certificateFromPem(csca);


    const inputs = getCSCAInputs(dscCert, cscaCert, n_dsc, k_dsc, n_csca, k_csca, max_cert_bytes, true);
    console.log("inputs:", inputs);

    before(async () => {
        circuit = await wasm_tester(
            path.join(__dirname, '../circuits/tests/certificates/dsc_2048.circom'),
            {
                include: [
                    "node_modules",
                ]
            }
        );
    });

    it('should compile and load the circuit', () => {
        expect(circuit).to.not.be.undefined;
    })

    it('should compute the correct output', async () => {
        console.log("Inputs:", inputs);
        const witness = await circuit.calculateWitness(inputs, true);
        console.log(witness);
    })

})