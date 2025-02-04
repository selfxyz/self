import fs from 'fs';
import path from 'path';
import { PassportData } from '../../../common/src/utils/types';
import { parsePassportData } from '../../../common/src/utils/parsePassportData';

function parsePassportFile(filePath: string) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const passportData = JSON.parse(fileContent) as PassportData;

        const passportMetaData = parsePassportData(passportData);

        // Print the results
        console.log(`\nProcessing file: ${path.basename(filePath)}`);
        console.log('----------------------------------------');
        if (passportMetaData.countryCode) console.log(`Country Code: ${passportMetaData.countryCode}`);
        console.log(`Data Groups: ${passportMetaData.dataGroups}`);
        console.log(`DG1 Hash Function: ${passportMetaData.dg1HashFunction}`);
        console.log(`DG1 Hash Offset: ${passportMetaData.dg1HashOffset}`);
        console.log(`eContent Size: ${passportMetaData.eContentSize}`);
        console.log(`eContent Hash Function: ${passportMetaData.eContentHashFunction}`);
        console.log(`eContent Hash Offset: ${passportMetaData.eContentHashOffset}`);
        console.log(`Signed Attributes Size: ${passportMetaData.signedAttrSize}`);
        console.log(`Signed Attributes Hash Function: ${passportMetaData.signedAttrHashFunction}`);
        console.log(`Signature Algorithm: ${passportMetaData.signatureAlgorithm}`);
        console.log(`Signature Algorithm Details: ${passportMetaData.signatureAlgorithmDetails}`);
        console.log(`Curve or Exponent: ${passportMetaData.curveOrExponent}`);
        console.log(`Signature Algorithm Bits: ${passportMetaData.signatureAlgorithmBits}`);
        console.log(`CSCA Found: ${passportMetaData.cscaFound}`);
        console.log(`CSCA Hash Function: ${passportMetaData.cscaHashFunction}`);
        console.log(`CSCA Signature: ${passportMetaData.cscaSignature}`);
        console.log(`CSCA Signature Algorithm Details: ${passportMetaData.cscaSignatureAlgorithmDetails}`);
        console.log(`CSCA Curve or Exponent: ${passportMetaData.cscaCurveOrExponent}`);
        console.log(`CSCA Signature Algorithm Bits: ${passportMetaData.cscaSignatureAlgorithmBits}`);

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
