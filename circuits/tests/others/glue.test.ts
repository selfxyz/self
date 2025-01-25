import { wasm as wasmTester } from 'circom_tester';
import { describe, it } from 'mocha';
import path from 'path';
import { hexToDecimal, splitToWords } from '../../../common/src/utils/utils';
import { formatInput } from '../../../common/src/utils/generateInputs';
import { parseCertificate } from '../../../common/src/utils/certificate_parsing/parseCertificate';
import { mock_dsc_secpk256_signed_with_rsa_sha1, mock_dsc_sha1_brainpoolP224r1, mock_dsc_sha384_brainpoolP384r1_384, mock_dsc_sha512_brainpoolP512r1 } from '../../../common/src/constants/mockCertificates';

const n_and_k = [
    // { n: 120, k: 35, keyLength: 4096, isEcdsa: false },
    // { n: 64, k: 4, isEcdsa: true, dscCertificate: mock_dsc_secpk256_signed_with_rsa_sha1 },
    // { n: 64, k: 6, isEcdsa: true, dscCertificate: mock_dsc_sha384_brainpoolP384r1_384 },
    // { n: 64, k: 8, isEcdsa: true, dscCertificate: mock_dsc_sha512_brainpoolP512r1 },
    { n: 32, k: 7, isEcdsa: true, dscCertificate: mock_dsc_sha1_brainpoolP224r1 },


    
]

describe('Circuit Test', function () { 
    this.timeout(0);
    n_and_k.forEach(({ n, k, keyLength, isEcdsa, dscCertificate }) => {
        it(`n=${n},k=${k}`, async function () { 

            // Run circuit with inputs
            const circuit = await wasmTester(
                path.join(
                    __dirname,
                    `../../circuits/tests/others/test_glue_${n}_${k}.circom`
                ),
                {
                    include: [
                        'node_modules',
                        './node_modules/@zk-kit/binary-merkle-root.circom/src',
                        './node_modules/circomlib/circuits',
                        // 'node_modules', './node_modules/@zk-kit/binary-merkle-root.circom/src'
                    ],
                }
            );
            
            let pubkey_dsc
            let pubkey_dsc_padded

            if (isEcdsa) { 
                const {
                    publicKeyDetails,
                } = parseCertificate(dscCertificate, 'dsc_cert');
                const { bits, x, y } = publicKeyDetails;
                
                
                const normalizedX = x.length % 2 === 0 ? x : '0' + x;
                const normalizedY = y.length % 2 === 0 ? y : '0' + y;

                const pubKey_dsc_x = splitToWords(BigInt(hexToDecimal(normalizedX)), n, k);
                const pubKey_dsc_y = splitToWords(BigInt(hexToDecimal(normalizedY)), n, k);
                pubkey_dsc = [...pubKey_dsc_x, ...pubKey_dsc_y];
            
                const fullPubKey = normalizedX + normalizedY;
                pubkey_dsc_padded = splitToWords(BigInt(hexToDecimal(fullPubKey)), 8, 525);
            } else {
                const modulus = BigInt(2) ** BigInt(keyLength);
                pubkey_dsc = splitToWords(modulus, n, k);
                pubkey_dsc_padded = formatInput(splitToWords(modulus, 8, 525));

                console.log(pubkey_dsc.length)
            }
            const salt = '0'
            const pubKey_csca_hash = '0'

            // Run the circuit
            const witness = await circuit.calculateWitness({
                pubKey_dsc: pubkey_dsc,
                pubkey_dsc_padded,
                salt,
                pubKey_csca_hash
            });


        });
    })
})