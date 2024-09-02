import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const pathToPemFiles = "outputs/unique_pem";
const pathToTextOutput = "outputs/unique_txt";

// Function to convert PEM to human-readable text using openssl
function convertPemToText(pemFilePath: string, outputFilePath: string) {
    try {
        const command = `openssl x509 -in "${pemFilePath}" -text -noout`;
        const humanReadableText = execSync(command).toString();

        fs.writeFileSync(outputFilePath, humanReadableText);
        console.log(`Converted ${pemFilePath} to ${outputFilePath}`);
    } catch (error) {
        console.error(`Error processing file ${pemFilePath}:`, error);
    }
}

// Read all PEM files from the directory
fs.readdir(pathToPemFiles, (err, files) => {
    if (err) {
        console.error(`Error reading directory ${pathToPemFiles}:`, err);
        return;
    }

    files.forEach(file => {
        if (path.extname(file) === '.pem') {
            const pemFilePath = path.join(pathToPemFiles, file);
            const outputFilePath = path.join(pathToTextOutput, path.basename(file, '.pem') + '.txt');
            convertPemToText(pemFilePath, outputFilePath);
        }
    });
});