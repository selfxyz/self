import * as fs from 'fs';
import * as path from 'path';
import { processCertificate , insertDB } from './utils';

const pemDirectory = path.join(__dirname, '..', '..', 'outputs', 'unique_pem');

async function main() {
    try {
        if (!fs.existsSync("outputs/unique_pem/")) {
            fs.mkdirSync("outputs/unique_pem/");
          }
        console.log(`Reading directory: ${pemDirectory}`);
        const files = fs.readdirSync(pemDirectory);
        console.log(`Found ${files.length} files`);
        for (const file of files) {
            if (path.extname(file).toLowerCase() === '.pem') {
                console.log(`Processing file: ${file}`);
                const pemFilePath = path.join(pemDirectory, file);
                const pemContent = fs.readFileSync(pemFilePath, 'utf8');
                const certificateData = processCertificate(pemContent, file);
                //Insert certificates into the database
                insertDB(await certificateData);
            }
        }
    } catch (error) {
        console.error('Error in main:', error);
    }
}
console.log('Script started');
main();