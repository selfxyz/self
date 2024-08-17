import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// extract masterlists from ICAO ldif file
const fileContent = fs.readFileSync("inputs/icao_download_section/icaopkd-002-complete-000243.ldif", "utf-8");
const regex = /pkdMasterListContent::\s*([\s\S]*?)(?=\w+:|\n\n|$)/g;
let match: RegExpExecArray | null;

const masterlists: string[] = [];

while ((match = regex.exec(fileContent)) !== null) {
  const masterlist = match[1].replace(/\s+/g, "");
  masterlists.push(masterlist);
}

if (!fs.existsSync("outputs/masterlists/")) {
  fs.mkdirSync("outputs/masterlists/");
}

for (let i = 0; i < masterlists.length; i++) {
  fs.writeFileSync(
    path.join("outputs/masterlists/", `masterlist_${i}.pem`),
    `-----BEGIN CERTIFICATE-----\n${masterlists[i]}\n-----END CERTIFICATE-----\n`
  );
}

console.log(`Extracted ${masterlists.length} masterlists.`);

for (let i = 0; i < masterlists.length; i++) {
  execSync(`openssl asn1parse -in outputs/masterlists/masterlist_${i}.pem -inform PEM -i > outputs/masterlists/masterlist_${i}_structure.txt`);
}

console.log(`Extracted ${masterlists.length} masterlist structures.`);

for (let i = 0; i < masterlists.length; i++) {
  const asn1Output = fs.readFileSync(`outputs/masterlists/masterlist_${i}_structure.txt`, 'utf8');

  // Extract the first hex dump using a regex
  const hexDumpMatch = asn1Output.match(/\[HEX DUMP\]:([A-Fa-f0-9]+)/);
  if (!hexDumpMatch) {
    console.error('No hex dump found');
    process.exit(1);
  }
  const hexDump = hexDumpMatch[1];

  // Convert hex dump to binary
  const binaryDump = Buffer.from(hexDump, 'hex');
  fs.writeFileSync(`outputs/masterlists/masterlist_${i}_binary_dump.bin`, binaryDump);

  // Parse binary data using OpenSSL and extract individual certificates
  const asn1ParseOutput = execSync(`openssl asn1parse -inform DER -in outputs/masterlists/masterlist_${i}_binary_dump.bin`, { maxBuffer: 10485770 }).toString();
  fs.writeFileSync(`outputs/masterlists/masterlist_${i}_asn1_parse_output.txt`, asn1ParseOutput);

  const certificateMatches = asn1ParseOutput.matchAll(/(\d+):d=2\s+hl=4\s+l=\s*(\d+)\s+cons:\s+SEQUENCE/g);

  if (!fs.existsSync(`outputs/cscas/`)) {
    fs.mkdirSync(`outputs/cscas/`);
  }

  if (!fs.existsSync(`outputs/cscas/masterlist_${i}`)) {
    fs.mkdirSync(`outputs/cscas/masterlist_${i}`);
  }

  let count = 0;
  for (const match of certificateMatches) {
    const startOffset = parseInt(match[1]);
    const certificateOutput = execSync(`openssl asn1parse -inform DER -in outputs/masterlists/masterlist_${i}_binary_dump.bin -strparse ${startOffset} -out outputs/cscas/masterlist_${i}/cert_${count}.pem`).toString();
    console.log(`Extracted certificate ${count} to cert_${count}.pem`);
    count++;
  }
}

console.log('Deduplicating certificates...');

// Deduplicate certificates
const uniqueCertificates = new Set<string>();

const masterlistDirectories = fs.readdirSync('outputs/cscas/');

masterlistDirectories.forEach((directory) => {
  const files = fs.readdirSync(`outputs/cscas/${directory}`);

  files.forEach((file) => {
    const filePath = path.join(`outputs/cscas/${directory}`, file);
    const certContent = fs.readFileSync(filePath);  // Read as binary

    const certBase64 = certContent.toString('base64');  // Convert to base64 for comparison

    if (!uniqueCertificates.has(certBase64)) {
      uniqueCertificates.add(certBase64);
    }
  });
});

// Write unique certificates to new files
const uniqueCertsDir = 'outputs/unique_pem_masterlist/';
if (!fs.existsSync(uniqueCertsDir)) {
  fs.mkdirSync(uniqueCertsDir);
}

let uniqueCertCount = 0;
uniqueCertificates.forEach((certBase64) => {
  // const certBuffer = Buffer.from(certBase64, 'base64');  // Convert back to binary
  const pemCert = `-----BEGIN CERTIFICATE-----\n${certBase64}\n-----END CERTIFICATE-----\n`;
  fs.writeFileSync(path.join(uniqueCertsDir, `unique_cert_${uniqueCertCount}.pem`), pemCert);
  uniqueCertCount++;
});

console.log(`Deduplicated and saved ${uniqueCertCount} unique certificates.`);