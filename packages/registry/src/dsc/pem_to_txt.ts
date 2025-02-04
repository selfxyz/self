import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const inputDir = 'outputs/dsc/pem_masterlist';
const outputDir = 'outputs/dsc/txt_masterlist';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Read all PEM files from the input directory
const pemFiles = fs.readdirSync(inputDir).filter(file => file.endsWith('.pem'));

pemFiles.forEach(pemFile => {
    const pemPath = path.join(inputDir, pemFile);
    const txtFilename = pemFile.replace('.pem', '.txt');
    const txtPath = path.join(outputDir, txtFilename);

    try {
        // Use OpenSSL to convert PEM to human-readable format
        const command = `openssl x509 -in "${pemPath}" -text -noout`;
        const result = execSync(command).toString();

        fs.writeFileSync(txtPath, result);
        console.log(`Converted ${pemFile} to ${txtFilename}`);
    } catch (error) {
        console.error(`Error processing ${pemFile}: ${error.message}`);
    }
});

console.log(`Processed ${pemFiles.length} certificates.`);