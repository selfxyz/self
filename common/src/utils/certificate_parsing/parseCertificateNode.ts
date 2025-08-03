import { execSync } from 'child_process';
import { unlinkSync, writeFileSync } from 'fs';

import type { CertificateData } from './dataStructure.js';

export function addOpenSslInfo(
  certificateData: CertificateData,
  pem: string,
  fileName: string
): CertificateData {
  const baseFileName = fileName.replace('.pem', '');
  const tempCertPath = `/tmp/${baseFileName}.pem`;

  const formattedPem = pem.includes('-----BEGIN CERTIFICATE-----')
    ? pem
    : `-----BEGIN CERTIFICATE-----\n${pem}\n-----END CERTIFICATE-----`;

  writeFileSync(tempCertPath, formattedPem);

  try {
    const openSslOutput = execSync(`openssl x509 -in ${tempCertPath} -text -noout`).toString();
    certificateData.rawTxt = openSslOutput;
  } catch (error) {
    console.error(`Error executing OpenSSL command: ${error}`);
    certificateData.rawTxt = 'Error: Unable to generate human-readable format';
  } finally {
    try {
      unlinkSync(tempCertPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  return certificateData;
}
