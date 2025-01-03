import fs from 'fs';
import path from 'path';
import { parseCertificateSimple } from '../../common/src/utils/certificate_parsing/parseCertificateSimple';

const pemDirectory = path.join(__dirname, '..', 'outputs', 'csca', 'pem_masterlist');
const ski_pem_path = path.join(__dirname, '..', 'outputs', 'ski_pem.json');
const ski_pem_dev_path = path.join(__dirname, '..', 'outputs', 'ski_pem_dev.json');
const dev_pem_path = path.join(__dirname, '..', '..', 'common', 'src', 'mock_certificates');

async function getAllDevPem() {
    // for all subdirectory in dev_pem_path, check inside each directory for 'mock_csca.pem' or 'mock_csca.cer'
    let certificates: string[] = [];
    const subdirectories = fs.readdirSync(dev_pem_path, { withFileTypes: true })
        .filter(item => item.isDirectory())
        .map(item => item.name);
    for (const subdirectory of subdirectories) {
        const pemFilePath = path.join(dev_pem_path, subdirectory, 'mock_csca.pem');
        if (fs.existsSync(pemFilePath)) {
            const pemFile = fs.readFileSync(pemFilePath, 'utf8');
            certificates.push(pemFile);
        }
        const cerFilePath = path.join(dev_pem_path, subdirectory, 'mock_csca.cer');
        if (fs.existsSync(cerFilePath)) {
            const cerFile = fs.readFileSync(cerFilePath, 'utf8');
            certificates.push(cerFile);
        }
    }
    return certificates;
}

async function main() {
    const skiPemDevJson: {
        [key: string]: string
    } = {};
    const skiPemJson: {
        [key: string]: string
    } = {};

    const devCertificates = await getAllDevPem();

    const prodCertificates = fs.readdirSync(pemDirectory);

    for (const prodCertificate of prodCertificates) {
        const pemContent = fs.readFileSync(path.join(pemDirectory, prodCertificate), 'utf8');
        try {
            const certificateData = parseCertificateSimple(pemContent);
            skiPemJson[certificateData.subjectKeyIdentifier] = pemContent;
            skiPemDevJson[certificateData.subjectKeyIdentifier] = pemContent;
        } catch (error) {
            console.log('\x1b[90m%s\x1b[0m', `certificate ${prodCertificate} is invalid.`);
        }
    }

    console.log(skiPemJson);
}

main().catch(console.error);
