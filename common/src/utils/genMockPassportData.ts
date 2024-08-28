import { PassportData } from "./types";
import { hash, assembleEContent, formatAndConcatenateDataHashes, formatMrz, hexToDecimal } from "./utils";
import * as forge from 'node-forge';
import { mock_dsc_key_sha1_rsa_4096, mock_dsc_key_sha256_rsa_4096, mock_dsc_key_sha256_rsapss_2048, mock_dsc_key_sha256_rsapss_4096, mock_dsc_sha1_rsa_4096, mock_dsc_sha256_rsa_4096, mock_dsc_sha256_rsapss_2048, mock_dsc_sha256_rsapss_4096 } from "../constants/mockCertificates";
import { sampleDataHashes_rsa_sha1, sampleDataHashes_rsa_sha256, sampleDataHashes_rsapss_sha256 } from "../constants/sampleDataHashes";
import { countryCodes } from "../constants/constants";
export function genMockPassportData(
    signatureType: 'rsa_sha1' | 'rsa_sha256' | 'rsapss_sha256',
    nationality: keyof typeof countryCodes,
    birthDate: string,
    expiryDate: string,
): PassportData {
    if (birthDate.length !== 6 || expiryDate.length !== 6) {
        throw new Error("birthdate and expiry date have to be in the \"YYMMDD\" format");
    }

    const mrz = `P<${nationality}DUPONT<<ALPHONSE<HUGUES<ALBERT<<<<<<<<<24HB818324${nationality}${birthDate}1M${expiryDate}5<<<<<<<<<<<<<<02`;
    let signatureAlgorithm: string;
    let hashLen: number;
    let sampleDataHashes: [number, number[]][];
    let privateKeyPem: string;
    let dsc: string;

    switch (signatureType) {
        case 'rsa_sha1':
            signatureAlgorithm = 'sha1WithRSAEncryption';
            hashLen = 20;
            sampleDataHashes = sampleDataHashes_rsa_sha1;
            privateKeyPem = mock_dsc_key_sha1_rsa_4096;
            dsc = mock_dsc_sha1_rsa_4096;
            break;
        case 'rsa_sha256':
            signatureAlgorithm = 'sha256WithRSAEncryption';
            hashLen = 32;
            sampleDataHashes = sampleDataHashes_rsa_sha256;
            privateKeyPem = mock_dsc_key_sha256_rsa_4096;
            dsc = mock_dsc_sha256_rsa_4096;
            break;
        case 'rsapss_sha256':
            signatureAlgorithm = 'sha256WithRSASSAPSS';
            hashLen = 32;
            sampleDataHashes = sampleDataHashes_rsapss_sha256;
            privateKeyPem = mock_dsc_key_sha256_rsapss_4096;
            dsc = mock_dsc_sha256_rsapss_4096;
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
    if (signatureType === 'rsapss_sha256') {
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
        const md = signatureType === 'rsa_sha1' ? forge.md.sha1.create() : forge.md.sha256.create();
        md.update(forge.util.binary.raw.encode(new Uint8Array(eContent)));
        const forgeSignature = privKey.sign(md);
        signature = Array.from(forgeSignature, (c: string) => c.charCodeAt(0));
    }

    const signatureBytes = Array.from(signature, byte => byte < 128 ? byte : byte - 256);

    return {
        dsc: dsc,
        mrz: mrz,
        signatureAlgorithm: signatureAlgorithm,
        pubKey: {
            modulus: hexToDecimal(modulus),
            exponent: '65537',
        },
        dataGroupHashes: concatenatedDataHashes,
        eContent: eContent,
        encryptedDigest: signatureBytes,
        photoBase64: "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABjElEQVR42mL8//8/AyUYiBQYmIy3...",
        mockUser: true
    };
}

