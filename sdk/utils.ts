import { ethers } from "ethers";
import { getCurrentDateYYMMDD } from "../common/src/utils/utils";
import { REGISTER_ABI, REGISTER_CONTRACT_ADDRESS } from "../common/src/constants/constants";
import { derToBytes } from '../common/src/utils/csca';
import forge from 'node-forge'
import { pem1, pem2, pem3, pem4, mock_csca } from './certificates';
import { fr1pem, fr2pem, fr3pem, fr4pem, mockpem } from './certificates';
import { SKI_PEM, SKI_PEM_DEV } from './skiPem';
export const attributeToGetter = {
    "nationality": "getNationalityOf",
    "expiry_date": "getExpiryDateOf",
    "older_than": "getOlderThanOf"
}

export function getCurrentDateFormatted() {
    return getCurrentDateYYMMDD().map(datePart => BigInt(datePart).toString());
}

export async function checkMerkleRoot(rpcUrl: string, merkleRoot: number) {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(REGISTER_CONTRACT_ADDRESS, REGISTER_ABI, provider);
    return await contract.checkRoot(merkleRoot);
}

export function parsePublicSignals(publicSignals) {
    return {
        nullifier: publicSignals[0],
        revealedData_packed: [publicSignals[1], publicSignals[2], publicSignals[3]],
        attestation_id: publicSignals[4],
        merkle_root: publicSignals[5],
        scope: publicSignals[6],
        current_date: [publicSignals[7], publicSignals[8], publicSignals[9], publicSignals[10], publicSignals[11], publicSignals[12]],
        user_identifier: publicSignals[13],
    }
}

export function parsePublicSignalsProve(publicSignals) {
    return {
        signature_algorithm: publicSignals[0],
        revealedData_packed: [publicSignals[1], publicSignals[2], publicSignals[3]],
        nullifier: publicSignals[4],
        pubKey: publicSignals.slice(5, 37),
        scope: publicSignals[37],
        current_date: publicSignals.slice(38, 44),
        user_identifier: publicSignals[44],
    }
}


export function unpackReveal(revealedData_packed: string[]): string[] {

    const bytesCount = [31, 31, 28]; // nb of bytes in each of the first three field elements
    const bytesArray = revealedData_packed.flatMap((element: string, index: number) => {
        const bytes = bytesCount[index];
        const elementBigInt = BigInt(element);
        const byteMask = BigInt(255); // 0xFF
        const bytesOfElement = [...Array(bytes)].map((_, byteIndex) => {
            return (elementBigInt >> (BigInt(byteIndex) * BigInt(8))) & byteMask;
        });
        return bytesOfElement;
    });

    return bytesArray.map((byte: bigint) => String.fromCharCode(Number(byte)));
}

export function verifyDSCValidity(dscCertificate: any, dev_mode: boolean = false) {
    const authorityKeyIdentifierExt = dscCertificate.extensions.find(
        (ext) => ext.name === 'authorityKeyIdentifier'
    );
    const value = authorityKeyIdentifierExt.value;
    const byteArray = derToBytes(value);
    const formattedValue = byteArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    console.log("formattedValue:", formattedValue);
    const formattedValueAdjusted = formattedValue.substring(8); // Remove the first '3016' from the formatted string
    console.log("formattedValueAdjusted:", formattedValueAdjusted);
    // const formattedValue = byteArray.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(':');
    // const formattedValueAdjusted = formattedValue.substring(12); // Remove the first '30:16:80:14:' from the formatted string

    const csca_pem = getCSCAPem2(formattedValueAdjusted, dev_mode);
    console.log("CSCA PEM used:", csca_pem.substring(0, 50) + "..."); // Log the first 50 characters of the PEM

    const csca_certificate = forge.pki.certificateFromPem(csca_pem);
    try {
        // Create a CAStore containing the CSCA certificate
        const caStore = forge.pki.createCaStore([csca_certificate]);

        // Verify the DSC certificate's signature using the CSCA certificate
        const verified = forge.pki.verifyCertificateChain(caStore, [dscCertificate]);

        if (!verified) {
            throw new Error('DSC certificate verification failed');
        }

        // Check if the DSC certificate is within its validity period
        const currentDate = new Date();
        if (currentDate < dscCertificate.validity.notBefore || currentDate > dscCertificate.validity.notAfter) {
            throw new Error('DSC certificate is not within its validity period');
        }

        return true;
    } catch (error) {
        console.error('DSC certificate validation error:', error);
        return false;
    }
}

