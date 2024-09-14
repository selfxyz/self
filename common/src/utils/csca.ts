import { sha1Pad, sha256Pad } from "./shaPad";
import * as forge from "node-forge";
import { splitToWords } from "./utils";
import { CSCA_AKI_MODULUS, CSCA_TREE_DEPTH, MODAL_SERVER_ADDRESS } from "../constants/constants";
import { poseidon16, poseidon2, poseidon4 } from "poseidon-lite";
import { IMT } from "@zk-kit/imt";
import serialized_csca_tree from "../../pubkeys/serialized_csca_tree.json"
import { createHash } from "crypto";
import axios from "axios";
import { flexiblePoseidon } from "./poseidon";
import { getSignatureAlgorithmDetails } from "./handleCertificate";

export function findStartIndex(modulus: string, messagePadded: Uint8Array): number {
    const modulusNumArray = [];
    for (let i = 0; i < modulus.length; i += 2) {
        const hexPair = modulus.slice(i, i + 2);
        const number = parseInt(hexPair, 16);
        modulusNumArray.push(number);
    }
    const messagePaddedNumber = [];
    for (let i = 0; i < messagePadded.length; i += 1) {
        const number = Number(messagePadded[i]);
        messagePaddedNumber.push(number);
    }
    let startIndex = -1;
    for (let i = 0; i <= messagePaddedNumber.length; i++) {
        if (modulusNumArray[0] === messagePaddedNumber[i]) {
            for (let j = 0; j < modulusNumArray.length; j++) {
                if (modulusNumArray[j] !== messagePaddedNumber[i + j]) {
                    //console.log("NO MODULUS FOUND IN CERTIFICATE");
                    break;
                }
                else if (j === modulusNumArray.length - 1) {
                    //console.log("MODULUS FOUND IN CERTIFICATE");
                    startIndex = i;
                }
            }
            break;
        }
    }
    return startIndex;
}

