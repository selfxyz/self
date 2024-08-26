import { PassportData } from "../../src/utils/types";
import { hash, assembleEContent, formatAndConcatenateDataHashes, formatMrz, hexToDecimal } from "../../src/utils/utils";
import * as forge from 'node-forge';
import * as rs from 'jsrsasign';
import { mock_dsc_key_sha1_rsa_4096, mock_dsc_key_sha256_rsa_4096, mock_dsc_key_sha256_rsapss_2048, mock_dsc_sha256_rsapss_2048 } from "../../src/constants/mockCertificates";
import { sampleDataHashes_rsa_sha1, sampleDataHashes_rsa_sha256, sampleDataHashes_rsapss_sha256 } from "./sampleDataHashes";

export function genMockPassportData(
    signatureType: 'rsa sha1' | 'rsa sha256' | 'rsapss sha256',
    nationality: string,
    birthDate: string,
    expiryDate
): PassportData {

    const mrz = `P<${nationality}DUPONT<<ALPHONSE<HUGUES<ALBERT<<<<<<<<<24HB818324${nationality}${birthDate}1M${expiryDate}5<<<<<<<<<<<<<<02`;

    let signatureAlgorithm: string;
    let hashLen: number;
    let sampleDataHashes: [number, number[]][];
    let privateKeyPem: string;

    switch (signatureType) {
        case 'rsa sha1':
            signatureAlgorithm = 'sha1WithRSAEncryption';
            hashLen = 20;
            sampleDataHashes = sampleDataHashes_rsa_sha1;
            privateKeyPem = mock_dsc_key_sha1_rsa_4096;
            break;
        case 'rsa sha256':
            signatureAlgorithm = 'sha256WithRSAEncryption';
            hashLen = 32;
            sampleDataHashes = sampleDataHashes_rsa_sha256;
            privateKeyPem = mock_dsc_key_sha256_rsa_4096;
            break;
        case 'rsapss sha256':
            signatureAlgorithm = 'sha256WithRSASSAPSS';
            hashLen = 32;
            sampleDataHashes = sampleDataHashes_rsapss_sha256;
            privateKeyPem = mock_dsc_key_sha256_rsapss_2048;
            break;
    }

    const mrzHash = hash(signatureAlgorithm, formatMrz(mrz));
    const concatenatedDataHashes = formatAndConcatenateDataHashes(
        [[1, mrzHash], ...sampleDataHashes],
        hashLen,
        30
    );

    const eContent = assembleEContent(hash(signatureAlgorithm, concatenatedDataHashes));

    const privKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const modulus = privKey.n.toString(16);

    let signature: number[];
    if (signatureType === 'rsapss sha256') {
        const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
        const md = forge.md.sha256.create();
        md.update(forge.util.binary.raw.encode(new Uint8Array(eContent)));
        const pss = forge.pss.create({
            md: forge.md.sha256.create(),
            mgf: forge.mgf.mgf1.create(forge.md.sha256.create()),
            saltLength: 32
        });
        const signatureBytes = privateKey.sign(md, pss);
        signature = Array.from(signatureBytes, (c: string) => c.charCodeAt(0));
    } else {
        const md = signatureType === 'rsa sha1' ? forge.md.sha1.create() : forge.md.sha256.create();
        md.update(forge.util.binary.raw.encode(new Uint8Array(eContent)));
        const forgeSignature = privKey.sign(md);
        signature = Array.from(forgeSignature, (c: string) => c.charCodeAt(0));
    }

    const signatureBytes = Array.from(signature, byte => byte < 128 ? byte : byte - 256);

    return {
        mrz: mrz,
        signatureAlgorithm: signatureAlgorithm,
        pubKey: {
            modulus: hexToDecimal(modulus),
            exponent: '65537',
        },
        dataGroupHashes: concatenatedDataHashes,
        eContent: eContent,
        encryptedDigest: signatureBytes,
        photoBase64: "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABjElEQVR42mL8//8/AyUYiBQYmIy3..."
    };
}