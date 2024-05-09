// Import necessary libraries
import { assert, expect } from 'chai'
import path from "path";
const wasm_tester = require("circom_tester").wasm;
import { buildPoseidon } from 'circomlibjs';
import { formatMrz } from '../../common/src/utils/utils';
import { MAX_DATAHASHES_LEN, SignatureAlgorithm, TREE_DEPTH } from "../../common/src/constants/constants";
import { poseidon2 } from "poseidon-lite";
import { IMT } from "@zk-kit/imt";
import { mockPassportData_sha256WithRSAEncryption_65537 } from "../../common/src/utils/mockPassportData";
import { generateCircuitInputs_Register } from '../../common/src/utils/generateInputs';

describe("start testing register.circom", function () {
    this.timeout(0);
    let inputs: any;
    let circuit: any;
    let w: any;
    let mrz: any;
    let passportData: any;
    let poseidon: any;

    before(async () => {

        circuit = await wasm_tester(path.join(__dirname, "../circuits/register_sha256WithRSAEncryption65537.circom"),
            { include: ["node_modules"] },
        );
        poseidon = await buildPoseidon();
        const passportData = mockPassportData_sha256WithRSAEncryption_65537

        const reveal_bitmap = Array(90).fill('1');
        const address = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

        // const generated_inputs = generateCircuitInputs(
        //     passportData,
        //     reveal_bitmap,
        //     address,
        //     18,
        //     { developmentMode: true }
        // );
        inputs = generateCircuitInputs_Register(
            passportData,
            { developmentMode: true }
        );

        // inputs = {
        //     secret: BigInt(112111112).toString(),
        //     mrz: generated_inputs.mrz,
        //     econtent: generated_inputs.dataHashes,
        //     datahashes_padded_length: generated_inputs.dataHashes.length,
        //     signed_attributes: generated_inputs.eContentBytes,
        //     pubkey: generated_inputs.pubkey,
        //     merkle_root: generated_inputs.root,
        //     path: generated_inputs.pathIndices,
        //     siblings: generated_inputs.siblings,
        //     signature_algorithm: generated_inputs.signatureAlgorithm,
        //     signature: generated_inputs.signature,
        // }

        // console.log(JSON.stringify(inputs, null, 2));
        // w = await circuit.calculateWitness(inputs);
    });

    it("compile and load the circuit", async function () {
        expect(circuit).to.not.be.undefined;
    });
    it("calculate witness", async function () {
        w = await circuit.calculateWitness(inputs);
        let commitment = await circuit.getOutput(w, ["commitment"]);
        let nullifier = await circuit.getOutput(w, ["nullifier"]);
        console.log("commitment", commitment);
        console.log("nullifier", nullifier);
    });
    it("try to calculate witness with bad inputs", async function () {
        try {
            const trashmrz = Array(93).fill(0).map(byte => BigInt(byte).toString());
            inputs.mrz = trashmrz;
            w = await circuit.calculateWitness(inputs);
            expect.fail("Expected an error but none was thrown.");
        } catch (error) {
            expect(error.message).to.include("Assert Failed");
        }
    });
});
