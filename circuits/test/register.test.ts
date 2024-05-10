// Import necessary libraries
import { assert, expect } from 'chai'
import path from "path";
const wasm_tester = require("circom_tester").wasm;
import { buildPoseidon } from 'circomlibjs';
import { formatMrz } from '../../common/src/utils/utils';
import { MAX_DATAHASHES_LEN, SignatureAlgorithm, TREE_DEPTH } from "../../common/src/constants/constants";
import { poseidon4 } from "poseidon-lite";
import { IMT } from "@zk-kit/imt";
import { mockPassportData_sha256WithRSAEncryption_65537 } from "../../common/src/utils/mockPassportData";
import { generateCircuitInputs_Register } from '../../common/src/utils/generateInputs';
import { packBytes } from "../../common/src/utils/utils";

describe("Proof of Passport - Circuits - Register flow", function () {
    this.timeout(0);
    let inputs: any;
    let circuit: any;
    let w: any;
    let poseidon: any;
    let commitment: any;

    before(async () => {
        circuit = await wasm_tester(path.join(__dirname, "../circuits/register_sha256WithRSAEncryption65537.circom"),
            { include: ["node_modules"] },
        );
        poseidon = await buildPoseidon();
        const passportData = mockPassportData_sha256WithRSAEncryption_65537
        inputs = generateCircuitInputs_Register(
            passportData,
            { developmentMode: true }
        );
    });

    it("compile and load the circuit", async function () {
        expect(circuit).to.not.be.undefined;
    });
    it("calculate witness", async function () {
        w = await circuit.calculateWitness(inputs);
        let commitment_circom = await circuit.getOutput(w, ["commitment"]);
        commitment_circom = commitment_circom.commitment;
        const formattedMrz = formatMrz(inputs.mrz);
        const mrz_bytes = packBytes(formattedMrz);
        const commitment_bytes = poseidon4([BigInt(inputs.secret), BigInt(mrz_bytes[0]), BigInt(mrz_bytes[1]), BigInt(mrz_bytes[2])]);
        const commitment_js = BigInt(poseidon.F.toString(commitment_bytes)).toString();
        console.log('commitment_js', commitment_js)
        console.log('commitment_circom', commitment_circom)
        expect(commitment_circom).to.be.equal(commitment_js);
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
