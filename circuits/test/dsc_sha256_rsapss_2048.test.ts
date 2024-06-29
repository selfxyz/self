import { assert, expect } from 'chai'
import fs from 'fs'
import jsrsasign from 'jsrsasign';
import path from 'path';
const wasm_tester = require("circom_tester").wasm;
import { splitToWords } from '../../common/src/utils/utils';
import { sha256Pad } from '../../common/src/utils/shaPad';
import { findStartIndex, getCSCAInputs } from '../../common/src/utils/csca';
import { readCertificate } from '../../common/src/utils/certificates';

describe('DSC chain certificate', function () {
    this.timeout(0); // Disable timeout
    let circuit;
    const n_dsc = 64;
    const k_dsc = 32;
    const n_csca = 64;
    const k_csca = 32;
    const max_cert_bytes = 1664;
    const dsc_path = path.join(__dirname, '../../common/src/mock_certificates/sha256_rsapss_2048/mock_dsc.pem');
    const csca_path = path.join(__dirname, '../../common/src/mock_certificates/sha256_rsapss_2048/mock_csca.pem');



    const dscCert = readCertificate(dsc_path);
    const cscaCert = readCertificate(csca_path);


    const inputs = getCSCAInputs(dscCert, cscaCert, n_dsc, k_dsc, n_csca, k_csca, max_cert_bytes, true);
    console.log("inputs:", inputs);

    before(async () => {
        circuit = await wasm_tester(
            path.join(__dirname, '../circuits/tests/certificates/dsc_sha256_rsapss_2048.circom'),
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