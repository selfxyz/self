import * as fs from 'fs';
import { CertificateData, PublicKeyDetailsRSAPSS } from './dataStructure';
import { parseRsaPssPublicKey, parseECParameters, parseRsaPublicKey } from './publicKeyDetails';
import { getCertificateFromPem, getIssuerCountryCode, getSignatureAlgorithmDetails, getSubjectKeyIdentifier } from './utils';
import { execSync } from 'child_process';

export function processCertificate(pemContent: string, fileName: string): CertificateData {
    let certificateData: CertificateData = {
        id: '',
        issuer: '',
        validity: {
            notBefore: '',
            notAfter: ''
        },
        subjectKeyIdentifier: '',
        signatureAlgorithm: '',
        hashAlgorithm: '',
        publicKeyDetails: undefined,
        rawPem: '',
        rawTxt: ''
    };

    const cert = getCertificateFromPem(pemContent);
    const sbk = getSubjectKeyIdentifier(cert);
    certificateData.id = sbk.slice(0, 12);
    certificateData.subjectKeyIdentifier = sbk;
    certificateData.issuer = getIssuerCountryCode(cert);;
    certificateData.validity = {
        notBefore: cert.notBefore.value.toString(),
        notAfter: cert.notAfter.value.toString()
    };

    const { signatureAlgorithm, hashAlgorithm } = getSignatureAlgorithmDetails(cert.signatureAlgorithm.algorithmId);
    certificateData.signatureAlgorithm = signatureAlgorithm;
    certificateData.hashAlgorithm = hashAlgorithm;
    const subjectPublicKeyInfo = cert.subjectPublicKeyInfo;
    switch (signatureAlgorithm) {
        case 'rsa':
            certificateData.publicKeyDetails = parseRsaPublicKey(subjectPublicKeyInfo);
            if (!certificateData.publicKeyDetails) {
                console.log('\x1b[33mRSA public key not found, probably ECDSA certificate\x1b[0m');
            }
            break;
        case 'rsa-pss':
            const rsaPssParams = cert.signatureAlgorithm.algorithmParams;
            certificateData.publicKeyDetails = parseRsaPssPublicKey(subjectPublicKeyInfo, rsaPssParams);
            if (certificateData.publicKeyDetails) {
                certificateData.hashAlgorithm = (certificateData.publicKeyDetails as PublicKeyDetailsRSAPSS).hashAlgorithm;
            }
            if (!certificateData.publicKeyDetails) {
                console.log('\x1b[33mRSA-PSS public key not found\x1b[0m');
            }
            break;
        case 'ecdsa':
            certificateData.publicKeyDetails = parseECParameters(subjectPublicKeyInfo);
            if (!certificateData.publicKeyDetails) {
                console.log('\x1b[33mECDSA public key not found\x1b[0m');
            }
            break;
        default:
            console.log('\x1b[33mUnknown signature algorithm: \x1b[0m', signatureAlgorithm);
    }

    certificateData.rawPem = pemContent;
    const tempCertPath = `/tmp/${fileName}.pem`;
    fs.writeFileSync(tempCertPath, pemContent);
    try {
        const openSslOutput = execSync(`openssl x509 -in ${tempCertPath} -text -noout`).toString();
        certificateData.rawTxt = openSslOutput;
    } catch (error) {
        console.error(`Error executing OpenSSL command: ${error}`);
        certificateData.rawTxt = 'Error: Unable to generate human-readable format';
    } finally {
        fs.unlinkSync(tempCertPath);
    }


    if (certificateData.signatureAlgorithm === 'rsa-pss' && !certificateData.publicKeyDetails) {
        console.log('\x1b[33mRSA-PSS public key details not found in rssa-pss file: \x1b[0m', fileName);
    }
    return certificateData;
}
