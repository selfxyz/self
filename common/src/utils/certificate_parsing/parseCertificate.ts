import fs from 'fs';
import { execSync } from 'child_process';
import { parseCertificateSimple } from './parseCertificateSimple';
import { CertificateData } from './dataStructure';
export function parseCertificate(pem: string, fileName: string): any {
  let certificateData: CertificateData = {
    id: '',
    issuer: '',
    validity: {
      notBefore: '',
      notAfter: '',
    },
    subjectKeyIdentifier: '',
    authorityKeyIdentifier: '',
    signatureAlgorithm: '',
    hashAlgorithm: '',
    publicKeyDetails: undefined,
    rawPem: '',
    rawTxt: '',
  };
  try {
    certificateData = parseCertificateSimple(pem);
    const tempCertPath = `/tmp/${fileName}.pem`;
    fs.writeFileSync(tempCertPath, pem);
    try {
      const openSslOutput = execSync(`openssl x509 -in ${tempCertPath} -text -noout`).toString();
      certificateData.rawTxt = openSslOutput;
    } catch (error) {
      console.error(`Error executing OpenSSL command: ${error}`);
      certificateData.rawTxt = 'Error: Unable to generate human-readable format';
    } finally {
      fs.unlinkSync(tempCertPath);
    }

    return certificateData;
  } catch (error) {
    console.error(`Error processing certificate ${fileName}:`, error);
    throw error;
  }
}
