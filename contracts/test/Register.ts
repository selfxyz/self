import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { mockPassportData_sha256WithRSAEncryption_65537 } from "../../common/src/utils/mockPassportData";
import { countryCodes } from "../../common/src/constants/constants";
import { formatRoot, getCurrentDateYYMMDD } from "../../common/src/utils/utils";
import { groth16 } from 'snarkjs'
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import axios from 'axios';
import { revealBitmapFromMapping } from "../../common/src/utils/revealBitmap";
import { generateCircuitInputsRegister } from "../../common/src/utils/generateInputs";
import fs from 'fs';


describe("Proof of Passport - Contracts - Register flow", function () {
    this.timeout(0);
    let passportData, proof, inputs: any, publicSignals, revealChars, pasrsedCallData: any[], formattedCallData: any;
    const path_wasm = "../circuits/build/register_sha256WithRSAEncryption65537_js/register_sha256WithRSAEncryption65537.wasm";
    const path_zkey = "../circuits/build/register_sha256WithRSAEncryption65537_final.zkey";
    const path_vkey = "../circuits/build/register_sha256WithRSAEncryption65537_vkey.json";

    before(
        async function generateProof() {
            // Log the current block timestamp
            const latestBlock = await ethers.provider.getBlock('latest');
            // console.log(`Current block timestamp: ${latestBlock?.timestamp}`);

            // Set the next block timestamp to the current computer's timestamp
            const currentTimestamp = Math.floor(Date.now() / 1000) + 10;
            await ethers.provider.send('evm_setNextBlockTimestamp', [currentTimestamp]);
            await ethers.provider.send('evm_mine', []); // Mine a new block for the timestamp to take effect

            // Log the new block's timestamp to confirm
            const newBlock = await ethers.provider.getBlock('latest');
            // console.log(`New block timestamp set to: ${newBlock?.timestamp}`);

            passportData = mockPassportData_sha256WithRSAEncryption_65537;

            inputs = generateCircuitInputsRegister(
                inputs.secret, inputs.scope, passportData, { developmentMode: true }
            );

            /***  Groth16 saga  ***/
            // Generate the proof
            console.log('\x1b[32m%s\x1b[0m', 'Generating proof...');
            ({ proof, publicSignals } = await groth16.fullProve(
                inputs,
                path_wasm,
                path_zkey
            ))
            console.log('\x1b[32m%s\x1b[0m', 'Proof generated');
            // Verify the proof
            const vKey = JSON.parse(fs.readFileSync(path_vkey) as unknown as string);
            const verified = await groth16.verify(
                vKey,
                publicSignals,
                proof
            )
            assert(verified == true, 'Should verify')
            console.log('\x1b[32m%s\x1b[0m', 'Proof verified');

            const rawCallData = await groth16.exportSolidityCallData(proof, publicSignals);
            pasrsedCallData = JSON.parse(`[${rawCallData}]`);
            formattedCallData = {
                commitment: pasrsedCallData[3][0],
                nullifier: pasrsedCallData[3][1],
                signature_algorithm: pasrsedCallData[3][2],
                merkle_root: pasrsedCallData[3][3],
                a: pasrsedCallData[0],
                b: [pasrsedCallData[1][0], pasrsedCallData[1][1]],
                c: pasrsedCallData[2],
            };
            console.log('\x1b[34m%s\x1b[0m', 'formattedCallData:', formattedCallData);
        });

    describe("PoP Register", function () {
        async function deployHardhatFixture() {
            const [owner, otherAccount, thirdAccount] = await ethers.getSigners();

            const Verifier = await ethers.getContractFactory("Groth16Verifier");
            const verifier = await Verifier.deploy();
            await verifier.waitForDeployment();

            console.log(`Verifier deployed to ${verifier.target}`);

            const Formatter = await ethers.getContractFactory("Formatter");
            const formatter = await Formatter.deploy();
            await formatter.waitForDeployment();
            await formatter.addCountryCodes(Object.entries(countryCodes));

            console.log(`Formatter deployed to ${formatter.target}`);

            const Registry = await ethers.getContractFactory("Registry");
            const registry = await Registry.deploy(formatRoot(inputs.merkle_root));
            await registry.waitForDeployment();

            console.log(`Registry deployed to ${registry.target}`);

            const PoseidonT3 = await ethers.getContractFactory("PoseidonT3");
            const poseidonT3 = await PoseidonT3.deploy();
            await poseidonT3.waitForDeployment();

            console.log("PoseidonT3 deployed to:", poseidonT3.target);
            const poseidonT3Address = poseidonT3.target;
            const Register = await ethers.getContractFactory("Register", {
                libraries: {
                    PoseidonT3: poseidonT3Address
                }
            });
            const register = await Register.deploy(formatter.target, registry.target);
            await register.waitForDeployment();

            console.log(`Register deployed to ${register.target}`);

            return { verifier, register, registry, formatter, owner, otherAccount, thirdAccount }

            //registry.target
        }

        it("Verifier verifies a correct proof", async () => {
            const { verifier } = await loadFixture(deployHardhatFixture);
            expect(
                await verifier.verifyProof(pasrsedCallData[0], pasrsedCallData[1], pasrsedCallData[2], pasrsedCallData[3])
            ).to.be.true;
        });

        it("Register should succeed", async function () {
            const { verifier, register, registry, otherAccount, thirdAccount } = await loadFixture(
                deployHardhatFixture
            );

            const commitments = [1, 2, 3, 4, 5]; // Example array of commitments, all set to zero as per instructions
            for (const commitment of commitments) {
                await register.dev_add_commitment(commitment);
            }

            await register.dev_set_signature_algorithm(1, verifier.target);

            expect(await register
                .connect(thirdAccount) // fine that it's not the same account as address is taken from the proof
                .validateProof(formattedCallData)).not.to.be.reverted;
            const indexOfCommitment = await register.indexOf(formattedCallData.commitment);
            console.log(`Index of commitment: ${indexOfCommitment}`);
            const merkleTreeSize = await register.getMerkleTreeSize();
            console.log(`Merkle tree size: ${merkleTreeSize}`);
        });

    });

});