function getCscaPem(formattedValueAdjusted: string, dev_mode: boolean): string {
    const pemMap = dev_mode ? AKI_PEM_DEV : AKI_PEM_PROD;
    const pemKey = pemMap[formattedValueAdjusted as keyof typeof AKI_PEM_PROD];

    switch (pemKey) {
        case "fr1pem": return fr1pem;
        case "fr2pem": return fr2pem;
        case "fr3pem": return fr3pem;
        case "fr4pem": return fr4pem;
        case "pem1": return pem1;
        case "pem2": return pem2;
        case "pem3": return pem3;
        case "pem4": return pem4;
        case "mock_csca.pem": return mock_csca;
        case "mock": return mockpem;
        default:
            throw new Error(`No matching PEM found for key: ${formattedValueAdjusted}`);
    }
}


function getCSCAPem2(formattedValueAdjusted: string, dev_mode: boolean): string {
    const skiPem = dev_mode ? { ...SKI_PEM, ...SKI_PEM_DEV } : SKI_PEM;
    const pem = skiPem[formattedValueAdjusted];
    return pem;
}

export const AKI_PEM_DEV = {
    "22:F3:83:20:A5:73:42:2C:AF:46:AB:8C:3D:EE:76:4D:BB:E5:C5:02": "fr2pem",
    "0F:CC:32:51:E4:E9:2A:50:65:8C:AF:6A:68:71:BC:9E:8F:C8:6D:59": "fr3pem",
    "BE:8A:2E:D6:C9:F9:20:4E:3A:27:03:08:97:4D:EC:FD:D9:7D:C5:E6": "fr1pem",
    "66:36:B0:9B:26:D2:F2:80:54:5E:DA:C7:66:C8:F0:12:4D:B5:3B:B4": "fr4pem",
    "F1:8A:8B:FB:6A:44:A3:46:83:34:D2:D5:92:15:81:58:82:4A:4C:FB": "pem4",
    "E6:2D:65:16:F6:15:A8:6A:E7:89:EE:81:3C:BF:3E:1D:C2:A0:80:F4": "pem3",
    "BA:A6:B6:2F:13:7B:13:31:C9:C8:81:31:9E:55:21:86:3D:7B:8F:3A": "pem2",
    "B1:1A:1D:F8:23:A2:96:94:8E:E7:EA:49:A8:CC:87:72:C6:FA:DE:9A": "pem1",
    "54:68:60:4C:5D:07:08:9B:D2:C4:AB:44:D0:1B:D5:B5:03:4C:B7:47": "mock"
}
export const AKI_PEM_PROD = {
    "F1:8A:8B:FB:6A:44:A3:46:83:34:D2:D5:92:15:81:58:82:4A:4C:FB": "pem4",
    "E6:2D:65:16:F6:15:A8:6A:E7:89:EE:81:3C:BF:3E:1D:C2:A0:80:F4": "pem3",
    "BA:A6:B6:2F:13:7B:13:31:C9:C8:81:31:9E:55:21:86:3D:7B:8F:3A": "pem2",
    "B1:1A:1D:F8:23:A2:96:94:8E:E7:EA:49:A8:CC:87:72:C6:FA:DE:9A": "pem1"
}



