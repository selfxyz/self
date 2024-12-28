import fs from 'fs';
import path from 'path';
import { PassportData } from '../../../common/src/utils/types';
import { parsePassportData } from '../../../app/src/utils/parsePassportData';

function parsePassportFile(filePath: string) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const passportData = JSON.parse(fileContent) as PassportData;

        const info = parsePassportData(passportData);

        // Print the results
        console.log(`\nProcessing file: ${path.basename(filePath)}`);
        console.log('----------------------------------------');
        if (info.countryCode) console.log(`Country Code: ${info.countryCode}`);
        console.log(`Data Groups: ${info.dataGroups}`);
        console.log(`DG1 Hash Function: ${info.dg1HashFunction}`);
        console.log(`DG1 Hash Offset: ${info.dg1HashOffset}`);
        console.log(`eContent Size: ${info.eContentSize}`);
        console.log(`eContent Hash Function: ${info.eContentHashFunction}`);
        console.log(`eContent Hash Offset: ${info.eContentHashOffset}`);
        console.log(`Signed Attributes Size: ${info.signedAttrSize}`);
        console.log(`Signed Attributes Hash Function: ${info.signedAttrHashFunction}`);

    } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
    }
}

function main() {
    const directoryPath = path.join(__dirname, 'passport_data');
    console.log(directoryPath);

    try {
        const files = fs.readdirSync(directoryPath);
        const jsonFiles = files.filter(file => file.endsWith('.json'));

        if (jsonFiles.length === 0) {
            console.log('No JSON files found in the passport_data directory');
            return;
        }

        jsonFiles.forEach(file => {
            const filePath = path.join(directoryPath, file);
            parsePassportFile(filePath);
        });

    } catch (error) {
        console.error('Error reading directory:', error);
    }
}

// Execute the script
main();
