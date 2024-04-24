// Import necessary libraries
import { assert, expect } from 'chai'
import path from "path";
import { mockPassportData_sha256WithRSAEncryption_65537 } from "../../common/src/utils/mockPassportData";
import { generateCircuitInputs } from '../../common/src/utils/generateInputs';
const wasm_tester = require("circom_tester").wasm;

describe.only("start testing of proof_of_passport_majority.circom", function () {
    this.timeout(0);
    let inputs: any;
    let circuit: any;
    let w: any;
    let majority: any = [49, 56];

    before(async () => {

        circuit = await wasm_tester(path.join(__dirname, "../circuits/proof_of_passport.circom"),
            { include: ["node_modules"] },
        );
        const passportData = mockPassportData_sha256WithRSAEncryption_65537

        const reveal_bitmap = Array(90).fill('1');
        const address = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

        inputs = generateCircuitInputs(
            passportData,
            reveal_bitmap,
            address,
            18,
            { developmentMode: true }
        );
        console.log(JSON.stringify(inputs, null, 2));
        w = await circuit.calculateWitness(inputs);

    });

    it("compile and load the circuit", async function () {
        expect(circuit).to.not.be.undefined;
    });

    it("check contraints", async function () {
        await circuit.checkConstraints(w);
    });

    it("verify reveal_packed outputs for majority", async function () {
        const outputs = await circuit.getOutput(w, ["reveal_packed[3]"]);
        const unpackedReveals = unpackRevealPacked(outputs);
        const expectedReveals = generateExpectedReveals(inputs, majority);
        expect(unpackedReveals).to.deep.equal(expectedReveals, "Circuit output does not match expected output");
    });
});

function unpackRevealPacked(packed) {
    let unpacked = [];
    const bytesCount = [31, 31, 28];

    Object.keys(packed).forEach((key, index) => {
        let element = BigInt(packed[key]);
        for (let j = 0; j < bytesCount[index]; j++) {
            const byte = Number(element & BigInt(0xFF));
            unpacked.push(byte);
            element = element >> BigInt(8);
        }
    });

    return unpacked;
}

function generateExpectedReveals(inputs, user_majority) {
    let expectedReveals = [];
    //Keep the last bytes for majority check
    for (let i = 0; i < inputs.reveal_bitmap.length - user_majority.length; i++) {
        expectedReveals.push(inputs.reveal_bitmap[i] === '1' ? parseInt(inputs.mrz[i + 5]) : 0);
    }
    expectedReveals.push(user_majority[0]) * inputs.reveal_bitmap[88];
    expectedReveals.push(user_majority[1]) * inputs.reveal_bitmap[89];
    return expectedReveals;
}