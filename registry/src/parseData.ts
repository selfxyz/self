import { processCertificate } from "./utils/processCertificate";
import path from 'path';
import fs from 'fs';
import { getListOfExponents, getMapJson, getSkiPemJson } from "./utils/parseData";
const csca_pem_directory_path = path.join(__dirname, '..', 'outputs', 'csca', 'pem_masterlist');
const dsc_pem_directory_path = path.join(__dirname, '..', 'outputs', 'dsc', 'pem_masterlist');
import { CertificateData } from './utils/dataStructure';

function main(arg: string) {

    // CSCA certificates
    if (arg === 'csca') {
        let csca_certificates: { [key: string]: CertificateData } = {};
        const seenSKIs = new Set<string>();
        const duplicates: string[] = [];

        // Parse data
        const files = fs.readdirSync(csca_pem_directory_path);
        for (const file of files) {
            const pemContent = fs.readFileSync(path.join(csca_pem_directory_path, file), 'utf8');
            try {
                const certificate = processCertificate(pemContent, file);
                if (certificate) {
                    const notAfterDate = new Date(certificate.validity.notAfter);
                    if (notAfterDate > new Date()) {
                        // Check if we've seen this SKI before
                        if (seenSKIs.has(certificate.subjectKeyIdentifier)) {
                            console.log('\x1b[33m%s\x1b[0m', `Skipping duplicate SKI in ${file} (SKI: ${certificate.subjectKeyIdentifier})`);
                            duplicates.push(file);
                            continue;
                        }

                        seenSKIs.add(certificate.subjectKeyIdentifier);
                        csca_certificates[file] = certificate;
                    } else {
                        console.log('\x1b[90m%s\x1b[0m', `certificate ${file} is expired.`);
                    }
                }
            }
            catch (error) {
                console.log('\x1b[90m%s\x1b[0m', `certificate ${file} is invalid.`);
            }
        }

        // Log summary of duplicates
        if (duplicates.length > 0) {
            console.log('\x1b[33m%s\x1b[0m', `\nFound ${duplicates.length} duplicate certificates (by SKI):`);
            duplicates.forEach(file => console.log('\x1b[33m%s\x1b[0m', `- ${file}`));
        }

        const skiPemJson = getSkiPemJson(csca_certificates);
        console.log('\nProcessed certificates:', Object.keys(csca_certificates).length);
        console.log('Unique SKIs:', seenSKIs.size);

        fs.writeFileSync(path.join(__dirname, '..', 'outputs', 'skiPemMasterList.json'), JSON.stringify(skiPemJson, null, 2));

    }

    // DSC certificates
    if (arg === 'dsc') {
        let dsc_certificates: { [key: string]: CertificateData } = {};
        const files = fs.readdirSync(dsc_pem_directory_path);
        for (const file of files) {
            const pemContent = fs.readFileSync(path.join(dsc_pem_directory_path, file), 'utf8');
            try {
                const certificate = processCertificate(pemContent, file);
                if (certificate) {
                    const notAfterDate = new Date(certificate.validity.notAfter);
                    if (notAfterDate > new Date()) {
                        dsc_certificates[file] = certificate;

                    } else {
                        console.log('\x1b[90m%s\x1b[0m', `certificate ${file} is expired.`);
                    }
                }
            }
            catch (error) {
                console.log('\x1b[90m%s\x1b[0m', `certificate ${file} is invalid.`);
            }

        }

        const exponents = getListOfExponents(dsc_certificates);
        console.log(exponents);
    }
}

const arg = process.argv[2];
main(arg);