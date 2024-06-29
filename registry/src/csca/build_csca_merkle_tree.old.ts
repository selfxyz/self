import * as fs from 'fs';
import { buildPubkeyTree } from '../../../common/src/utils/pubkeyTree'
import { computeLeafFromModulusBigInt } from '../../../common/src/utils/csca'
import { CSCA_AKI_MODULUS, CSCA_TREE_DEPTH, DEVELOPMENT_MODE } from '../../../common/src/constants/constants';
import { IMT } from '@zk-kit/imt';
import { poseidon2 } from 'poseidon-lite';
import { splitToWords } from '../../../common/src/utils/utils';
import { writeFile } from 'fs/promises';
import * as path from 'path';
import jsrsasign from 'jsrsasign';

function isRsaPublicKey(key) {
    return key.type === 'RSA';
}

async function serialize_new_csca_modulus_tree_new() {
    const tree = new IMT(poseidon2, CSCA_TREE_DEPTH, 0, 2);

    const validAlgorithms = [
        "SHA256withRSAandMGF1",  // SHA1 with RSA
        "SHA256withRSA", // SHA256 with RSA
        "rsaPSS",
        "SHA1withRSA"  // RSA-PSS
    ];

    const processCertificate = (certificate, filePath) => {
        const signatureAlgorithm = certificate.getSignatureAlgorithmField();

        if (!validAlgorithms.includes(signatureAlgorithm)) {
            console.log(`Skipping file ${filePath}: Unsupported signature algorithm ${signatureAlgorithm}`);
            return;
        }

        const publicKey = jsrsasign.KEYUTIL.getKey(certificate.getPublicKey());

        if (!isRsaPublicKey(publicKey)) {
            console.log(`Skipping file ${filePath}: Not an RSA key`);
            return;
        }

        const keyLength = publicKey.n.bitLength();
        if (keyLength > 4096) {
            console.log(`Skipping file ${filePath}: Key length ${keyLength} bits exceeds 4096 bits`);
            return;
        }

        const modulus = publicKey.n.toString(16);
        const modulus_bigint = BigInt(`0x${modulus}`);

        let n_csca, k_csca;
        console.log("keyLength: ", keyLength);
        if (keyLength === 2048) {
            n_csca = 64;
            k_csca = 32;
        }
        else {
            n_csca = 64;
            k_csca = 64;
        }
        // if (signatureAlgorithm == "SHA256withRSA") {
        //     n_csca = 64;
        //     k_csca = 32;
        // }

        //const csca_modulus_formatted = splitToWords(modulus_bigint, BigInt(n_csca), BigInt(k_csca));

        console.log(`File: ${filePath}`);
        console.log(`Key Length: ${keyLength} bits`);
        console.log(`Modulus: ${modulus}`);
        console.log(`Signature Algorithm: ${signatureAlgorithm}`);

        const finalPoseidonHash = computeLeafFromModulusBigInt(modulus_bigint);
        console.log(`Final Poseidon Hash: ${finalPoseidonHash}`);

        tree.insert(finalPoseidonHash.toString());

        if (signatureAlgorithm === "1.2.840.113549.1.1.10") {
            // Note: jsrsasign doesn't provide an easy way to get RSA-PSS parameters
            // You might need to parse the ASN.1 structure manually if this information is crucial
            console.log(`RSA-PSS parameters not easily accessible with jsrsasign`);
        }

        console.log('---');
    };

    const path_to_pem_files = "outputs/unique_pem";
    for (const file of fs.readdirSync(path_to_pem_files)) {
        const file_path = path.join(path_to_pem_files, file);
        const file_content = fs.readFileSync(file_path, 'utf8');

        try {
            const certificate = new jsrsasign.X509();
            certificate.readCertPEM(file_content);
            processCertificate(certificate, file_path);
        } catch (error) {
            console.error(`Error processing file ${file}:`, error);
        }
    }

    if (DEVELOPMENT_MODE) {
        const mockCscaList = [
            '../common/src/mock_certificates/sha256_rsa_4096/mock_csca.crt',
            '../common/src/mock_certificates/sha256_rsa_2048/mock_csca.crt',
            '../common/src/mock_certificates/sha256_rsapss_4096/mock_csca.pem',
            '../common/src/mock_certificates/sha256_rsapss_2048/mock_csca.pem',
            '../common/src/mock_certificates/sha1_rsa_4096/mock_csca.crt',
            '../common/src/mock_certificates/sha1_rsa_2048/mock_csca.crt'
        ];

        for (const mockCscaFile of mockCscaList) {
            try {
                const certPem = fs.readFileSync(mockCscaFile, 'utf8');
                const certificate = new jsrsasign.X509();
                certificate.readCertPEM(certPem);
                processCertificate(certificate, mockCscaFile);
            } catch (error) {
                console.error(`Error processing mock file ${mockCscaFile}:`, error);
            }
        }
    }

    const serializedTree = tree.nodes.map(layer => layer.map(node => node.toString()));
    fs.writeFileSync("outputs/serialized_csca_tree.json", JSON.stringify(serializedTree));
    fs.copyFileSync("outputs/serialized_csca_tree.json", "../common/pubkeys/serialized_csca_tree.json");
    console.log("serialized_csca_tree.json written and copied in common/pubkeys!")
}

serialize_new_csca_modulus_tree_new();