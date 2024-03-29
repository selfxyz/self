import * as fs from 'fs';
import * as path from 'path';

// Extract pem certificates from ldif file
const fileContent = fs.readFileSync("inputs/icao_download_section/icaopkd-001-complete-007117.ldif", "utf-8");
const regex = /userCertificate;binary::\s*([\s\S]*?)(?=\w+:|\n\n|$)/g;
let match: RegExpExecArray | null;

const certificates: string[] = [];

while ((match = regex.exec(fileContent)) !== null) {
  const certificate = match[1].replace(/\s+/g, "");
  certificates.push(certificate);
}

if (!fs.existsSync("outputs/certificates/")) {
  fs.mkdirSync("outputs/certificates/");
}

for (let i = 0; i < certificates.length; i++) {
  fs.writeFileSync(
    path.join("outputs/certificates/", `certificate_${i}.pem`),
    `-----BEGIN CERTIFICATE-----\n${certificates[i]}\n-----END CERTIFICATE-----\n`
  );
}

console.log(`Extracted ${certificates.length} certificates.`);
