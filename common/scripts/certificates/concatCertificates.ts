import * as fs from 'fs';
import * as path from 'path';

const srcDir = path.join(__dirname, '..', '..', 'src', 'mock_certificates');
const outputFile = path.join(__dirname, '..', '..', 'src', 'constants', 'mockCertificates.ts');

const algorithms = [
  'sha1_rsa_2048',
  'sha1_rsa_4096',
  'sha256_rsa_2048',
  'sha256_rsa_4096',
  'sha256_rsapss_2048',
  'sha256_rsapss_4096',
];

function readFile(dir: string, filename: string): string | null {
  const filePath = path.join(dir, filename);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8').trim();
  }
  return null;
}

let output = '';

algorithms.forEach((algo) => {
  const algoDir = path.join(srcDir, algo);

  const cscaCert = readFile(algoDir, 'mock_csca.crt') || readFile(algoDir, 'mock_csca.pem');
  const dscCert = readFile(algoDir, 'mock_dsc.crt') || readFile(algoDir, 'mock_dsc.pem');
  const dscKey = readFile(algoDir, 'mock_dsc.key');

  if (cscaCert) {
    output += `export const mock_csca_${algo} = \`${cscaCert}\`\n\n`;
  }

  if (dscCert) {
    output += `export const mock_dsc_${algo} = \`${dscCert}\`\n\n`;
  }

  if (dscKey) {
    output += `export const mock_dsc_key_${algo} = \`${dscKey}\`\n\n`;
  }
});

fs.writeFileSync(outputFile, output);
console.log(`Certificates and keys have been written to ${outputFile}`);
