import { shaPad } from "./shaPad";
import * as forge from "node-forge";
import { bytesToBigDecimal, extractRSFromSignature, getNAndK, getNAndKCSCA, hexToDecimal, splitToWords } from "./utils";
import { CSCA_TREE_DEPTH, MODAL_SERVER_ADDRESS } from "../constants/constants";
import { poseidon2 } from "poseidon-lite";
import { IMT } from "@zk-kit/imt";
import serialized_csca_tree from "../../pubkeys/serialized_csca_tree.json"
import axios from "axios";
import { parseCertificate } from "./certificates/handleCertificate";
import { getLeafCSCA } from "./pubkeyTree";
import { SKI_PEM, SKI_PEM_DEV } from "../constants/skiPem";

export function findStartIndex(modulus: string, messagePadded: Uint8Array): number {
    console.log('messagePadded', messagePadded);
    const modulusNumArray = [];
    for (let i = 0; i < modulus.length; i += 2) {
        const hexPair = modulus.slice(i, i + 2);
        const number = parseInt(hexPair, 16);
        modulusNumArray.push(number);
    }
    console.log('modulusNumArray', modulusNumArray);
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
                    break;
                }
                else if (j === modulusNumArray.length - 1) {
                    startIndex = i;
                }
            }
            break;
        }
    }
    if (startIndex === -1) {
        throw new Error('DSC Pubkey not found in CSCA certificate');
    }
    return startIndex;
}


export function generateCircuitInputsDSC(dscSecret: string, dscCertificate: any, max_cert_bytes: number, devMode: boolean = false) {

    const dscCert = forge.pki.certificateFromPem(dscCertificate);
    const dscTbs = dscCert.tbsCertificate;
    const dscTbsCertDer = forge.asn1.toDer(dscTbs).getBytes();
    const dscTbsCertBytes = derToBytes(dscTbsCertDer);
    const dscTbsCertUint8Array = Uint8Array.from(dscTbsCertBytes.map(byte => parseInt(byte.toString(16), 16)));

    const { signatureAlgorithm, hashFunction, publicKeyDetails, x, y, modulus, curve, exponent, bits, subjectKeyIdentifier, authorityKeyIdentifier } = parseCertificate(dscCertificate);
    let dsc_message_padded;
    let dsc_messagePaddedLen;
    [dsc_message_padded, dsc_messagePaddedLen] = shaPad(dscTbsCertUint8Array, max_cert_bytes);

    const { n, k } = getNAndK(signatureAlgorithm);
    // Extract the signature from the DSC certificate
    const dscSignature = dscCert.signature;
    const encryptedDigest = Array.from(forge.util.createBuffer(dscSignature).getBytes(), char => char.charCodeAt(0));

    let pubKey, signature;

    const startIndex = findStartIndex(modulus, dsc_message_padded);
    const startIndex_formatted = startIndex.toString();
    const dsc_message_padded_formatted = Array.from(dsc_message_padded).map((x) => x.toString())
    const dsc_messagePaddedLen_formatted = BigInt(dsc_messagePaddedLen).toString()

    const cscaPem = getCSCAFromSKI(authorityKeyIdentifier, devMode);
    console.log('cscaPem', cscaPem);

    const { x: csca_x, y: csca_y, modulus: csca_modulus, signature_algorithm: csca_signature_algorithm } = parseCertificate(cscaPem);
    const { n: n_csca, k: k_csca } = getNAndKCSCA(csca_signature_algorithm);

    const leaf = getLeafCSCA(cscaPem);
    const [root, proof] = getCSCAModulusProof(leaf);

    if (signatureAlgorithm === 'ecdsa') {
        const { r, s } = extractRSFromSignature(encryptedDigest);
        const signature_r = splitToWords(BigInt(hexToDecimal(r)), n_csca, k_csca)
        const signature_s = splitToWords(BigInt(hexToDecimal(s)), n_csca, k_csca)
        signature = [...signature_r, ...signature_s]
        const dsc_x_formatted = splitToWords(BigInt(hexToDecimal(x)), n, k)
        const dsc_y_formatted = splitToWords(BigInt(hexToDecimal(y)), n, k)
        pubKey = [...dsc_x_formatted, ...dsc_y_formatted]
    } else {

        signature = splitToWords(
            BigInt(bytesToBigDecimal(encryptedDigest)),
            n_csca,
            k_csca
        )

        pubKey = splitToWords(
            BigInt(hexToDecimal(modulus)),
            n,
            k
        )
    }

    let csca_pubKey_formatted;
    if (csca_signature_algorithm === 'ecdsa') {
        const csca_x_formatted = splitToWords(BigInt(hexToDecimal(csca_x)), n_csca, k_csca);
        const csca_y_formatted = splitToWords(BigInt(hexToDecimal(csca_y)), n_csca, k_csca);
        csca_pubKey_formatted = [...csca_x_formatted, ...csca_y_formatted];
    }
    else {
        csca_pubKey_formatted = splitToWords(BigInt(hexToDecimal(csca_modulus)), n_csca, k_csca);
    }



    return {
        "signature_algorithm": `${signatureAlgorithm}_${curve || exponent}_${hashFunction}_${4096}`,
        "inputs":
        {
            "raw_dsc_cert": dsc_message_padded_formatted,
            "raw_dsc_cert_padded_bytes": [dsc_messagePaddedLen_formatted],
            "csca_pubKey": csca_pubKey_formatted,
            "signature": signature,
            "dsc_pubKey": pubKey,
            "dsc_pubKey_offset": [startIndex_formatted],
            "secret": [dscSecret],
            "merkle_root": [BigInt(root).toString()],
            "path": proof.pathIndices.map(index => index.toString()),
            "siblings": proof.siblings.flat().map(sibling => sibling.toString())
        }
    }

}

export function getCSCAFromSKI(ski: string, devMode: boolean): string {
    const cscaPemPROD = (SKI_PEM as any)[ski];
    const cscaPemDEV = (SKI_PEM_DEV as any)[ski];
    const cscaPem = devMode ? cscaPemDEV || cscaPemPROD : cscaPemPROD;
    if (!cscaPem) {
        console.log('\x1b[31m%s\x1b[0m', `CSCA with SKI ${ski} not found`, 'devMode: ', devMode);
        throw new Error(`CSCA not found, authorityKeyIdentifier: ${ski},  areMockPassportsAllowed: ${devMode},`);
    }
    return cscaPem;
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



export function getCSCAModulusProof(leaf) {
    console.log('leaf', leaf);
    let tree = new IMT(poseidon2, CSCA_TREE_DEPTH, 0, 2);
    tree.setNodes(serialized_csca_tree);
    const index = tree.indexOf(leaf);
    if (index === -1) {
        throw new Error("Your public key was not found in the registry");
    }
    const proof = tree.createProof(index);
    return [tree.root, proof];
}

export function getTBSHash(cert: forge.pki.Certificate, hashFunction: 'sha1' | 'sha256', n: number, k: number): string[] {
    const tbsCertAsn1 = forge.pki.certificateToAsn1(cert).value[0];
    const tbsCertDer = forge.asn1.toDer(tbsCertAsn1 as any).getBytes();
    const md = hashFunction === 'sha256' ? forge.md.sha256.create() : forge.md.sha1.create();
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