import { processCertificate } from "./utils/processCertificate";
import path from 'path';
import fs from 'fs';
import { getListOfExponents, getMapJson } from "./utils/parseData";
const csca_pem_directory_path = path.join(__dirname, '..', 'outputs', 'csca', 'pem_masterlist');
const dsc_pem_directory_path = path.join(__dirname, '..', 'outputs', 'dsc', 'pem_masterlist');
import { CertificateData } from './utils/dataStructure';

function main(arg: string) {

    // CSCA certificates
    if (arg === 'csca') {
        let csca_certificates: { [key: string]: CertificateData } = {};
        // Parse data
        const files = fs.readdirSync(csca_pem_directory_path);
        for (const file of files) {
            const pemContent = fs.readFileSync(path.join(csca_pem_directory_path, file), 'utf8');
            const certificate = processCertificate(pemContent, file);
            if (certificate) {
                const notAfterDate = new Date(certificate.validity.notAfter);
                if (notAfterDate > new Date()) {
                    csca_certificates[file] = certificate;

                } else {
                    console.log('\x1b[90m%s\x1b[0m', `certificate ${file} is expired.`);
                }
            }
        }

        // Get list of exponents
        // const exponents = getListOfExponents(csca_certificates);
        // console.log(exponents);

        // Get map json
        // const mapJson = getMapJson(csca_certificates);
        // console.log(mapJson);

        // Get map json


    }

    // DSC certificates
    if (arg === 'dsc') {
        let dsc_certificates: { [key: string]: CertificateData } = {};
        const files = fs.readdirSync(dsc_pem_directory_path);
        for (const file of files) {
            const pemContent = fs.readFileSync(path.join(dsc_pem_directory_path, file), 'utf8');
            const certificate = processCertificate(pemContent, file);
            if (certificate) {
                dsc_certificates[certificate.id] = certificate;
            }
        }

        const exponents = getListOfExponents(dsc_certificates);
        console.log(exponents);
    }
}

const arg = process.argv[2];
main(arg);