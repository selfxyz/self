import { assert, expect } from 'chai'
import path from "path";
const wasm_tester = require("circom_tester").wasm;
import { mockPassportData_sha256WithRSAEncryption_65537 } from '../../common/src/utils/mockPassportData';
import { formatMrz } from '../../common/src/utils/utils';
import { poseidon1, poseidon2 } from "poseidon-lite";
import { LeanIMT } from "@zk-kit/lean-imt";
import { getOfacLeaf } from '../../common/src/utils/passportTree';
import { generateOfacCircuitInputsDisclose } from '../../common/src/utils/generateInputs';


describe("start testing disclose.circom", function () {
    this.timeout(0);
    let inputs: any;
    let circuit: any;
    let w: any;
    let passportData = mockPassportData_sha256WithRSAEncryption_65537;
    let tree: any;

    before(async () => {
        circuit = await wasm_tester(path.join(__dirname, "../circuits/disclose.circom"),
            {
                include: [
                    "node_modules",
                    "./node_modules/@zk-kit/binary-merkle-root.circom/src",
                    "./node_modules/circomlib/circuits"
                ]
            },
        );

        const mrz_bytes = formatMrz(passportData.mrz);
        const passport_leaf = getOfacLeaf(mrz_bytes.slice(50,59)).toString();
        const commitment = poseidon1([
            passport_leaf
        ])

        tree = new LeanIMT((a, b) => poseidon2([a, b]), []);
        tree.insert(BigInt(commitment));

        inputs = generateOfacCircuitInputsDisclose(
            passportData,
            tree,
        );
    });

    it("should compile and load the circuit", async function () {
        expect(circuit).to.not.be.undefined;
    });

    it("should give a bool if passport exists in ofac list", async function () {
        w = await circuit.calculateWitness(inputs);
        const isEqual = (await circuit.getOutput(w, ["isEqual"])).bool;
        console.log("Bool Value", isEqual)
    });
});


