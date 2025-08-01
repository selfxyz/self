import { parseCertificateSimple } from './parseCertificateSimple.js';
import { CertificateData } from './dataStructure.js';

// Dynamic imports for Node.js modules to avoid bundling in web environments
async function getNodeModules() {
  const fs = await import('fs');
  const { execSync } = await import('child_process');
  return { fs, execSync };
}

export async function parseCertificate(pem: string, fileName: string): Promise<CertificateData> {
  // Check if we're in a Node.js environment
  const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
  const isWeb = typeof window !== 'undefined';

  if (!isNode || isWeb) {
    // In web environment, fall back to parseCertificateSimple
    console.warn(
      'parseCertificate: Node.js features not available in web environment, using parseCertificateSimple'
    );
    return parseCertificateSimple(pem);
  }

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
    tbsBytes: undefined,
    tbsBytesLength: '',
    rawPem: '',
    rawTxt: '',
    publicKeyAlgoOID: '',
  };

  try {
    certificateData = parseCertificateSimple(pem);
    const baseFileName = fileName.replace('.pem', '');
    const tempCertPath = `/tmp/${baseFileName}.pem`;

    const formattedPem = pem.includes('-----BEGIN CERTIFICATE-----')
      ? pem
      : `-----BEGIN CERTIFICATE-----\n${pem}\n-----END CERTIFICATE-----`;

    // Dynamically import Node.js modules
    const { fs, execSync } = await getNodeModules();

    fs.writeFileSync(tempCertPath, formattedPem);
    try {
      const openSslOutput = execSync(`openssl x509 -in ${tempCertPath} -text -noout`).toString();
      certificateData.rawTxt = openSslOutput;
    } catch (error) {
      console.error(`Error executing OpenSSL command: ${error}`);
      certificateData.rawTxt = 'Error: Unable to generate human-readable format';
    } finally {
      try {
        fs.unlinkSync(tempCertPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    return certificateData;
  } catch (error) {
    console.error(`Error processing certificate ${fileName}:`, error);
    throw error;
  }
}
