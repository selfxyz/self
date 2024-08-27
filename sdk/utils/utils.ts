import { ethers } from "ethers";
import { getCurrentDateYYMMDD } from "../../common/src/utils/utils";
import { REGISTER_ABI, REGISTER_CONTRACT_ADDRESS } from "../../common/src/constants/constants";
import { derToBytes } from '../../common/src/utils/csca';
import forge from 'node-forge'
import { SKI_PEM, SKI_PEM_DEV } from './skiPem';

export function getCurrentDateFormatted() {
    return getCurrentDateYYMMDD().map(datePart => BigInt(datePart).toString());
}

// OpenPassport2Step
export async function checkMerkleRoot(rpcUrl: string, merkleRoot: number) {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(REGISTER_CONTRACT_ADDRESS, REGISTER_ABI, provider);
    return await contract.checkRoot(merkleRoot);
}

// OpenPassport1Step
function getCSCAPem(formattedValueAdjusted: string, dev_mode: boolean): string {
    const skiPem = dev_mode ? { ...SKI_PEM, ...SKI_PEM_DEV } : SKI_PEM;
    const pem = skiPem[formattedValueAdjusted];
    return pem;
}

export function verifyDSCValidity(dscCertificate: forge.pki.Certificate, dev_mode: boolean) {
    const authorityKeyIdentifierExt = dscCertificate.extensions.find(
        (ext) => ext.name === 'authorityKeyIdentifier'
    );
    const value = authorityKeyIdentifierExt.value;
    const byteArray = derToBytes(value);
    const formattedValue = byteArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    const formattedValueAdjusted = formattedValue.substring(8); // Remove the first '3016' from the formatted string
    const csca_pem = getCSCAPem(formattedValueAdjusted, dev_mode);
    const csca_certificate = forge.pki.certificateFromPem(csca_pem);
    try {
        const caStore = forge.pki.createCaStore([csca_certificate]);
        const verified = forge.pki.verifyCertificateChain(caStore, [dscCertificate]);
        if (!verified) {
            throw new Error('DSC certificate verification failed');
        }
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
