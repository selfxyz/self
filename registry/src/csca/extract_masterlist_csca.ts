import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as crypto from 'crypto';

// Function to convert DER to PEM
function derToPem(derBuffer: Buffer): string {
  const base64 = derBuffer.toString('base64');
  const pem = `-----BEGIN CERTIFICATE-----\n${base64.match(/.{1,64}/g)!.join('\n')}\n-----END CERTIFICATE-----\n`;
  return pem;
}

export async function extractMasterlistCsca() {
  // Extract masterlists from ICAO ldif file
  const ldif_path = path.join(__dirname, '..', '..', 'inputs', 'icao_download_section', 'icaopkd-complete-311024.ldif');
  const masterlist_path = path.join(__dirname, '..', '..', 'outputs', 'csca', 'masterlists');
  const csca_path = path.join(__dirname, '..', '..', 'outputs', 'csca');

  const outputsPath = path.join(__dirname, '..', '..', 'outputs');
  const outputsCscaPath = path.join(outputsPath, 'csca');

  if (!fs.existsSync(outputsPath)) {
    fs.mkdirSync(outputsPath);
  }

  if (!fs.existsSync(outputsCscaPath)) {
    fs.mkdirSync(outputsCscaPath);
  }

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
      const certPath = path.join(masterlist_csca_path, `cert_${count}.pem`);

      execSync(`openssl asn1parse -inform DER -in ${path.join(masterlist_path, `masterlist_${i}_binary_dump.bin`)} -strparse ${startOffset} -out ${certPath}`);

      // Check the size of the extracted certificate
      const stats = fs.statSync(certPath);
      if (stats.size > 10000) { // Adjust this threshold as needed
        console.warn(`Warning: Unusually large certificate extracted. Masterlist ${i}, Certificate ${count}, Size: ${stats.size} bytes`);
      }

      //console.log(`Extracted certificate ${count} to cert_${count}.pem (Size: ${stats.size} bytes)`);
      count++;
    }
  }

  // After extracting certificates, rename them to .der
  for (let i = 0; i < masterlists.length; i++) {
    const masterlist_csca_path = path.join(csca_path, `masterlist_${i}`);
    const files = fs.readdirSync(masterlist_csca_path);

    files.forEach((file) => {
      if (file.endsWith('.pem')) {
        const oldPath = path.join(masterlist_csca_path, file);
        const newPath = path.join(masterlist_csca_path, file.replace('.pem', '.der'));
        fs.renameSync(oldPath, newPath);
      }
    });
  }

  console.log('Deduplicating certificates...');

  const uniqueCertificates = new Map<string, Buffer>();
  let skippedFiles = 0;

  const masterlistDirectories = fs.readdirSync(csca_path);

  masterlistDirectories.forEach((directory) => {
    const dirPath = path.join(csca_path, directory);
    if (!fs.statSync(dirPath).isDirectory()) return;

    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
      if (!file.match(/^cert_\d+\.der$/)) {
        skippedFiles++;
        return;
      }

      const filePath = path.join(dirPath, file);
      const certContent = fs.readFileSync(filePath);

      try {
        // Hash the certificate content
        const hash = crypto.createHash('sha256').update(certContent).digest('hex');

        if (!uniqueCertificates.has(hash)) {
          uniqueCertificates.set(hash, certContent);
        }
      } catch (error) {
        console.error(`Error processing file: ${filePath}`, error);
        skippedFiles++;
      }
    });
  });

  console.log(`Skipped ${skippedFiles} non-certificate files.`);

  // Write unique certificates in PEM format
  const uniqueCertsDir = path.join(csca_path, 'pem_masterlist');
  if (!fs.existsSync(uniqueCertsDir)) {
    fs.mkdirSync(uniqueCertsDir);
  }

  let uniqueCertCount = 0;
  uniqueCertificates.forEach((certContent, hash) => {
    const pemContent = derToPem(certContent);
    const outputPath = path.join(uniqueCertsDir, `unique_cert_${uniqueCertCount}.pem`);
    fs.writeFileSync(outputPath, pemContent);
    uniqueCertCount++;
  });

  console.log(`Deduplicated and saved ${uniqueCertCount} unique certificates in PEM format. Skipped ${skippedFiles} non-certificate files.`);
}