export function getCSCAInputs(dscSecret: string, dscCertificate: any, cscaCertificate: any = null, n_dsc: number, k_dsc: number, n_csca: number, k_csca: number, max_cert_bytes: number, devmod: boolean = false) {
    let csca_modulus_formatted;
    let csca_modulus_bigint;
    // the purpose of devmode is to get the csca modulus from the mock_csca certificate instead of using the registry which parses aki to csca modulus
    if (devmod) {
        // console.log('DEV MODE');
        //const csca_modulus_bigint = BigInt('0x' + csca_modulus);
        //console.log("certificate", cscaCertificate);
        //console.log('csca_modulus_hex', cscaCertificate.getPublicKeyHex());

        const rsaPublicKey = cscaCertificate.publicKey as forge.pki.rsa.PublicKey;
        const csca_modulus = rsaPublicKey.n.toString(16).toLowerCase();
        //console.log('csca_modulus', csca_modulus);
        csca_modulus_bigint = BigInt(`0x${csca_modulus}`);
        csca_modulus_formatted = splitToWords(csca_modulus_bigint, n_csca, k_csca);
        //console.log('csca_modulus_formatted', csca_modulus_formatted);


    }
    else {
        // console.log('NOT DEV MODE');
        // Find the authorityKeyIdentifier extension
        const authorityKeyIdentifierExt = dscCertificate.extensions.find(
            (ext) => ext.name === 'authorityKeyIdentifier'
        );
        //console.log('authorityKeyIdentifierExt', authorityKeyIdentifierExt);
        const value = authorityKeyIdentifierExt.value;
        //console.log('value', value);
        const byteArray = derToBytes(value);
        //console.log('Authority Key Identifier (byte array):', byteArray);
        const formattedValue = byteArray.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(':');
        //console.log('Formatted Authority Key Identifier:', formattedValue);
        const formattedValueAdjusted = formattedValue.substring(12); // Remove the first '30:16:80:14:' from the formatted string
        const csca_modulus = CSCA_AKI_MODULUS[formattedValueAdjusted as keyof typeof CSCA_AKI_MODULUS];
        const csca_modulus_cleaned = csca_modulus.replace(/:/g, '');
        csca_modulus_bigint = BigInt(`0x${csca_modulus_cleaned}`);
        csca_modulus_formatted = splitToWords(csca_modulus_bigint, n_csca, k_csca);
        //console.log('CSCA modulus as bigint:', csca_modulus_bigint);
        //console.log('CSCA modulus extracted from json:', csca_modulus_formatted);
    }

    const signatureAlgorithm = dscCertificate.signatureOid;;

    //dsc modulus
    const dsc_modulus = dscCertificate.publicKey.n.toString(16).toLowerCase();
    //console.log('dsc_modulus', dsc_modulus);
    const dsc_modulus_bytes_array = dsc_modulus.match(/.{2}/g).map(byte => parseInt(byte, 16));
    //console.log('dsc_modulus_bytes_array', dsc_modulus_bytes_array);
    const dsc_modulus_bytes_array_formatted = dsc_modulus_bytes_array.map(byte => byte.toString());
    const dsc_modulus_number = BigInt(`0x${dsc_modulus}`);
    const dsc_modulus_formatted = splitToWords(dsc_modulus_number, n_dsc, k_dsc);

    const dsc_signature = dscCertificate.signature;
    const dsc_signature_hex = Buffer.from(dsc_signature, 'binary').toString('hex');
    const dsc_signature_bigint = BigInt('0x' + dsc_signature_hex);
    const dsc_signature_formatted = splitToWords(dsc_signature_bigint, n_csca, k_csca);


    //const formatted_dsc_signature = dsc_signature.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(':');
    const tbsCertificateDer = forge.asn1.toDer(dscCertificate.tbsCertificate).getBytes();
    const tbsCertificateBytes = derToBytes(tbsCertificateDer);
    const dsc_tbsCertificateUint8Array = Uint8Array.from(tbsCertificateBytes.map(byte => parseInt(byte.toString(16), 16)));

    let dsc_message_padded;
    let dsc_messagePaddedLen;
    if (signatureAlgorithm === '1.2.840.113549.1.1.5') { // sha1
        [dsc_message_padded, dsc_messagePaddedLen] = sha1Pad(dsc_tbsCertificateUint8Array, max_cert_bytes);
    }
    else if (signatureAlgorithm === '1.2.840.113549.1.1.11') { //sha256
        [dsc_message_padded, dsc_messagePaddedLen] = sha256Pad(dsc_tbsCertificateUint8Array, max_cert_bytes);
    }
    else {
        console.log("Signature algorithm not recognized", signatureAlgorithm);
        [dsc_message_padded, dsc_messagePaddedLen] = sha256Pad(dsc_tbsCertificateUint8Array, max_cert_bytes);

    }
    const startIndex = findStartIndex(dsc_modulus, dsc_message_padded);
    const startIndex_formatted = startIndex.toString();
    const dsc_message_padded_formatted = Array.from(dsc_message_padded).map((x) => x.toString())
    // console.log('dsc_message_padded_formatted', dsc_message_padded_formatted);
    const dsc_messagePaddedLen_formatted = BigInt(dsc_messagePaddedLen).toString()
    // console.log('dsc_messagePaddedLen_formatted', dsc_messagePaddedLen_formatted);

    // merkle tree saga
    const leaf = computeLeafFromPubKey(csca_modulus_bigint, n_csca, k_csca);
    const [root, proof] = getCSCAModulusProof(leaf, n_csca, k_csca);
    const { signatureAlgorithm: signatureAlgorithmName, hashFunction } = getSignatureAlgorithmDetails(signatureAlgorithm);

    return {
        "signature_algorithm": `${hashFunction}_${signatureAlgorithmName}`, // this is the opposite order as in the other files?
        "inputs":
        {
            "raw_dsc_cert": dsc_message_padded_formatted,
            "raw_dsc_cert_padded_bytes": [dsc_messagePaddedLen_formatted],
            "csca_modulus": csca_modulus_formatted,
            "dsc_signature": dsc_signature_formatted,
            "dsc_modulus": dsc_modulus_formatted,
            "start_index": [startIndex_formatted],
            "secret": [dscSecret],
            "merkle_root": [BigInt(root).toString()],
            "path": proof.pathIndices.map(index => index.toString()),
            "siblings": proof.siblings.flat().map(sibling => sibling.toString())
        }
    }

}

export function derToBytes(derValue: string) {
    const bytes = [];
    for (let i = 0; i < derValue.length; i++) {
        bytes.push(derValue.charCodeAt(i));
    }
    return bytes;
}

export function getCSCAModulusMerkleTree() {
    const tree = new IMT(poseidon2, CSCA_TREE_DEPTH, 0, 2);
    tree.setNodes(serialized_csca_tree);
    return tree;

}

