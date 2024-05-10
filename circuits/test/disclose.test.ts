import { assert, expect } from 'chai'
import path from "path";
const wasm_tester = require("circom_tester").wasm;
import { mockPassportData_sha256WithRSAEncryption_65537 } from '../../common/src/utils/mockPassportData';
import { formatMrz, packBytes } from '../../common/src/utils/utils';
import { COMMITMENT_TREE_DEPTH } from "../../common/src/constants/constants";
import { poseidon1, poseidon2, poseidon6 } from "poseidon-lite";
import { IMT } from "@zk-kit/imt";
import { getLeaf } from '../../common/src/utils/pubkeyTree';
import { generateCircuitInputsDisclose } from '../../common/src/utils/generateInputs';

describe("start testing register.circom", function () {
    this.timeout(0);
    let inputs: any;
    let circuit: any;
    let w: any;
    let passportData = mockPassportData_sha256WithRSAEncryption_65537;
    let attestation_id: string;
    let tree: any;

    before(async () => {
        circuit = await wasm_tester(path.join(__dirname, "../circuits/disclose.circom"),
            { include: ["node_modules"] },
        );

        const secret = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();
        console.log("secret", secret);

        const attestation_name = "E-PASSPORT";
        attestation_id = poseidon1([
            BigInt(Buffer.from(attestation_name).readUIntBE(0, 6))
        ]).toString();

        const majority = ["1", "8"];
        const user_identifier = "0xE6E4b6a802F2e0aeE5676f6010e0AF5C9CDd0a50";
        const bitmap = Array(90).fill("1")
        const scope = poseidon1([
            BigInt(Buffer.from("VOTEEEEE").readUIntBE(0, 6))
        ]).toString();

        // compute the commitment and insert it in the tree
        const pubkey_leaf = getLeaf({
            signatureAlgorithm: passportData.signatureAlgorithm,
            modulus: passportData.pubKey.modulus,
            exponent: passportData.pubKey.exponent,
        }).toString();
        const mrz_bytes = packBytes(formatMrz(passportData.mrz));
        const commitment = poseidon6([
            secret,
            attestation_id,
            pubkey_leaf,
            mrz_bytes[0],
            mrz_bytes[1],
            mrz_bytes[2]
        ]).toString();
        console.log("commitment", commitment);

        tree = new IMT(poseidon2, COMMITMENT_TREE_DEPTH, 0, 2);
        tree.insert(commitment);

        inputs = generateCircuitInputsDisclose(
            secret,
            attestation_id,
            passportData,
            tree,
            majority,
            bitmap,
            scope,
            user_identifier
        );

        console.log(JSON.stringify(inputs, null, 2));
    });

    it("should compile and load the circuit", async function () {
        expect(circuit).to.not.be.undefined;
    });

    it("should have nullifier == poseidon(secret, scope)", async function () {
        w = await circuit.calculateWitness(inputs);
        const nullifier_js = poseidon2([inputs.secret, inputs.scope]).toString();
        const nullifier_circom = (await circuit.getOutput(w, ["nullifier"])).nullifier;

        console.log("nullifier_circom", nullifier_circom);
        console.log("nullifier_js", nullifier_js);
        expect(nullifier_circom).to.equal(nullifier_js);
    });
});