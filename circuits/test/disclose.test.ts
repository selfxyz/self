import { assert, expect } from 'chai'
import path from "path";
const wasm_tester = require("circom_tester").wasm;
import { mockPassportData_sha256WithRSAEncryption_65537 } from '../../common/src/utils/mockPassportData';
import { formatMrz, packBytes } from '../../common/src/utils/utils';
import { attributeToPosition, COMMITMENT_TREE_DEPTH } from "../../common/src/constants/constants";
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

    it("should fail to calculate witness with outdated passport", async function () {
        try {
            const invalidInputs = {
                ...inputs,
                current_date: ["4","4","0","5","1","0"] // 2044
            }
            await circuit.calculateWitness(invalidInputs);
            expect.fail("Expected an error but none was thrown.");
        } catch (error) {
            expect(error.message).to.include("Assert Failed");
        }
    });

    it("should fail to calculate witness with different attestation_id", async function () {
        try {
            const invalidInputs = {
                ...inputs,
                attestation_id: poseidon1([
                    BigInt(Buffer.from("ANON-AADHAAR").readUIntBE(0, 6))
                ]).toString()
            }
            await circuit.calculateWitness(invalidInputs);
            expect.fail("Expected an error but none was thrown.");
        } catch (error) {
            expect(error.message).to.include("Assert Failed");
        }
    });

    describe('Selective disclosure', function () {
        const attributeCombinations = [
            ['issuing_state', 'name'],
            ['passport_number', 'nationality', 'date_of_birth'],
            ['gender', 'expiry_date'],
        ];

        attributeCombinations.forEach(combination => {
            it(`Disclosing ${combination.join(", ")}`, async function () {
                const attributeToReveal = Object.keys(attributeToPosition).reduce((acc, attribute) => {
                    acc[attribute] = combination.includes(attribute);
                    return acc;
                }, {});

                const bitmap = Array(90).fill('0');

                Object.entries(attributeToReveal).forEach(([attribute, reveal]) => {
                    if (reveal) {
                        const [start, end] = attributeToPosition[attribute];
                        bitmap.fill('1', start, end + 1);
                    }
                });

                inputs = {
                    ...inputs,
                    bitmap: bitmap.map(String),
                }

                w = await circuit.calculateWitness(inputs);

                const revealedData_packed = (await circuit.getOutput(w, ["revealedData_packed[3]"]))
                const revealedData_packed_formatted = [
                    revealedData_packed["revealedData_packed[0]"],
                    revealedData_packed["revealedData_packed[1]"],
                    revealedData_packed["revealedData_packed[2]"],
                ];
                console.log("revealedData_packed_formatted", revealedData_packed_formatted)

                const bytesCount = [31, 31, 26]; // nb of bytes in each of the first three field elements

                const bytesArray = revealedData_packed_formatted.flatMap((element: string, index: number) => {
                    const bytes = bytesCount[index];
                    const elementBigInt = BigInt(element);
                    const byteMask = BigInt(255); // 0xFF

                    const bytesOfElement = [...Array(bytes)].map((_, byteIndex) => {
                        return (elementBigInt >> (BigInt(byteIndex) * BigInt(8))) & byteMask;
                    });
                    return bytesOfElement;
                });

                const result = bytesArray.map((byte: bigint) => String.fromCharCode(Number(byte)));

                console.log(result);

                for (let i = 0; i < result.length; i++) {
                    if (bitmap[i] == '1') {
                        const char = String.fromCharCode(Number(inputs.mrz[i + 5]));
                        assert(result[i] == char, 'Should reveal the right character');
                    } else {
                        assert(result[i] == '\x00', 'Should not reveal');
                    }
                }
            });
        });
    })

});


