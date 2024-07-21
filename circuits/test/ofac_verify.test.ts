import { expect } from 'chai'
import path from "path";
const wasm_tester = require("circom_tester").wasm;
import { mockPassportData_sha256WithRSAEncryption_65537 } from '../../common/src/utils/mockPassportData';
import { generateCircuitInputsOfac, generateCircuitInputsDisclose } from '../../common/src/utils/generateInputs';
import { getLeaf } from '../../common/src/utils/pubkeyTree';
import { SMT, ChildNodes } from "@ashpect/smt"
import { poseidon1, poseidon2, poseidon3, poseidon6} from "poseidon-lite";
import { LeanIMT } from "@zk-kit/lean-imt";
import { formatMrz, packBytes } from '../../common/src/utils/utils';
import passportNojson from "../../common/ofacdata/outputs/passportNoSMT.json";
import nameDobjson from "../../common/ofacdata/outputs/passportNoSMT.json";
import namejson from "../../common/ofacdata/outputs/passportNoSMT.json";

describe("start testing disclose.circom", function () {
    this.timeout(0);
    const hash = (childNodes: ChildNodes) => (childNodes.length === 2 ? poseidon2(childNodes) : poseidon3(childNodes))
    let filteredInputs: any;
    let circuit: any;
    let w: any;
    let attestation_id: string;
    let passportData = mockPassportData_sha256WithRSAEncryption_65537;
    let passportNoSMT = new SMT(hash, true);
    let nameDobSMT = new SMT(hash, true);
    let nameSMT = new SMT(hash, true);
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

        passportNoSMT.import(JSON.stringify(passportNojson));
        nameDobSMT.import(JSON.stringify(nameDobjson));
        nameSMT.import(JSON.stringify(namejson));

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
            passportNoSMT,
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

    it("should return proofValidity == 1 for valid proof", async function () {       
        w = await circuit.calculateWitness(filteredInputs);
        const proofValidity = (await circuit.getOutput(w, ["proofValidity"]));
        console.log("Proof :", proofValidity)
        expect(proofValidity).to.equal(1);
    });

});