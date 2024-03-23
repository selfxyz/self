// Import necessary libraries
import chai, { assert, expect } from 'chai'
import path from "path";
import { getPassportData } from "../../common/src/utils/passportData";
import { TREE_DEPTH } from '../../common/src/constants/constants'
import { generateCircuitInputs } from '../../common/src/utils/generateInputs';
import { getLeaf } from '../../common/src/utils/pubkeyTree';
import { IMT } from '@zk-kit/imt';
import { poseidon2 } from 'poseidon-lite';
import fs from 'fs';
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
        const passportData = getPassportData();

        const serializedTree = JSON.parse(fs.readFileSync("../common/pubkeys/serialized_tree.json") as unknown as string)
        const tree = new IMT(poseidon2, TREE_DEPTH, 0, 2)
        tree.setNodes(serializedTree)
    
        // This adds the pubkey of the passportData to the registry even if it's not there for testing purposes.
        // Comment when testing with real passport data
        tree.insert(getLeaf({
          signatureAlgorithm: passportData.signatureAlgorithm,
          issuer: 'C = TS, O = Government of Syldavia, OU = Ministry of tests, CN = CSCA-TEST',
          modulus: passportData.pubKey.modulus,
          exponent: passportData.pubKey.exponent
        }).toString())
        
        const reveal_bitmap = Array(90).fill('1');
        const address = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
    
        inputs = generateCircuitInputs(
          passportData,
          tree,
          reveal_bitmap,
          address
        );
    
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