import { assert, expect } from 'chai'
import fs from 'fs'
const forge = require('node-forge');
import path from 'path';
const wasm_tester = require("circom_tester").wasm;
import { findStartIndex, getCSCAInputs } from '../../../common/src/utils/csca';

describe('DSC chain certificate', function () {
    this.timeout(0); // Disable timeout
    let circuit;
    const n_dsc = 64;
    const k_dsc = 32;
    const n_csca = 64;
    const k_csca = 32;
    const max_cert_bytes = 1664;
    const dsc = fs.readFileSync('../common/src/mock_certificates/sha256_rsa_2048/mock_dsc.crt', 'utf8');
    const csca = fs.readFileSync('../common/src/mock_certificates/sha256_rsa_2048/mock_csca.crt', 'utf8');
    const dscCert = forge.pki.certificateFromPem(dsc);
    const cscaCert = forge.pki.certificateFromPem(csca);


    const inputs = getCSCAInputs(BigInt(0).toString(), dscCert, cscaCert, n_dsc, k_dsc, n_csca, k_csca, max_cert_bytes, true);
    console.log("inputs:", inputs);

    console.log("Current directory:", __dirname);

    before(async () => {
        const circuitPath = path.resolve(__dirname, '../../circuits/tests/dsc/dsc_sha256_rsa_2048.circom');
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

    it('should compile and load the circuit', () => {
        expect(circuit).to.not.be.undefined;
    })

    it('should compute the correct output', async () => {
        console.log("Inputs:", inputs);
        const witness = await circuit.calculateWitness(inputs, true);
        console.log(witness);
    })

})