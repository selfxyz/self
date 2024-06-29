import { describe } from 'mocha'
import { assert, expect } from 'chai'
import path from "path";
const wasm_tester = require("circom_tester").wasm;
import { poseidon1, poseidon6 } from "poseidon-lite";
import { mockPassportData_sha256WithRSAEncryption_65537 } from "../../common/src/utils/mockPassportData";
import { generateCircuitInputsRegister } from '../../common/src/utils/generateInputs';
import { getLeaf } from '../../common/src/utils/pubkeyTree';
import { packBytes } from '../../common/src/utils/utils';

describe("Circuits - sha256WithRSAEncryption_65537 Register flow", function () {
    this.timeout(0);
    let inputs: any;
    let circuit: any;
    let passportData = mockPassportData_sha256WithRSAEncryption_65537;
    let attestation_id: string;
    const n_dsc = 121;
    const k_dsc = 17;

    before(async () => {
        circuit = await wasm_tester(
            path.join(__dirname, "../circuits/register_sha256WithRSAEncryption_65537.circom"),
            {
                include: [
                    "node_modules",
                    "./node_modules/@zk-kit/binary-merkle-root.circom/src",
                    "./node_modules/circomlib/circuits"
                ]
            },
        );

        //const secret = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();
        const secret = BigInt(0).toString();
        console.log("secret", secret);

        const attestation_name = "E-PASSPORT";
        attestation_id = poseidon1([
            BigInt(Buffer.from(attestation_name).readUIntBE(0, 6))
        ]).toString();

        inputs = generateCircuitInputsRegister(
            secret,
            attestation_id,
            passportData,
            n_dsc,
            k_dsc,
            [mockPassportData_sha256WithRSAEncryption_65537]
        );
    });

    it("should compile and load the circuit", async function () {
        expect(circuit).to.not.be.undefined;
    });

    it("should calculate the witness with correct inputs", async function () {
        const w = await circuit.calculateWitness(inputs);
        await circuit.checkConstraints(w);

        console.log("nullifier", (await circuit.getOutput(w, ["nullifier"])).nullifier);

        const commitment_circom = (await circuit.getOutput(w, ["commitment"])).commitment;
        console.log("commitment_circom", commitment_circom)
        const blinded_dsc_commitment = (await circuit.getOutput(w, ["blinded_dsc_commitment"])).blinded_dsc_commitment;
        console.log("blinded_dsc_commitment", blinded_dsc_commitment)

        const mrz_bytes = packBytes(inputs.mrz);
        const commitment_bytes = poseidon6([
            inputs.secret[0],
            attestation_id,
            getLeaf({
                signatureAlgorithm: passportData.signatureAlgorithm,
                modulus: passportData.pubKey.modulus,
                exponent: passportData.pubKey.exponent
            }),
            mrz_bytes[0],
            mrz_bytes[1],
            mrz_bytes[2]
        ]);
        const commitment_js = commitment_bytes.toString();
        console.log('commitment_js', commitment_js)
        console.log('commitment_circom', commitment_circom)
        expect(commitment_circom).to.be.equal(commitment_js);
    });

    it("should fail to calculate witness with invalid mrz", async function () {
        try {
            const invalidInputs = {
                ...inputs,
                mrz: Array(93).fill(0).map(byte => BigInt(byte).toString())
            }
            await circuit.calculateWitness(invalidInputs);
            expect.fail("Expected an error but none was thrown.");
        } catch (error) {
            expect(error.message).to.include("Assert Failed");
        }
    });

    it("should fail to calculate witness with invalid econtent", async function () {
        try {
            const invalidInputs = {
                ...inputs,
                econtent: inputs.econtent.map((byte: string) => String((parseInt(byte, 10) + 1) % 256)),
            }
            await circuit.calculateWitness(invalidInputs);
            expect.fail("Expected an error but none was thrown.");
        } catch (error) {
            expect(error.message).to.include("Assert Failed");
        }
    });

    it("should fail to calculate witness with invalid signature", async function () {
        try {
            const invalidInputs = {
                ...inputs,
                signature: inputs.signature.map((byte: string) => String((parseInt(byte, 10) + 1) % 256)),
            }
            await circuit.calculateWitness(invalidInputs);
            expect.fail("Expected an error but none was thrown.");
        } catch (error) {
            expect(error.message).to.include("Assert Failed");
        }
    });

    // it("should fail to calculate witness with invalid merkle root", async function () {
    //     try {
    //         const invalidInputs = {
    //             ...inputs,
    //             merkle_root: inputs.merkle_root.map((byte: string) => String((parseInt(byte, 10) + 1) % 256)),
    //         }
    //         await circuit.calculateWitness(invalidInputs);
    //         expect.fail("Expected an error but none was thrown.");
    //     } catch (error) {
    //         expect(error.message).to.include("Assert Failed");
    //     }
    // });

});