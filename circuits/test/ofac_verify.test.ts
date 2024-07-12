import { expect } from 'chai'
import path from "path";
const wasm_tester = require("circom_tester").wasm;
import { mockPassportData_sha256WithRSAEncryption_65537 } from '../../common/src/utils/mockPassportData';
import { passport_smt } from '../../common/src/utils/passportTree';
import { generateCircuitInputsOfac, generateCircuitInputsDisclose } from '../../common/src/utils/generateInputs';
import { getLeaf } from '../../common/src/utils/pubkeyTree';
import { SMT } from "@zk-kit/smt"
import { poseidon1 , poseidon6, poseidon2} from "poseidon-lite";
import { LeanIMT } from "@zk-kit/lean-imt";
import { formatMrz, packBytes } from '../../common/src/utils/utils';

describe("start testing disclose.circom", function () {
    this.timeout(0);
    let filteredInputs: any;
    let circuit: any;
    let w: any;
    let passportData = mockPassportData_sha256WithRSAEncryption_65537;
    let attestation_id: string;
    let passportTree: SMT;
    let nameDobTree: SMT;
    let nameTree: SMT;
    let tree : any;

    before(async () => {
        circuit = await wasm_tester(path.join(__dirname, "../circuits/ofac_verifier.circom"),
            {
                include: [
                    "node_modules",
                    "./node_modules/@zk-kit/binary-merkle-root.circom/src",
                    "./node_modules/circomlib/circuits"
                ]
            },
        );

        const secret = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();
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
        ])
        tree = new LeanIMT((a, b) => poseidon2([a, b]), []);
        tree.insert(BigInt(commitment));

        // smt stuff
        let smttrees = passport_smt(); 
        passportTree = smttrees[0];
        nameDobTree = smttrees[1];
        nameTree = smttrees[2];

        const val_inputs = generateCircuitInputsDisclose(
            secret,
            attestation_id,
            passportData,
            tree,
            majority,
            bitmap,
            scope,
            user_identifier,
        );

        const smt_inputs = generateCircuitInputsOfac(
            passportData,
            passportTree,
        );

        const combinedInputs = { ...val_inputs, ...smt_inputs };
        filteredInputs = { ...combinedInputs };
        delete filteredInputs.bitmap;
        delete filteredInputs.scope;
        delete filteredInputs.majority;
        delete filteredInputs.user_identifier;

    });

    it("should compile and load the circuit", async function () {
        expect(circuit).to.not.be.undefined;
    });

    it("should give a bool if valid proof", async function () {       
        w = await circuit.calculateWitness(filteredInputs);
        const isEqual = (await circuit.getOutput(w, ["out"]));
        const proofType = (await circuit.getOutput(w, ["proofType"]));
        console.log("Proof (0 is invalid, 1 if valid", isEqual)
        console.log("ProofType (0 for non-membership, 1 for membership)",proofType )
    });

});