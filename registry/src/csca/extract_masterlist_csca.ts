import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export async function extractMasterlistCsca() {
  // Extract masterlists from ICAO ldif file
  const ldif_path = path.join(__dirname, '..', '..', 'inputs', 'icao_download_section', 'icaopkd-002-complete-000243.ldif');
  const masterlist_path = path.join(__dirname, '..', '..', 'outputs', 'masterlists');
  const csca_path = path.join(__dirname, '..', '..', 'outputs', 'csca');

  const fileContent = fs.readFileSync(ldif_path, "utf-8");
  const regex = /pkdMasterListContent::\s*([\s\S]*?)(?=\w+:|\n\n|$)/g;
  let match: RegExpExecArray | null;

  const masterlists: string[] = [];

  while ((match = regex.exec(fileContent)) !== null) {
    const masterlist = match[1].replace(/\s+/g, "");
    masterlists.push(masterlist);
  }

  if (!fs.existsSync(masterlist_path)) {
    fs.mkdirSync(masterlist_path);
  }

  for (let i = 0; i < masterlists.length; i++) {
    fs.writeFileSync(
      path.join(masterlist_path, `masterlist_${i}.pem`),
      `-----BEGIN CERTIFICATE-----\n${masterlists[i]}\n-----END CERTIFICATE-----\n`
    );
  }

  console.log(`Extracted ${masterlists.length} masterlists.`);

  for (let i = 0; i < masterlists.length; i++) {
    execSync(`openssl asn1parse -in ${path.join(masterlist_path, `masterlist_${i}.pem`)} -inform PEM -i > ${path.join(masterlist_path, `masterlist_${i}_structure.txt`)}`);
  }

  console.log(`Extracted ${masterlists.length} masterlist structures.`);

  for (let i = 0; i < masterlists.length; i++) {
    const asn1Output = fs.readFileSync(path.join(masterlist_path, `masterlist_${i}_structure.txt`), 'utf8');

    const hexDumpMatch = asn1Output.match(/\[HEX DUMP\]:([A-Fa-f0-9]+)/);
    if (!hexDumpMatch) {
      console.error('No hex dump found');
      process.exit(1);
    }
    const hexDump = hexDumpMatch[1];

    const binaryDump = Buffer.from(hexDump, 'hex');
    fs.writeFileSync(path.join(masterlist_path, `masterlist_${i}_binary_dump.bin`), binaryDump);

    const asn1ParseOutput = execSync(`openssl asn1parse -inform DER -in ${path.join(masterlist_path, `masterlist_${i}_binary_dump.bin`)}`, { maxBuffer: 10485770 }).toString();
    fs.writeFileSync(path.join(masterlist_path, `masterlist_${i}_asn1_parse_output.txt`), asn1ParseOutput);

    const certificateMatches = asn1ParseOutput.matchAll(/(\d+):d=2\s+hl=4\s+l=\s*(\d+)\s+cons:\s+SEQUENCE/g);

    if (!fs.existsSync(csca_path)) {
      fs.mkdirSync(csca_path);
    }

    const masterlist_csca_path = path.join(csca_path, `masterlist_${i}`);
    if (!fs.existsSync(masterlist_csca_path)) {
      fs.mkdirSync(masterlist_csca_path);
    }

    let count = 0;
    for (const match of certificateMatches) {
      const startOffset = parseInt(match[1]);
      const certificateOutput = execSync(`openssl asn1parse -inform DER -in ${path.join(masterlist_path, `masterlist_${i}_binary_dump.bin`)} -strparse ${startOffset} -out ${path.join(masterlist_csca_path, `cert_${count}.pem`)}`).toString();
      console.log(`Extracted certificate ${count} to cert_${count}.pem`);
      count++;
    }
  }

  console.log('Deduplicating certificates...');

  const uniqueCertificates = new Set<string>();

  const masterlistDirectories = fs.readdirSync(csca_path);

  masterlistDirectories.forEach((directory) => {
    const files = fs.readdirSync(path.join(csca_path, directory));

    files.forEach((file) => {
      const filePath = path.join(csca_path, directory, file);
      const certContent = fs.readFileSync(filePath);

      const certBase64 = certContent.toString('base64');

      if (!uniqueCertificates.has(certBase64)) {
        uniqueCertificates.add(certBase64);
      }
    });
  });

  const uniqueCertsDir = path.join(csca_path, 'pem_masterlist');
  if (!fs.existsSync(uniqueCertsDir)) {
    fs.mkdirSync(uniqueCertsDir);
  }

  let uniqueCertCount = 0;
  uniqueCertificates.forEach((certBase64) => {
    const pemCert = `-----BEGIN CERTIFICATE-----\n${certBase64}\n-----END CERTIFICATE-----\n`;
    fs.writeFileSync(path.join(uniqueCertsDir, `unique_cert_${uniqueCertCount}.pem`), pemCert);
    uniqueCertCount++;
  });

  console.log(`Deduplicated and saved ${uniqueCertCount} unique certificates.`);
}