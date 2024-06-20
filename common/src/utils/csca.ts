import { sha256Pad } from "./shaPad";
import forge from "node-forge";
import { splitToWords } from "./utils";
import { CSCA_AKI_MODULUS } from "../constants/constants";

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
                    console.log("NO MODULUS FOUND IN CERTIFICATE");
                    break;
                }
                else if (j === modulusNumArray.length - 1) {
                    console.log("MODULUS FOUND IN CERTIFICATE");
                    startIndex = i;
                }
            }
            break;
        }
    }
    return startIndex;
}

export function getCSCAInputs(dscCertificate: any, cscaCertificate: any = null, n_dsc: number, k_dsc: number, n_csca: number, k_csca: number, max_cert_bytes: number, devmod: boolean = false) {
    //const csca_modulus = cscaCertificate.publicKey.n.toString(16);
    //const csca_modulus_bigint = BigInt('0x' + csca_modulus);
    //const csca_modulus_formatted = splitToWords(csca_modulus_bigint, BigInt(n_csca), BigInt(k_csca));
    let csca_modulus_formatted;
    // the purpose of devmode is to get the csca modulus from the mock_csca certificate instead of using the registry which parses aki to csca modulus
    if (devmod) {
        console.log('DEV MODE');
        //const csca_modulus_bigint = BigInt('0x' + csca_modulus);
        const rsaPublicKey = cscaCertificate.publicKey as forge.pki.rsa.PublicKey;
        const csca_modulus = rsaPublicKey.n.toString(16).toLowerCase();
        const csca_modulus_number = BigInt(`0x${csca_modulus}`);
        csca_modulus_formatted = splitToWords(csca_modulus_number, BigInt(n_csca), BigInt(k_csca));
        console.log('csca_modulus_formatted', csca_modulus_formatted);


    }
    else {
        console.log('NOT DEV MODE');
        // Find the authorityKeyIdentifier extension
        const authorityKeyIdentifierExt = dscCertificate.extensions.find(
            (ext) => ext.name === 'authorityKeyIdentifier'
        );
        console.log('authorityKeyIdentifierExt', authorityKeyIdentifierExt);
        const value = authorityKeyIdentifierExt.value;
        console.log('value', value);
        const byteArray = derToBytes(value);
        console.log('Authority Key Identifier (byte array):', byteArray);
        const formattedValue = byteArray.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(':');
        console.log('Formatted Authority Key Identifier:', formattedValue);
        const formattedValueAdjusted = formattedValue.substring(12); // Remove the first '30:16:80:14:' from the formatted string
        const csca_modulus = CSCA_AKI_MODULUS[formattedValueAdjusted as keyof typeof CSCA_AKI_MODULUS];
        const csca_modulus_cleaned = csca_modulus.replace(/:/g, '');
        const csca_modulus_bigint = BigInt(`0x${csca_modulus_cleaned}`);
        csca_modulus_formatted = splitToWords(csca_modulus_bigint, BigInt(n_csca), BigInt(k_csca));
        console.log('CSCA modulus as bigint:', csca_modulus_bigint);
        console.log('CSCA modulus extracted from json:', csca_modulus_formatted);
    }

    //dsc modulus
    const dsc_modulus = dscCertificate.publicKey.n.toString(16).toLowerCase();
    const dsc_modulus_bytes_array = dsc_modulus.match(/.{2}/g).map(byte => parseInt(byte, 16));
    const dsc_modulus_bytes_array_formatted = dsc_modulus_bytes_array.map(byte => byte.toString());
    const dsc_modulus_number = BigInt(`0x${dsc_modulus}`);
    const dsc_modulus_formatted = splitToWords(dsc_modulus_number, BigInt(n_dsc), BigInt(k_dsc));

    const dsc_signature = dscCertificate.signature;
    const dsc_signature_hex = Buffer.from(dsc_signature, 'binary').toString('hex');
    const dsc_signature_bigint = BigInt('0x' + dsc_signature_hex);
    const dsc_signature_formatted = splitToWords(dsc_signature_bigint, BigInt(n_csca), BigInt(k_csca));


    //const formatted_dsc_signature = dsc_signature.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(':');
    const tbsCertificateDer = forge.asn1.toDer(dscCertificate.tbsCertificate).getBytes();
    const tbsCertificateBytes = derToBytes(tbsCertificateDer);
    const dsc_tbsCertificateUint8Array = Uint8Array.from(tbsCertificateBytes.map(byte => parseInt(byte.toString(16), 16)));
    const [dsc_message_padded, dsc_messagePaddedLen] = sha256Pad(dsc_tbsCertificateUint8Array, max_cert_bytes);
    const startIndex = findStartIndex(dsc_modulus, dsc_message_padded);
    const startIndex_formatted = startIndex.toString();
    const dsc_message_padded_formatted = Array.from(dsc_message_padded).map((x) => x.toString())
    const dsc_messagePaddedLen_formatted = BigInt(dsc_messagePaddedLen).toString()



    return {
        "raw_dsc_cert": dsc_message_padded_formatted,
        "raw_dsc_cert_padded_bytes": dsc_messagePaddedLen_formatted,
        "csca_modulus": csca_modulus_formatted,
        "dsc_signature": dsc_signature_formatted,
        "dsc_modulus": dsc_modulus_formatted,
        "start_index": startIndex_formatted,
        "secret": "0"
    }
}

export function derToBytes(derValue: string) {
    const bytes = [];
    for (let i = 0; i < derValue.length; i++) {
        bytes.push(derValue.charCodeAt(i));
    }
    return bytes;
}