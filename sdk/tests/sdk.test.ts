import { assert, expect } from 'chai'
import { describe, it } from 'mocha';
import { groth16 } from 'snarkjs';
import { generateCircuitInputsDisclose } from '../../common/src/utils/generateInputs';
import { mockPassportData_sha256_rsa_65537 } from '../../common/src/constants/mockPassportData';
import { LeanIMT } from "@zk-kit/lean-imt";
import { poseidon2, poseidon6 } from "poseidon-lite";
import { PASSPORT_ATTESTATION_ID } from "../../common/src/constants/constants";
import { formatMrz, packBytes } from '../../common/src/utils/utils';
import { getLeaf } from '../../common/src/utils/pubkeyTree';
import { OpenPassportWeb2Inputs, OpenPassportWeb2Verifier } from '../index';
// import dotenv from 'dotenv';
// dotenv.config();

const path_disclose_wasm = "../circuits/build/disclose_js/disclose.wasm";
const path_disclose_zkey = "../circuits/build/disclose.zkey";

describe('Circuit Proving Tests', function () {
    this.timeout(0);
    it('proofOfPassportWeb2Verifier - should verify', async function () {
        /// Generate circuit inputs
        const passportData = mockPassportData_sha256_rsa_65537;
        const imt = new LeanIMT((a: bigint, b: bigint) => poseidon2([a, b]), []);
        const bitmap = Array(90).fill("1");
        const scope = BigInt(1).toString();
        const majority = ["18"];
        const secret = BigInt(0).toString();
        const mrz_bytes = packBytes(formatMrz(passportData.mrz));
        const pubkey_leaf = getLeaf({
            signatureAlgorithm: passportData.signatureAlgorithm,
            modulus: passportData.pubKey.modulus,
            exponent: passportData.pubKey.exponent,
        }).toString();
        const commitment = poseidon6([
            secret,
            PASSPORT_ATTESTATION_ID,
            pubkey_leaf,
            mrz_bytes[0],
            mrz_bytes[1],
            mrz_bytes[2]
        ])
        imt.insert(commitment);
        const inputs = generateCircuitInputsDisclose(
            secret,
            PASSPORT_ATTESTATION_ID,
            passportData,
            imt as any,
            majority,
            bitmap,
            scope,
            BigInt(5).toString()
        );
        // Generate proof and public signals
        const { proof, publicSignals } = await groth16.fullProve(
            inputs,
            path_disclose_wasm,
            path_disclose_zkey
        );

        /// Verify using web2 verifier
        const proofOfPassportWeb2Verifier = new OpenPassportWeb2Verifier({
            scope: scope,
            requirements: [["older_than", "18"], ["nationality", "France"]]
        });
        const proofOfPassportWeb2Inputs = new OpenPassportWeb2Inputs(publicSignals, proof as any);
        const result = await proofOfPassportWeb2Verifier.verify(proofOfPassportWeb2Inputs);


        console.log(result.toJson());
        expect(result.valid).to.be.true;
    });

    // it('proofOfPassportWeb3Verifier - should succeed', async () => {
    //     const scope = BigInt(1).toString();
    //     /// Verify using web3 verifier
    //     const proofOfPassportWeb3Verifier = new OpenPassportWeb3Verifier({
    //         scope: scope
    //     });
    //     const result = await proofOfPassportWeb3Verifier.verify(process.env.TEST_ADDRESS, Number(process.env.TOKEN_ID));
    //     expect(result.valid).to.be.true;
    // });

    // it('proofOfPassportWeb3Verifier - should fail', async () => {
    //     const scope = BigInt(1).toString();
    //     /// Verify using web3 verifier
    //     const proofOfPassportWeb3Verifier = new OpenPassportWeb3Verifier({
    //         scope: scope,
    //         requirements: [["older_than", "18"]]
    //     });
    //     const result = await proofOfPassportWeb3Verifier.verify(process.env.TEST_ADDRESS, Number(process.env.TOKEN_ID));
    //     expect(result.older_than).to.be.true;
    //     expect(result.valid).to.be.false;
    // });
});