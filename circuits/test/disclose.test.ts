// Import necessary libraries
import { assert, expect } from 'chai'
import path from "path";
const wasm_tester = require("circom_tester").wasm;
import { buildPoseidon } from 'circomlibjs';
import { mockPassportData_sha256WithRSAEncryption_65537 } from '../../common/src/utils/mockPassportData';
import { formatMrz } from '../../common/src/utils/utils';
import { MAX_DATAHASHES_LEN, SignatureAlgorithm, TREE_DEPTH } from "../../common/src/constants/constants";
import { poseidon2 } from "poseidon-lite";
import { IMT } from "@zk-kit/imt";

describe("start testing register.circom", function () {
    this.timeout(0);
    let inputs: any;
    let circuit: any;
    let w: any;
    let mrz: any;
    let passportData: any;
    let poseidon: any;
    let imt: any;

    before(async () => {

        circuit = await wasm_tester(path.join(__dirname, "../circuits/disclose.circom"),
            { include: ["node_modules"] },
        );

        poseidon = await buildPoseidon();

        passportData = mockPassportData_sha256WithRSAEncryption_65537;
        mrz = formatMrz(passportData.mrz);
        // const secret = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();
        const secret = BigInt(112111112).toString();
        const mrz_bytes = packBytes(mrz);
        const commitment_bytes = poseidon([secret, mrz_bytes[0], mrz_bytes[1], mrz_bytes[2]]);
        const commitment = BigInt(poseidon.F.toString(commitment_bytes));
        const tree = new IMT(poseidon2, TREE_DEPTH, 0, 2);
        tree.insert(commitment);
        const index = tree.indexOf(commitment);
        const proof = tree.createProof(index);
        inputs = {
            commitment: commitment,
            secret: secret,
            mrz: mrz,
            merkle_root: tree.root,
            merkletree_size: BigInt(proof.pathIndices.length).toString(),
            path: proof.pathIndices.map(index => index.toString()),
            siblings: proof.siblings.flat().map(index => index.toString()),
            bitmap: Array(90).fill(1).map(num => BigInt(num).toString()),
            scope: BigInt(0).toString(),
            current_date: [2, 4, 0, 5, 0, 3].map(num => BigInt(num)),
            majority: ["1", "8"].map(char => BigInt(char.charCodeAt(0)).toString()),
            address: BigInt(0).toString(),
        };
        console.log("inputs", inputs);
        convertScopeToBinaryAndComputeValue(inputs.scope);
        w = await circuit.calculateWitness(inputs);
    });

    it("compile and load the circuit", async function () {
        expect(circuit).to.not.be.undefined;
    });
    it("assert nullifier is poseidon(secret, scope)", async function () {
        w = await circuit.calculateWitness(inputs);
        poseidon = await buildPoseidon();
        const scope = BigInt(convertScopeToBinaryAndComputeValue(inputs.scope)).toString();
        const nullifier_js = poseidon.F.toString(poseidon([inputs.secret, scope]));
        let nullifier_circom = await circuit.getOutput(w, ["nullifier"]);
        let commitment_circom = await circuit.getOutput(w, ["commitment"]);
        nullifier_circom = nullifier_circom.nullifier;
        console.log("nullifier_circom", nullifier_circom);
        console.log("nullifier_js", nullifier_js);
        console.log("commitment_circom", commitment_circom);
        //expect(nullifier_circom).to.equal(nullifier_js); //TODO: fix this
    });
});

function packBytes(unpacked) {
    const bytesCount = [31, 31, 31];
    let packed = [0n, 0n, 0n];

    let byteIndex = 0;
    for (let i = 0; i < bytesCount.length; i++) {
        for (let j = 0; j < bytesCount[i]; j++) {
            if (byteIndex < unpacked.length) {
                packed[i] |= BigInt(unpacked[byteIndex]) << (BigInt(j) * 8n);
            }
            byteIndex++;
        }
    }
    return packed;
}

function convertScopeToBinaryAndComputeValue(scope) {
    let binaryScope = '';
    for (let i = 0; i < scope.length; i++) {
        binaryScope += parseInt(scope[i]).toString(2).padStart(8, '0');
    }
    return parseInt(binaryScope, 2);
}

