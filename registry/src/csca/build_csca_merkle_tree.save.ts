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
import * as asn1 from 'asn1.js';

const RSAPublicKey = asn1.define('RSAPublicKey', function () {
    this.seq().obj(
        this.key('n').int(),
        this.key('e').int()
    );
});

function isRsaPublicKey(key) {
    return key.type === 'RSA' || key.type === 'RSA-PSS';
}

function getPublicKey(certificate) {
    const publicKeyInfo = certificate.getPublicKeyHex();

    try {
        // Try to parse the public key as ASN.1
        const publicKeyAsn1 = asn1.define('PublicKey', function () {
            this.seq().obj(
                this.key('algorithm').seq().obj(
                    this.key('algorithmId').objid(),
                    this.key('parameters').optional().any()
                ),
                this.key('publicKey').bitstr()
            );
        });

        const parsed = publicKeyAsn1.decode(Buffer.from(publicKeyInfo, 'hex'), 'der');
        const publicKeyBuffer = parsed.publicKey.data;

        // Parse the RSA public key
        const rsaPublicKey = RSAPublicKey.decode(publicKeyBuffer, 'der');

        return {
            n: new jsrsasign.BigInteger(rsaPublicKey.n.toString('hex'), 16),
            e: new jsrsasign.BigInteger(rsaPublicKey.e.toString('hex'), 16),
            type: 'RSA'
        };
    } catch (e) {
        console.error("Error parsing public key:", e);
    }

    // If parsing fails, fall back to manual extraction
    const modulus = extractModulus(publicKeyInfo);
    if (modulus) {
        return { n: new jsrsasign.BigInteger(modulus, 16), type: 'RSA' };
    }

    throw new Error("Unable to extract public key");
}

function extractModulus(publicKeyInfo: string): string | null {
    // RSA OID
    const rsaOid = '2a864886f70d010101';
    // RSA-PSS OID
    const rsaPssOid = '2a864886f70d01010a';

    let offset = publicKeyInfo.indexOf(rsaOid);
    if (offset === -1) {
        offset = publicKeyInfo.indexOf(rsaPssOid);
    }

    if (offset === -1) {
        return null;
    }

    // Skip OID and move to the bit string
    offset = publicKeyInfo.indexOf('03', offset);
    if (offset === -1) {
        return null;
    }

    // Skip bit string tag and length
    offset += 4;

    // Extract modulus
    const modulusStart = publicKeyInfo.indexOf('02', offset) + 2;
    const modulusLength = parseInt(publicKeyInfo.substr(modulusStart, 2), 16) * 2;
    const modulus = publicKeyInfo.substr(modulusStart + 2, modulusLength);

    return modulus;
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

        const publicKey = getPublicKey(certificate);

        if (!isRsaPublicKey(publicKey)) {
            console.log(`Skipping file ${filePath}: Not an RSA or RSA-PSS key`);
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

        console.log(`File: ${filePath}`);
        console.log(`Key Length: ${keyLength} bits`);
        console.log(`Modulus: ${modulus}`);
        console.log(`Key Type: ${publicKey.type}`);
        console.log(`Signature Algorithm: ${signatureAlgorithm}`);

        const finalPoseidonHash = computeLeafFromModulusBigInt(modulus_bigint);
        console.log(`Final Poseidon Hash: ${finalPoseidonHash}`);

        tree.insert(finalPoseidonHash.toString());

        if (signatureAlgorithm === "1.2.840.113549.1.1.10") {
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