export function computeLeafFromModulusFormatted(modulus_formatted: string[]) {
    if (modulus_formatted.length <= 64) {
        const hashInputs = new Array(4).fill(null).map(() => new Array(16).fill(BigInt(0)));

        for (let i = 0; i < Math.min(modulus_formatted.length, 64); i++) {
            hashInputs[Math.floor(i / 16)][i % 16] = BigInt(modulus_formatted[i]);
        }

        const intermediateHashes = hashInputs.map(inputs => poseidon16(inputs));
        const finalHash = poseidon4(intermediateHashes);

        console.log(finalHash);
        return finalHash.toString();
    } else {
        throw new Error("Modulus length is too long");
    }
}
export function computeLeafFromModulusBigInt(modulus_bigint: bigint) {
    const bitsSize = getBitsSize(modulus_bigint);
    const wordsSize = Math.ceil(bitsSize / 64);
    if (modulus_bigint <= BigInt(2n ** 4096n - 1n)) {
        const modulus_formatted = splitToWords(modulus_bigint, wordsSize, 64);
        const hashInputs = new Array(4);
        for (let i = 0; i < 4; i++) {
            hashInputs[i] = new Array(16).fill(BigInt(0));
        }
        for (let i = 0; i < 64; i++) {
            if (i < modulus_formatted.length) {
                hashInputs[i % 4][Math.floor(i / 4)] = BigInt(modulus_formatted[i]);
            }
        }
        for (let i = 0; i < 4; i++) {
            hashInputs[i] = poseidon16(hashInputs[i].map(input => input.toString()));
        }
        const finalHash = poseidon4(hashInputs.map(h => h));
        //console.log(finalHash);
        return finalHash.toString();
    }
    else {
        throw new Error("Modulus length is too long");
    }
}

export function computeLeafFromPubKey(pubkey, n, k) {
    const pubKeyFormatted = splitToWords(pubkey, n, k);
    return leafHasherLight(pubKeyFormatted);
}

export function leafHasherLight(pubKeyFormatted: string[]) {
    const rounds = Math.ceil(pubKeyFormatted.length / 16);
    const hash = new Array(rounds);
    for (let i = 0; i < rounds; i++) {
        // Initialize each element of hash as an object with an inputs array
        hash[i] = { inputs: new Array(16).fill(BigInt(0)) };
    }
    for (let i = 0; i < rounds; i++) {
        for (let j = 0; j < 16; j++) {
            if (i * 16 + j < pubKeyFormatted.length) {
                hash[i].inputs[j] = BigInt(pubKeyFormatted[i * 16 + j]);
            }
        }
    }
    // Use the inputs array for poseidon4
    const finalHash = flexiblePoseidon(hash.map(h => poseidon16(h.inputs)));
    return finalHash.toString();
}

function getBitsSize(modulus_bigint: bigint) {
    const i = (modulus_bigint.toString(16).length - 1) * 4
    return i + 32 - Math.clz32(Number(modulus_bigint >> BigInt(i)))
}

export function getCSCAModulusProof(leaf, n, k) {
    let tree = new IMT(poseidon2, CSCA_TREE_DEPTH, 0, 2);
    tree.setNodes(serialized_csca_tree);
    //const tree = getCSCAModulusMerkleTree(n, k);
    const index = tree.indexOf(leaf);
    if (index === -1) {
        throw new Error("Your public key was not found in the registry");
    }
    const proof = tree.createProof(index);
    return [tree.root, proof];
}

export function getTBSHash(cert: forge.pki.Certificate, hashAlgorithm: 'sha1' | 'sha256', n: number, k: number): string[] {
    const tbsCertAsn1 = forge.pki.certificateToAsn1(cert).value[0];
    const tbsCertDer = forge.asn1.toDer(tbsCertAsn1 as any).getBytes();
    const md = hashAlgorithm === 'sha256' ? forge.md.sha256.create() : forge.md.sha1.create();
    md.update(tbsCertDer);
    const tbsCertificateHash = md.digest();
    const tbsCertificateHashString = tbsCertificateHash.data;
    const tbsCertificateHashHex = Buffer.from(tbsCertificateHashString, 'binary').toString('hex');
    const tbsCertificateHashBigint = BigInt(`0x${tbsCertificateHashHex}`);
    console.log('tbsCertificateHashBigint', tbsCertificateHashBigint);
    return splitToWords(tbsCertificateHashBigint, n, k);
}


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

export const generateDscSecret = () => {
    const secretBytes = forge.random.getBytesSync(31);
    return BigInt(`0x${forge.util.bytesToHex(secretBytes)}`).toString();
}