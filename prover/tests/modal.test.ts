import { getCSCAInputs, sendCSCARequest } from "../../common/src/utils/csca";
import { mock_csca_sha256_rsa_4096, mock_dsc_sha256_rsa_4096, mock_csca_sha1_rsa_4096, mock_dsc_sha1_rsa_4096, mock_csca_sha256_rsapss_4096, mock_dsc_sha256_rsapss_4096 } from "../../common/src/constants/mockCertificates";
import forge from "node-forge";
import { k_csca, k_dsc, MODAL_SERVER_ADDRESS, n_csca, n_dsc } from "../../common/src/constants/constants";
import axios from 'axios';
import fs from 'fs';
import { groth16 } from 'snarkjs'
import { expect } from "chai";
import path from 'path';

const max_cert_bytes = 1664;
const dscCert_sha256_rsa = forge.pki.certificateFromPem(mock_dsc_sha256_rsa_4096);
const cscaCert_sha256_rsa = forge.pki.certificateFromPem(mock_csca_sha256_rsa_4096);
const dscCert_sha1_rsa = forge.pki.certificateFromPem(mock_dsc_sha1_rsa_4096);
const cscaCert_sha1_rsa = forge.pki.certificateFromPem(mock_csca_sha1_rsa_4096);
const dscCert_sha256_rsapss = forge.pki.certificateFromPem(mock_dsc_sha256_rsapss_4096);
const cscaCert_sha256_rsapss = forge.pki.certificateFromPem(mock_csca_sha256_rsapss_4096);

const vkey_sha256_rsa = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/vkey/dsc_sha256_rsa_4096_vkey.json'), 'utf8'));
const vkey_sha256_rsapss = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/vkey/dsc_sha256_rsapss_4096_vkey.json'), 'utf8'));
const vkey_sha1_rsa = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/vkey/dsc_sha1_rsa_4096_vkey.json'), 'utf8'));

describe('MODAL PROVER', function () {
    this.timeout(0); // Disable timeout

    describe("SHA256 RSAPSS", async () => {
        it("verify proof", async () => {
            const inputs = getCSCAInputs(
                BigInt(0).toString(),
                dscCert_sha256_rsapss,
                cscaCert_sha256_rsapss,
                n_dsc,
                k_dsc,
                n_csca,
                k_csca,
                max_cert_bytes,
                true
            );
            console.log('\x1b[34msending request to modal server\x1b[0m');
            const response = await sendCSCARequest(inputs);
            console.log('\x1b[34mresponse from modal server received\x1b[0m');
            const proof = JSON.parse(JSON.stringify(response));
            const verifyProof = await groth16.verify(
                vkey_sha256_rsapss,
                proof.pub_signals,
                proof.proof
            )
            expect(verifyProof).to.be.true;
            console.log('\x1b[32mproof for sha256 rsa verified\x1b[0m');
        });
    });
    describe("SHA256 RSA", async () => {
        it("verify proof", async () => {
            const inputs = getCSCAInputs(
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
            const inputs = getCSCAInputs(
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
            console.log(JSON.stringify(inputs));

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
