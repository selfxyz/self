import { assert, expect } from 'chai'
import fs from 'fs'
import forge from 'node-forge';
import path from 'path';
const wasm_tester = require("circom_tester").wasm;
import { getCSCAInputs } from '../../../common/src/utils/csca';

describe('DSC chain certificate', function () {
    this.timeout(0); // Disable timeout
    let circuit;
    const n_dsc = 64;
    const k_dsc = 32;
    const n_csca = 64;
    const k_csca = 32;
    const max_cert_bytes = 1664;
    const dsc_path = path.join(__dirname, '../../../common/src/mock_certificates/sha256_rsapss_2048/mock_dsc.pem');
    const csca_path = path.join(__dirname, '../../../common/src/mock_certificates/sha256_rsapss_2048/mock_csca.pem');
    const dscCert = forge.pki.certificateFromPem(fs.readFileSync(dsc_path, 'utf8'));
    const cscaCert = forge.pki.certificateFromPem(fs.readFileSync(csca_path, 'utf8'));

    const inputs = getCSCAInputs(BigInt(0).toString(), dscCert, cscaCert, n_dsc, k_dsc, n_csca, k_csca, max_cert_bytes, true);
    console.log("inputs:", inputs);

    before(async () => {
        const circuitPath = path.resolve(__dirname, '../../circuits/tests/dsc/dsc_sha256_rsapss_2048.circom');
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