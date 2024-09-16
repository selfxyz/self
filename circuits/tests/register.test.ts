import { describe } from 'mocha';
import { assert, expect } from 'chai';
import path from 'path';
import { wasm as wasm_tester } from 'circom_tester';
import { poseidon6 } from 'poseidon-lite';
import { generateCircuitInputsRegister } from '../../common/src/utils/generateInputs';
import { hexToDecimal, packBytes } from '../../common/src/utils/utils';
import {
    n_dsc,
    k_dsc,
    n_dsc_ecdsa,
    k_dsc_ecdsa,
    PASSPORT_ATTESTATION_ID,
} from '../../common/src/constants/constants';
import { genMockPassportData } from '../../common/src/utils/genMockPassportData';
import { getCircuitName, parseDSC } from '../../common/src/utils/certificates/handleCertificate';
import { getLeaf } from '../../common/src/utils/pubkeyTree';
import { SignatureAlgorithm } from '../../common/src/utils/types';

const sigAlgs = [
    { sigAlg: 'rsa', hashFunction: 'sha256' },
    { sigAlg: 'rsa', hashFunction: 'sha1' },
    { sigAlg: 'ecdsa', hashFunction: 'sha256' },
];

sigAlgs.forEach(({ sigAlg, hashFunction }) => {
    describe(`Register - ${hashFunction.toUpperCase()} ${sigAlg.toUpperCase()}`, function () {
        this.timeout(0);
        let circuit: any;

        const passportData = genMockPassportData(
            `${sigAlg}_${hashFunction}` as SignatureAlgorithm,
            'FRA',
            '000101',
            '300101'
        );
        const secret = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();
        const dscSecret = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();

        const inputs = generateCircuitInputsRegister(
            secret,
            dscSecret,
            PASSPORT_ATTESTATION_ID,
            passportData,
            sigAlg === 'ecdsa' ? n_dsc_ecdsa : n_dsc,
            sigAlg === 'ecdsa' ? k_dsc_ecdsa : k_dsc
        );

        before(async () => {
            circuit = await wasm_tester(
                path.join(
                    __dirname,
                    `../circuits/register/instances/${getCircuitName('register', sigAlg, hashFunction)}.circom`
                ),
                {
                    include: [
                        'node_modules',
                        './node_modules/@zk-kit/binary-merkle-root.circom/src',
                        './node_modules/circomlib/circuits',
                    ],
                }
            );
        });

        it('should compile and load the circuit', async function () {
            expect(circuit).to.not.be.undefined;
        });

        it('should calculate the witness with correct inputs', async function () {
            console.log('inputs', inputs);
            const w = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(w);

            const nullifier = (await circuit.getOutput(w, ['nullifier'])).nullifier;
            console.log('\x1b[34m%s\x1b[0m', 'nullifier', nullifier);

            const commitment_circom = (await circuit.getOutput(w, ['commitment'])).commitment;
            console.log('\x1b[34m%s\x1b[0m', 'commitment', commitment_circom);

            const blinded_dsc_commitment = (await circuit.getOutput(w, ['blinded_dsc_commitment']))
                .blinded_dsc_commitment;
            console.log('\x1b[34m%s\x1b[0m', 'blinded_dsc_commitment', blinded_dsc_commitment);

            // const n = sigAlg === 'ecdsa' ? n_dsc_ecdsa : n_dsc;
            // const k = sigAlg === 'ecdsa' ? k_dsc_ecdsa : k_dsc;
            // const mrz_bytes = packBytes(inputs.mrz);
            // const leaf = getLeaf(passportData.dsc, n, k).toString();

            // const commitment_bytes = poseidon6([
            //     inputs.secret[0],
            //     PASSPORT_ATTESTATION_ID,
            //     leaf,
            //     mrz_bytes[0],
            //     mrz_bytes[1],
            //     mrz_bytes[2],
            // ]);
            // const commitment_js = commitment_bytes.toString();
            // console.log('commitment_js', commitment_js);
            // console.log('commitment_circom', commitment_circom);
            // expect(commitment_circom).to.be.equal(commitment_js);
        });

        // it('should fail to calculate witness with invalid mrz', async function () {
        //     try {
        //         const invalidInputs = {
        //             ...inputs,
        //             mrz: Array(93)
        //                 .fill(0)
        //                 .map((byte) => BigInt(byte).toString()),
        //         };
        //         await circuit.calculateWitness(invalidInputs);
        //         expect.fail('Expected an error but none was thrown.');
        //     } catch (error) {
        //         expect(error.message).to.include('Assert Failed');
        //     }
        // });

        // it('should fail to calculate witness with invalid dataHashes', async function () {
        //     try {
        //         const invalidInputs = {
        //             ...inputs,
        //             dataHashes: inputs.dataHashes.map((byte: string) =>
        //                 String((parseInt(byte, 10) + 1) % 256)
        //             ),
        //         };
        //         await circuit.calculateWitness(invalidInputs);
        //         expect.fail('Expected an error but none was thrown.');
        //     } catch (error) {
        //         expect(error.message).to.include('Assert Failed');
        //     }
        // });

        // it('should fail to calculate witness with invalid signature', async function () {
        //     try {
        //         const invalidInputs = {
        //             ...inputs,
        //             signature: inputs.signature
        //                 ? inputs.signature.map((byte: string) => String((parseInt(byte, 10) + 1) % 256))
        //                 : undefined,
        //             signature_s: inputs.signature_s
        //                 ? inputs.signature_s.map((byte: string) => String((parseInt(byte, 10) + 1) % 256))
        //                 : undefined,
        //         };
        //         await circuit.calculateWitness(invalidInputs);
        //         expect.fail('Expected an error but none was thrown.');
        //     } catch (error) {
        //         expect(error.message).to.include('Assert Failed');
        //     }
        // });
    });
});