export const AKI_MODULUS = {
    "F1:8A:8B:FB:6A:44:A3:46:83:34:D2:D5:92:15:81:58:82:4A:4C:FB": "00:a3:32:0e:36:16:2a:5d:e2:d6:4e:2d:ab:84:39:be:5f:66:57:d4:e3:14:af:f8:fb:0d:98:1c:eb:35:d9:ed:5c:ec:61:50:7e:e8:04:62:21:ba:24:ef:b4:b1:3e:d9:3d:65:e5:08:aa:e8:e3:5b:9f:49:c9:bf:84:52:22:3a:82:22:19:3a:ef:73:63:b0:40:f8:d4:1f:85:97:b2:c3:3a:f5:5c:a5:e1:7d:13:9d:e6:69:94:8a:fd:cd:cf:9b:a4:30:11:70:06:80:9a:38:75:1c:86:8a:b0:9a:5d:f9:94:29:3e:5f:b2:b7:34:e4:be:f8:75:9b:9f:1b:d1:40:5a:8e:22:db:13:71:a3:20:da:3a:7d:04:5f:af:98:7a:f4:9d:bb:9c:b2:2e:33:03:70:73:50:a5:ac:ad:bb:dc:57:4e:4c:e0:7f:f2:a3:2a:ee:ff:9b:aa:f0:99:2d:4b:16:f1:0b:32:b7:88:a5:d5:ca:2e:92:c1:19:0e:88:97:a4:6f:3b:55:2a:8b:84:2d:09:55:86:58:46:69:c5:0e:43:cb:9b:f8:f4:da:e2:04:56:29:51:ed:87:af:18:99:85:b9:93:5d:bf:d8:1e:76:0a:bc:c0:9d:dc:42:19:ec:1f:37:92:af:0f:2e:70:a1:01:03:5c:77:09:f8:ef:6c:e7:79:62:62:36:45:35:4e:5c:78:bf:91:e3:c8:d4:a1:72:d5:3e:e0:a6:5c:54:0a:aa:8d:4d:fe:df:be:95:64:7a:89:c5:b2:f2:d9:65:1d:91:ac:af:51:83:55:7d:3e:11:8f:b4:80:95:14:2d:1f:92:3f:3b:00:aa:de:48:80:2a:b4:06:54:3f:8b:3e:22:2d:44:bc:7c:0a:07:b3:8e:80:53:7b:bf:c8:73:51:6a:90:6e:dd:73:aa:2b:00:a6:40:7d:87:35:4b:9f:51:9c:83:e7:a7:15:68:80:73:13:42:0b:58:ac:18:ec:76:84:70:fd:bc:cb:40:ff:fb:e3:a9:a8:fc:f8:e1:cf:18:87:02:dc:49:da:08:60:92:0e:6f:71:73:05:5b:2a:fb:50:76:dd:57:aa:4d:9f:08:c6:90:e4:23:8c:2e:98:12:f0:25:2f:9e:27:5d:fa:5c:15:1e:80:bd:61:41:0b:f9:05:1a:dc:37:f5:e0:27:dc:32:0b:8d:d0:37:e7:7c:2d:f0:56:51:94:28:77:2e:e4:29:70:b4:2a:da:da:b6:01:f0:c1:ac:c2:77:19:7c:3d:1d:e9:d1:a7:97:6e:f7:94:05:b2:66:c9:14:12:db:b8:c3:ca:49:dc:ad:85:2b:ce:41:bc:59:15:a1:ad:6d:2d:51:1d",
    "E6:2D:65:16:F6:15:A8:6A:E7:89:EE:81:3C:BF:3E:1D:C2:A0:80:F4": "00:c3:85:46:1e:7a:f7:8e:c2:3f:fd:bb:f8:7c:a0:66:19:82:dc:ad:d7:00:06:44:0d:99:5a:fc:c6:49:a5:4b:bc:71:90:31:10:0a:88:67:cc:a4:a4:f2:fd:13:f8:bd:32:a7:78:7e:59:cb:4e:d5:9c:2c:68:97:d4:d0:70:dd:32:88:03:98:4b:f7:49:ea:0d:22:63:ae:aa:2a:1f:ce:40:cb:74:7e:bf:21:60:3f:25:f1:30:05:80:f3:fb:57:27:ef:fa:db:1e:e1:42:c2:8f:dd:90:f3:49:91:e1:3b:3a:b2:c6:77:d8:3a:b6:c8:fc:62:26:cc:66:b0:7c:37:b9:c8:56:01:1a:f5:03:84:8a:a5:e6:51:45:78:28:d2:8a:45:92:4b:bb:f4:5a:5b:36:46:36:af:89:aa:55:e0:00:d2:af:4b:02:96:55:6f:9a:20:d6:fc:e1:47:e4:04:87:5b:3d:f2:24:12:ae:89:31:da:24:f9:82:10:c8:77:a6:10:fe:a7:c6:71:c0:55:0c:0e:61:19:20:1e:27:70:f5:81:d7:65:99:07:82:1e:f9:79:f8:b1:32:80:32:dc:b4:31:be:89:27:10:2a:e5:a5:98:31:a8:8a:5d:ba:9f:80:c2:c1:16:f2:1a:09:65:ba:5d:dc:3c:5e:6f:6e:c0:00:5d:d1:97:d2:c1:18:f8:b5:b6:17:75:03:84:1b:fc:08:d5:0e:d2:32:41:a5:3a:d9:c1:e8:ed:f1:06:71:6e:64:56:0f:c1:2c:68:4a:1f:e4:49:28:ea:84:66:81:bc:6f:cd:17:d2:3b:ff:67:65:4d:36:d0:d4:ff:c7:e5:70:a1:bd:0e:40:fe:77:e9:20:8c:c4:00:c8:f0:8e:8c:2d:9a:72:10:dc:2b:96:5c:d5:0f:3f:b6:ad:13:db:9c:7a:1a:84:63:6f:16:9d:a9:1e:8c:2a:b0:18:68:ff:0a:38:b0:ab:2f:43:09:b2:3b:dc:7c:3d:cc:fa:17:72:25:72:4f:37:fe:d3:78:2c:8a:6c:af:9d:06:f5:42:93:d0:5e:3e:2e:a5:04:a9:a9:ea:51:07:8f:2c:b2:76:03:41:07:36:4f:ad:33:5f:e6:5e:b4:3a:1f:5e:5a:96:88:a1:31:dc:99:3a:12:eb:32:95:7d:f1:5b:fd:d5:a7:90:24:c5:d4:10:6e:cb:55:60:24:d7:88:b2:99:fc:9f:53:e1:63:94:36:de:ab:d5:f2:af:90:d5:36:b5:5f:74:c5:1a:4b:c0:6f:54:97:1a:23:d0:5b:81:dd:d8:9a:c5:24:40:68:f0:08:7c:9e:7f:2b:40:a5:fd:f7:d3:cb:23:e0:27:d5:a7",
    "BA:A6:B6:2F:13:7B:13:31:C9:C8:81:31:9E:55:21:86:3D:7B:8F:3A": "00:c3:d3:e6:fa:f2:cc:b8:4f:e1:d3:4e:44:2b:2e:8d:55:78:48:f9:a7:d1:f6:26:94:46:7e:84:35:53:ab:03:2f:90:04:db:e8:97:8b:cd:44:20:aa:11:c1:f0:ad:cd:b5:7b:c2:a6:46:81:6a:a0:de:da:d7:f6:22:76:86:4a:22:c0:46:ff:c1:e4:8a:d1:6a:3d:7e:fa:16:e7:55:71:8d:67:a6:ac:d1:14:c9:6f:fb:79:1f:e5:80:0d:ae:16:f3:0a:a5:65:a3:55:02:19:73:9f:44:9c:19:50:a8:09:43:d5:9b:fb:e3:8c:48:c9:b3:48:9c:20:5d:03:fd:6f:14:54:44:74:65:1a:5f:37:dc:20:ae:76:b7:47:6a:32:9f:10:5d:1f:fd:fe:56:37:1e:3f:b3:6f:c3:6d:f0:5a:5b:e1:4a:f4:b0:1e:5c:8a:a3:16:44:bc:c4:31:af:d4:b6:bb:f3:98:28:86:92:03:02:4e:9d:6c:a3:21:55:65:93:ed:8c:0f:9b:74:f9:a3:1d:84:e7:d2:08:37:ae:6a:27:39:8a:78:a2:9d:85:a6:5d:af:b6:73:af:18:58:57:15:63:71:ee:8a:15:39:5c:ac:dd:5f:aa:d0:27:02:37:84:4c:41:04:9d:f2:20:c3:8b:65:57:cd:bb:3e:6d:52:f5:d1:19:9c:7c:e4:c5:69:ae:b1:1a:35:50:d7:90:c3:ba:5d:3b:fb:00:bb:2d:f8:b9:54:40:f4:20:61:74:44:f1:4e:f4:4c:a4:1a:e7:cc:cd:46:e6:60:7b:1f:b9:6d:b1:2d:13:d8:6a:7c:42:24:71:69:74:7d:0a:7a:49:00:8d:c1:8a:5e:a5:24:9f:df:28:9c:15:cb:3a:fb:c5:1f:5c:db:0b:38:0c:82:7f:ba:1d:09:83:2f:30:91:e5:4e:89:ed:1a:bd:ae:8a:10:8e:cf:0b:3d:0d:d8:63:73:d0:97:76:b0:05:d4:04:3b:1f:b3:f9:cd:2b:0e:ca:da:4e:47:2c:9f:f9:6c:9c:fd:d1:df:13:c2:81:3a:8f:9c:5a:07:63:9b:3a:10:b0:04:5c:93:6f:40:ac:2e:b5:a7:68:8b:bf:67:22:6b:d0:ff:cd:a9:66:1a:65:78:6f:e2:82:1e:a2:eb:14:1c:49:78:aa:9b:e7:ec:af:61:54:d2:93:d5:ce:ea:00:a1:f7:64:46:cb:12:7c:55:e4:36:21:e6:ab:11:c0:89:ad:e0:cf:41:e4:b2:6c:16:88:c9:db:c4:ea:38:4d:43:07:ee:03:aa:0f:66:85:0f:82:69:7d:6c:d5:4a:f0:ec:fa:8e:a8:0f:2e:fd:eb:a4:d1:8c:43:f3:a9",
    "B1:1A:1D:F8:23:A2:96:94:8E:E7:EA:49:A8:CC:87:72:C6:FA:DE:9A": "00:bd:bc:15:fb:39:7f:bc:1c:cb:58:06:9d:ae:d4:d2:a4:2f:65:ff:33:8e:cc:04:0a:6f:08:55:5c:21:8f:28:ad:12:7c:e8:e2:a8:82:52:55:f6:e8:43:e4:ef:cf:ae:c5:83:16:fc:2c:38:54:27:3a:14:4b:11:e3:87:b3:ef:3b:c3:58:c0:65:cc:85:0a:f0:d0:9c:c0:01:18:cf:a9:b1:94:49:3d:ea:5c:ef:c3:7c:4c:00:8a:51:4a:c7:53:6f:9a:5a:f1:66:00:12:eb:88:88:a9:48:e5:ec:81:b0:60:0a:40:2c:4d:4e:93:98:e4:12:f6:03:4c:4d:7a:b8:27:b9:45:0c:f4:be:ea:9a:29:c8:22:ae:b8:70:21:6e:82:e2:bd:b0:c7:d1:b5:c6:be:ff:a6:22:08:ed:fa:3d:ec:3e:e1:e7:2d:36:d3:a3:b0:b2:10:a5:1c:09:90:d2:9e:0b:48:af:8d:c5:ec:69:ea:c5:9a:0e:c6:ff:13:b8:ca:8c:b7:31:91:c2:89:2e:c6:b2:18:5e:7c:79:d5:b8:7e:72:3d:d8:1b:88:de:90:21:3d:22:69:32:60:88:99:d3:7c:2e:f1:77:da:8d:23:9d:89:98:3e:c4:45:94:bb:23:db:e5:04:02:71:f5:dd:bb:35:a9:2d:3b:be:f4:67:c7:70:97:98:f6:13:1a:5e:9a:9a:56:e6:78:f6:8c:0e:05:78:a9:63:3c:7b:bd:5d:75:58:23:d6:3c:99:00:d8:33:c7:87:c3:4f:d0:7c:d8:0f:3e:23:0d:77:64:ea:54:fe:b0:56:f4:e6:77:46:4d:9a:48:e9:85:0b:af:55:ab:5d:9c:6d:8a:df:5e:86:dc:dc:65:f2:43:f8:5b:e3:23:22:de:d7:cd:4b:69:ea:79:eb:1b:d9:ae:7f:1a:bc:4a:87:03:88:88:da:c9:70:29:67:cd:39:6a:ad:d7:23:10:77:59:60:25:d3:e2:44:7a:c2:96:c6:01:03:6b:b9:ec:3f:05:62:2e:5a:b1:ae:81:73:c1:f1:a8:7c:7f:cb:6d:2d:eb:46:3b:9e:64:31:a3:c3:6e:4f:99:5d:8e:83:94:38:c3:2f:39:ee:ac:5d:1b:13:36:62:35:c4:66:51:0f:29:da:ba:53:a1:1a:a6:1f:f5:e7:b4:4d:0e:81:ab:06:cc:19:9c:25:7e:68:30:d0:be:ef:3b:c4:2c:12:5c:73:d6:33:30:88:17:5f:b4:79:56:52:39:fc:6b:e7:9e:7e:31:ea:59:a2:8a:8e:45:59:bd:e4:b0:c7:35:31:66:13:37:66:e6:93:9b:72:c8:ac:6f:43:a6:78:ad:97:71:fb:55"
}