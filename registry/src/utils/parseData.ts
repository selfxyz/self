import { CertificateData, PublicKeyDetailsRSA, PublicKeyDetailsECDSA } from "./dataStructure";
import { mock_csca_sha1_rsa_4096, mock_csca_sha256_rsa_4096, mock_csca_sha256_rsapss_4096 } from '../../../common/src/constants/mockCertificates';

export function getListOfExponents(certificates: { [key: string]: CertificateData }) {
    let exponents: string[] = [];
    for (const certificate of Object.values(certificates)) {
        if (certificate.signatureAlgorithm === "rsa" || certificate.signatureAlgorithm === "rsa-pss") {
            if (!certificate.publicKeyDetails) {
                console.log(`\x1b[31m${certificate.id} has no public key details\x1b[0m`);
                // console.log(certificate);
            } else if ((certificate.publicKeyDetails as PublicKeyDetailsRSA).exponent) {
                // check if the exponent is not already in the list
                if (!exponents.includes((certificate.publicKeyDetails as PublicKeyDetailsRSA).exponent)) {
                    exponents.push((certificate.publicKeyDetails as PublicKeyDetailsRSA).exponent);
                }
                if ((certificate.publicKeyDetails as PublicKeyDetailsRSA).exponent != "65537") {
                    console.log(`\x1b[31m${certificate.id} with exponent ${(certificate.publicKeyDetails as PublicKeyDetailsRSA).exponent}\x1b[0m`);
                }

            }
        }
    }
    // order the exponents in ascending order
    exponents.sort((a, b) => parseInt(a) - parseInt(b));
    return exponents;
}

export async function getMapJson(certificates: { [key: string]: CertificateData }) {
    const certificateMap: { [key: string]: { [key: string]: number } } = {};

    for (const certificateData of Object.values(certificates)) {
        const mapKey = getMapKey(certificateData);

        if (!certificateMap[mapKey]) {
            certificateMap[mapKey] = {};
        }

        if (!certificateMap[mapKey][certificateData.issuer]) {
            certificateMap[mapKey][certificateData.issuer] = 0;
        }

        certificateMap[mapKey][certificateData.issuer]++;
    }
    return certificateMap;

}

function getMapKey(certificateData: CertificateData): string {
    const { signatureAlgorithm, hashAlgorithm, publicKeyDetails } = certificateData;

    let keyDetails = 'unknown';

    if (publicKeyDetails) {
        if (signatureAlgorithm === "ecdsa") {
            // ECDSA
            const curve = (publicKeyDetails as PublicKeyDetailsECDSA).curve;
            const keySize = (publicKeyDetails as PublicKeyDetailsRSA).bits.toString();

            keyDetails = `${keySize} bit ${curve}`;
        } else {
            // RSA
            const keySize = (publicKeyDetails as PublicKeyDetailsRSA).bits.toString();
            const exponent = (publicKeyDetails as PublicKeyDetailsRSA).exponent;
            keyDetails = `${keySize} bit ${exponent}`;
        }
    }

    return `${hashAlgorithm.toLowerCase()} ${signatureAlgorithm.toLowerCase()} ${keyDetails}`;
}

export function getSkiPemJson(certificates: { [key: string]: CertificateData }) {
    const skiPemMap: { [ski: string]: string } = {};

    console.log('Total certificates to process:', Object.keys(certificates).length);

    for (const certificateData of Object.values(certificates)) {
        if (certificateData.rawPem && certificateData.subjectKeyIdentifier) {
            skiPemMap[certificateData.subjectKeyIdentifier] = certificateData.rawPem;
        }
    }

    console.log('Final map size:', Object.keys(skiPemMap).length);

    return skiPemMap;
}

export async function getRegistryJson(certificates: { [key: string]: CertificateData }) {

    const certificateMap: { [id: string]: any } = {};

    for (const certificateData of Object.values(certificates)) {
        if (certificateData.rawPem) {
            certificateMap[certificateData.id] = certificateData;
        }
    }
    return certificateMap;
}
