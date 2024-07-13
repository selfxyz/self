import { expect } from 'chai';
import fs from 'fs';
import { X509Certificate, createPublicKey, KeyObject, createHash } from 'crypto';
import { splitToWords } from '../../common/src/utils/utils';
import path from 'path';
import { derToBytes, getCSCAInputs, getTBSHash } from '../../common/src/utils/csca';
const wasm_tester = require("circom_tester").wasm;
import forge from 'node-forge';

function loadCertificates(dscCertPath: string, cscaCertPath: string) {
    const dscCert = new X509Certificate(fs.readFileSync(dscCertPath));
    const cscaCert = new X509Certificate(fs.readFileSync(cscaCertPath));
    const dscCert_forge = forge.pki.certificateFromPem(fs.readFileSync(dscCertPath).toString());
    const cscaCert_forge = forge.pki.certificateFromPem(fs.readFileSync(cscaCertPath).toString());

    return { dscCert, cscaCert, dscCert_forge, cscaCert_forge };
}


describe('DSC chain certificate', function () {
    this.timeout(0);

    const dsc_sha256 = '../common/src/mock_certificates/sha256_rsa_2048/mock_dsc.crt';
    const csca_sha256 = '../common/src/mock_certificates/sha256_rsa_2048/mock_csca.crt';
    const dsc_sha1 = '../common/src/mock_certificates/sha1_rsa_2048/mock_dsc.crt';
    const csca_sha1 = '../common/src/mock_certificates/sha1_rsa_2048/mock_csca.crt';
    let circuit;

    this.beforeAll(async () => {
        const { dscCert, cscaCert } = loadCertificates(dsc_sha256, csca_sha256);
        const circuitPath = path.resolve(__dirname, '../../circuits/circuits/tests/rsa_verifier.circom');
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
    describe('Circuit', () => {
        it('should compile and load the circuit', () => {
            expect(circuit).not.to.be.undefined;
        });
    });

    describe('SHA-256 certificates', async () => {
        const { dscCert, cscaCert, dscCert_forge, cscaCert_forge } = loadCertificates(dsc_sha256, csca_sha256);

        it('should verify DSC has been signed by the CSCA', () => {
            const isVerified = dscCert.verify(cscaCert.publicKey);
            console.log(`SHA-256 DSC certificate verification result: ${isVerified}`);
            expect(isVerified).to.be.true;
        });

        it('should extract and log certificate information', async () => {
            const csca_inputs = getCSCAInputs("0", dscCert_forge, cscaCert_forge, 64, 32, 64, 32, 2048, true);
            const tbsCertificateHashFormatted = getTBSHash(dscCert_forge, 'sha256');

            const inputs = {
                "message": tbsCertificateHashFormatted,
                "signature": csca_inputs.dsc_signature,
                "modulus": csca_inputs.csca_modulus
            }
            console.log("final inputs: ", inputs);
            const witness = await circuit.calculateWitness(inputs, true);
            console.log(witness);
        });
    });

    describe('SHA-1 certificates', () => {
        const { dscCert, cscaCert, dscCert_forge, cscaCert_forge } = loadCertificates(dsc_sha1, csca_sha1);

        it('should verify DSC has been signed by the CSCA', () => {
            const isVerified = dscCert.verify(cscaCert.publicKey);
            console.log(`SHA-1 DSC certificate verification result: ${isVerified}`);
            expect(isVerified).to.be.true;
        });

        it('should extract and log certificate information', async () => {
            const csca_inputs = getCSCAInputs("0", dscCert_forge, cscaCert_forge, 64, 32, 64, 32, 2048, true);
            const tbsCertificateHashFormatted = getTBSHash(dscCert_forge, 'sha1');

            const inputs = {
                "message": tbsCertificateHashFormatted,
                "signature": csca_inputs.dsc_signature,
                "modulus": csca_inputs.csca_modulus
            }
            console.log("final inputs: ", inputs);
            const witness = await circuit.calculateWitness(inputs, true);
            console.log(witness);
        });
    });
});