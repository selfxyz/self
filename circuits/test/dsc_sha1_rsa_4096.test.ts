import { assert, expect } from 'chai'
import fs from 'fs'
const forge = require('node-forge');
import path from 'path';
const wasm_tester = require("circom_tester").wasm;
import { splitToWords } from '../../common/src/utils/utils';
import { sha256Pad } from '../../common/src/utils/shaPad';
import { computeLeafFromModulus, findStartIndex, getCSCAInputs } from '../../common/src/utils/cscasha1';

describe('DSC chain certificate', function () {
    this.timeout(0); // Disable timeout
    let circuit;
    const n_dsc = 121;
    const k_dsc = 17;
    const n_csca = 121;
    const k_csca = 34;
    const max_cert_bytes = 1664;
    const dsc = fs.readFileSync('../common/src/mock_certificates/sha1_rsa_4096/mock_dsc.crt', 'utf8');
    const csca = fs.readFileSync('../common/src/mock_certificates/sha1_rsa_4096/mock_csca.crt', 'utf8');
    const dscCert = forge.pki.certificateFromPem(dsc);
    const cscaCert = forge.pki.certificateFromPem(csca);
    console.log('DSC Issuer:', dscCert.issuer.getField('CN').value);
    console.log('CSCA Subject:', cscaCert.subject.getField('CN').value);
    console.log('TBS Certificate length:', forge.asn1.toDer(dscCert.tbsCertificate).getBytes().length);
    console.log('DSC Signature length:', dscCert.signature.length);
    console.log('CSCA Public Key length:', cscaCert.publicKey.n.toString(16).length * 4);

    describe('DSC chain certificate', () => {
        describe('DSC chain certificate', () => {
            it('should verify that the DSC is signed by the CSCA', () => {
                // Method 1: Using verifyCertificateChain
                const caStore = forge.pki.createCaStore([cscaCert]);
                try {
                    const verified = forge.pki.verifyCertificateChain(caStore, [dscCert]);
                    console.log('Certificate chain verified:', verified);
                    expect(verified).to.be.true;
                } catch (error) {
                    console.error('Certificate chain verification failed:', error);
                    throw error;
                }

                // Method 2: Manual verification
                const tbsCertificate = forge.asn1.toDer(dscCert.tbsCertificate).getBytes();
                const signature = dscCert.signature;

                const md = forge.md.sha1.create();
                md.update(tbsCertificate, 'raw');

                const publicKey = cscaCert.publicKey;
                const digestBytes = md.digest().getBytes();
                const digestBigInt = BigInt('0x' + Buffer.from(digestBytes, 'binary').toString('hex'));
                console.log('Digest as BigInt:', digestBigInt);
                try {
                    const verified = publicKey.verify(md.digest().getBytes(), signature);
                    console.log('Manual signature verification:', verified);
                    expect(verified).to.be.true;
                } catch (error) {
                    console.error('Manual signature verification failed:', error);
                    throw error;
                }
            });
        });


        const inputs = getCSCAInputs(BigInt(0).toString(), dscCert, cscaCert, n_dsc, k_dsc, n_csca, k_csca, max_cert_bytes, true);

        //console.log("inputs:", JSON.stringify(inputs, null, 2));
        fs.writeFileSync('inputs.json', JSON.stringify(inputs, null, 2));

        before(async () => {
            circuit = await wasm_tester(
                path.join(__dirname, '../circuits/tests/certificates/dsc_sha1_rsa_4096.circom'),
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
            //console.log("Inputs:", inputs);
            const witness = await circuit.calculateWitness(inputs, true);
            const blinded_dsc_commitment = (await circuit.getOutput(witness, ["blinded_dsc_commitment"])).blinded_dsc_commitment;
            console.log("blinded_dsc_commitment", blinded_dsc_commitment)
        })

    });
});