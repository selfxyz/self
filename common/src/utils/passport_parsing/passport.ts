import { MAX_PADDED_ECONTENT_LEN, MAX_PUBKEY_DSC_BYTES } from "../../constants/constants";
import { PublicKeyDetailsRSA } from "../certificate_parsing/dataStructure";
import { parseCertificateSimple } from "../certificate_parsing/parseCertificateSimple";
import { parsePassportData, PassportMetadata } from "../parsePassportData";
import { packBytesAndPoseidon } from "../pubkeyTree";
import { shaPad } from "../shaPad";
import { sha384_512Pad } from "../shaPad";
import { PassportData } from "../types";
import { formatMrz } from "../utils";
import { hash } from "../utils";

export function initPassportDataParsing(passportData: PassportData) {
    const dscParsed = parseCertificateSimple(passportData.dsc);
    passportData.dsc_parsed = dscParsed;
    const passportMetadata = parsePassportData(passportData);
    passportData.passportMetadata = passportMetadata;
    passportData.parsed = true;
    return passportData;
}

export function generateCommitment(
    secret: string,
    attestation_id: string,
    passportData: PassportData,
) {
    // dg1
    const dg1_packed_hash = packBytesAndPoseidon(formatMrz(passportData.mrz));
    //eContent
    const passportMetadata = parsePassportData(passportData);

    const eContent_shaBytes = hash(passportMetadata.eContentHashFunction, Array.from(passportData.eContent), 'bytes');
    const eContent_packed_hash = packBytesAndPoseidon((eContent_shaBytes as number[]).map((byte) => byte & 0xff));
    // pubKey
    const pubKeyBytes_padded = getPubKeyBytesPadded(passportData);
    // console.log('js: pubKeyBytes:', JSON.stringify(pubKeyBytes_padded));
    const pubKeyBytes_padded_packed_hash = packBytesAndPoseidon(pubKeyBytes_padded);
    console.log('js: pubKeyBytes_padded_packed_hash:', pubKeyBytes_padded_packed_hash);
}

export function getPubKeyBytesPadded(passportData: PassportData) {
    const pubKeyBytes = getPubKeyBytes(passportData);
    const paddedPubKeyBytes = pubKeyBytes.concat(new Array(MAX_PUBKEY_DSC_BYTES - pubKeyBytes.length).fill(0));
    return paddedPubKeyBytes;
}

export function getPubKeyBytes(passportData: PassportData) {
    if (passportData.passportMetadata == undefined) {
        throw new Error('Passport metadata is undefined');
    }
    const signatureAlgorithm = passportData.passportMetadata.signatureAlgorithm;
    if (signatureAlgorithm == 'ecdsa') { }
    else {
        const parsedDsc = passportData.dsc_parsed;
        const pubKeyHex = (parsedDsc.publicKeyDetails as PublicKeyDetailsRSA).modulus;
        const pubKeyBytes = hexToBytes(pubKeyHex);
        return pubKeyBytes;
    }
}

function hexToBytes(hex: string) {
    // Remove '0x' prefix if present
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;

    const paddedHex = cleanHex.length % 2 ? '0' + cleanHex : cleanHex;

    const bytes = [];
    for (let i = 0; i < paddedHex.length; i += 2) {
        bytes.push(parseInt(paddedHex.slice(i, i + 2), 16));
    }
    return bytes;
}

export function pad(passportMetadata: PassportMetadata) {
    return passportMetadata.dg1HashFunction === 'sha1' ||
        passportMetadata.dg1HashFunction === 'sha224' ||
        passportMetadata.dg1HashFunction === 'sha256'
        ? shaPad
        : sha384_512Pad;
}