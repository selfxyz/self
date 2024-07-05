import { expect } from 'chai'
import path from "path";
const wasm_tester = require("circom_tester").wasm;
import { mockPassportData_sha256WithRSAEncryption_65537 } from '../../common/src/utils/mockPassportData';
import { passport_smt } from '../../common/src/utils/passportTree';
import { generateCircuitInputsDiscloseOfac } from '../../common/src/utils/generateInputs';
import { SMT } from "@zk-kit/smt"

describe("start testing disclose.circom", function () {
    this.timeout(0);
    let inputs: any;
    let circuit: any;
    let w: any;
    let passportData = mockPassportData_sha256WithRSAEncryption_65537;
    let smttree: SMT;


    before(async () => {
        circuit = await wasm_tester(path.join(__dirname, "../circuits/disclose_ofac.circom"),
            {
                include: [
                    "node_modules",
                    "./node_modules/@zk-kit/binary-merkle-root.circom/src",
                    "./node_modules/circomlib/circuits"
                ]
            },
        );

        smttree = passport_smt();            
        inputs = generateCircuitInputsDiscloseOfac(
            passportData,
            smttree,
        );
    });

    it("should compile and load the circuit", async function () {
        expect(circuit).to.not.be.undefined;
    });

    it("should give a bool if passport exists in ofac list", async function () {
        w = await circuit.calculateWitness(inputs);
        const isEqual = (await circuit.getOutput(w, ["out"]));
        console.log("Bool Value", isEqual)
    });
});