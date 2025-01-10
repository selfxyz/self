import fs from 'fs';
import path from 'path';
import { parseCertificateSimple } from '../../common/src/utils/certificate_parsing/parseCertificateSimple';

const mockDscPath = path.join(__dirname, '..', '..', 'common', 'src', 'mock_certificates', 'sha256_secp384r1_sha1_rsa_65537_4096', 'mock_dsc.pem');

async function main() {
    try {
        const pemContent = fs.readFileSync(mockDscPath, 'utf8');
        const certificateData = parseCertificateSimple(pemContent);
        console.log('Parsed Certificate Data:');
        console.log(JSON.stringify(certificateData, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

main().catch(console.error);

