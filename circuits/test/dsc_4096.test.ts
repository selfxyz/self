import { assert, expect } from 'chai'
import fs from 'fs'
const forge = require('node-forge');
import path from 'path';
const wasm_tester = require("circom_tester").wasm;
import { splitToWords } from '../../common/src/utils/utils';
import { sha256Pad } from '../../common/src/utils/shaPad';
import { findStartIndex } from '../../common/src/utils/csca';

describe('DSC chain certificate', function () {
    this.timeout(0); // Disable timeout
    let circuit;
    const n = 121;
    const k = 17;
    const max_cert_bytes = 4096;
    const dsc = fs.readFileSync('../common/src/mock_certificates/sha256_rsa_4096/mock_dsc.crt', 'utf8');
    const csca = fs.readFileSync('../common/src/mock_certificates/sha256_rsa_4096/mock_csca.crt', 'utf8');
    const dscCert = forge.pki.certificateFromPem(dsc);
    const cscaCert = forge.pki.certificateFromPem(csca);

    const dsc_modulus = dscCert.publicKey.n.toString(16).toLowerCase();

    const csca_modulus = cscaCert.publicKey.n.toString(16).toLowerCase();
    const csca_modulus_number = BigInt(`0x${csca_modulus}`);
    const dsc_modulus_number = BigInt(`0x${dsc_modulus}`);

    const dsc_signature = dscCert.signature;
    const dsc_signature_hex = forge.util.bytesToHex(dsc_signature);
    const dsc_signature_number = BigInt(`0x${dsc_signature_hex}`);

    const csca_modulus_formatted = splitToWords(csca_modulus_number, BigInt(n), BigInt(2 * k));
    const dsc_modulus_formatted = splitToWords(dsc_modulus_number, BigInt(n), BigInt(k));
    const dsc_signature_formatted = splitToWords(dsc_signature_number, BigInt(n), BigInt(2 * k));

    const dsc_tbsCertificateDer = forge.asn1.toDer(dscCert.tbsCertificate).getBytes();
    const dsc_tbsCertificateBuffer = Buffer.from(dsc_tbsCertificateDer, 'binary')
    const dsc_tbsCertificateListOfBytes = Array.from(dsc_tbsCertificateBuffer).map(byte => BigInt(byte).toString());
    const dsc_tbsCertificateUint8Array = Uint8Array.from(dsc_tbsCertificateListOfBytes.map(byte => parseInt(byte)));
    const [dsc_message_padded, dsc_messagePaddedLen] = sha256Pad(dsc_tbsCertificateUint8Array, max_cert_bytes);
    const startIndex = findStartIndex(dsc_modulus, dsc_message_padded);

    assert(startIndex != -1, "Modulus not found in message padded");

    const inputs = {
        raw_dsc_cert: Array.from(dsc_message_padded).map((x) => x.toString()),
        message_padded_bytes: BigInt(dsc_messagePaddedLen).toString(),
        modulus: csca_modulus_formatted,
        signature: dsc_signature_formatted,
        start_index: startIndex.toString(),
        dsc_modulus: dsc_modulus_formatted,
    }
    console.log("inputs:", inputs);

    before(async () => {
        circuit = await wasm_tester(
            path.join(__dirname, '../circuits/tests/certificates/dsc_4096.circom'),
            {
                include: [
                    "node_modules",
                ]
            }
        );
    });

    it('check inputs', () => {
        expect(inputs.raw_dsc_cert.length).to.equal(max_cert_bytes);
        expect(inputs.modulus.length).to.equal(2 * k);
        expect(inputs.signature.length).to.equal(2 * k);
        it('check modulus slices size', () => {
            inputs.modulus.forEach(slice => {
                expect(slice.length).to.equal(n);
            });
        });
        it('check signature slices size', () => {
            inputs.signature.forEach(slice => {
                expect(slice.length).to.equal(n);
            });
        });
    })

    it('should compile and load the circuit', () => {
        expect(circuit).to.not.be.undefined;
    })

    it('should compute the correct output', async () => {
        console.log("Inputs:", inputs);
        const witness = await circuit.calculateWitness(inputs, true);
        console.log(witness);
    })

})