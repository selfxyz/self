import { getCSCAInputs } from "../../common/src/utils/csca";
import { mock_csca_sha256_rsa_4096, mock_dsc_sha256_rsa_4096, mock_csca_sha1_rsa_4096, mock_dsc_sha1_rsa_4096 } from "../../common/src/constants/mockCertificates";
import forge from "node-forge";
import { MODAL_SERVER_ADDRESS } from "../../common/src/constants/constants";
import axios from 'axios';
import fs from 'fs';
import { groth16 } from 'snarkjs'
import { expect } from "chai";
import path from 'path';

const n_dsc = 121;
const k_dsc = 17;
const n_csca = 121;
const k_csca = 34;
const max_cert_bytes = 1664;
const dscCert_sha256_rsa = forge.pki.certificateFromPem(mock_dsc_sha256_rsa_4096);
const cscaCert_sha256_rsa = forge.pki.certificateFromPem(mock_csca_sha256_rsa_4096);
const dscCert_sha1_rsa = forge.pki.certificateFromPem(mock_dsc_sha1_rsa_4096);
const cscaCert_sha1_rsa = forge.pki.certificateFromPem(mock_csca_sha1_rsa_4096);

const vkey_sha256_rsa = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/vkey/dsc_sha256_rsa_4096_vkey.json'), 'utf8'));
const vkey_sha1_rsa = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/vkey/dsc_sha1_rsa_4096_vkey.json'), 'utf8'));

describe('MODAL PROVER', function () {
    this.timeout(0); // Disable timeout
    describe("SHA256 RSA", async () => {
        it("verify proof", async () => {
            const circuitInputs = getCSCAInputs(
                BigInt(0).toString(),
                dscCert_sha256_rsa,
                cscaCert_sha256_rsa,
                n_dsc,
                k_dsc,
                n_csca,
                k_csca,
                max_cert_bytes,
                true
            );
            const inputs = {
                "signature_algorithm": "sha256_rsa",
                "inputs": circuitInputs
            }
            //console.log(JSON.stringify(inputs));
            console.log('\x1b[34msending request to modal server\x1b[0m');
            const response = await sendCSCARequest(inputs);
            console.log('\x1b[34mresponse from modal server received\x1b[0m');
            const proof = JSON.parse(JSON.stringify(response));
            const verifyProof = await groth16.verify(
                vkey_sha256_rsa,
                proof.pub_signals,
                proof.proof
            )
            expect(verifyProof).to.be.true;
            console.log('\x1b[32mproof for sha256 rsa verified\x1b[0m');
        });
    });

    describe("SHA1 RSA", async () => {
        it("verify proof", async () => {
            const circuitInputs = getCSCAInputs(
                BigInt(0).toString(),
                dscCert_sha1_rsa,
                cscaCert_sha1_rsa,
                n_dsc,
                k_dsc,
                n_csca,
                k_csca,
                max_cert_bytes,
                true
            );
            const inputs = {
                "signature_algorithm": "sha1_rsa",
                "inputs": circuitInputs
            }
            //console.log(JSON.stringify(inputs));

            console.log('\x1b[34msending request to modal server\x1b[0m');
            const response = await sendCSCARequest(inputs);
            console.log('\x1b[34mresponse from modal server received\x1b[0m');
            const proof = JSON.parse(JSON.stringify(response));
            const verifyProof = await groth16.verify(
                vkey_sha1_rsa,
                proof.pub_signals,
                proof.proof
            )
            expect(verifyProof).to.be.true;
            console.log('\x1b[32mproof for sha1 rsa verified\x1b[0m');

        });
    });
});

export const sendCSCARequest = async (inputs_csca: any): Promise<any> => {
    try {
        const response = await axios.post(MODAL_SERVER_ADDRESS, inputs_csca, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Axios error:', error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
            }
        } else {
            console.error('Unexpected error:', error);
        }
        throw error;
    }
};