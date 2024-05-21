import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { mockPassportData_sha256WithRSAEncryption_65537 } from "../../common/src/utils/mockPassportData";
import { countryCodes, PASSPORT_ATTESTATION_ID } from "../../common/src/constants/constants";
import { formatRoot, getCurrentDateYYMMDD } from "../../common/src/utils/utils";
import { groth16 } from 'snarkjs'
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import axios from 'axios';
import { revealBitmapFromMapping } from "../../common/src/utils/revealBitmap";
import { generateCircuitInputsRegister, generateCircuitInputsDisclose } from "../../common/src/utils/generateInputs";
import { formatCallData_disclose, formatCallData_register } from "../../common/src/utils/formatCallData";
import fs from 'fs';
import { LeanIMT } from "@zk-kit/lean-imt";
import { poseidon2 } from "poseidon-lite";
import { PassportData } from "../../common/src/utils/types";
import { Signer } from "ethers";


describe("Proof of Passport - Contracts - Register & Disclose flow", function () {
    this.timeout(0);

    let passportData: PassportData, proof, inputs: any, publicSignals, revealChars, parsedCallData_register: any[], formattedCallData_register: any;
    // Paths
    const path_register_wasm = "../circuits/build/register_sha256WithRSAEncryption_65537_js/register_sha256WithRSAEncryption_65537.wasm";
    const path_register_zkey = "../circuits/build/register_sha256WithRSAEncryption_65537_final.zkey";
    const path_register_vkey = "../circuits/build/register_sha256WithRSAEncryption_65537_vkey.json";

    const path_disclose_wasm = "../circuits/build/disclose_js/disclose.wasm";
    const path_disclose_zkey = "../circuits/build/disclose_final.zkey";
    const path_disclose_vkey = "../circuits/build/disclose_vkey.json";
    // Smart contracts
    let Verifier_register: any, verifier_register: any, Registry: any, registry: any, Formatter: any, formatter: any, Register: any, register: any, Verifier_disclose: any, verifier_disclose: any, SBT: any, sbt: any, PoseidonT3: any, poseidonT3: any;
    let owner, otherAccount, thirdAccount: Signer;
    let imt: LeanIMT;

    let bitmap, scope, user_address, majority, user_identifier, current_date, input_disclose: any;
    let proof_disclose, publicSignals_disclose, proof_result_disclose, vkey_disclose, verified_disclose: any, rawCallData_disclose, parsedCallData_disclose: any[], formattedCallData_disclose: any;
    let secret: string = BigInt(0).toString();
    let attestation_id: string = PASSPORT_ATTESTATION_ID;

    before(
        async function generateProof() {
            [owner, otherAccount, thirdAccount] = await ethers.getSigners() as any[];
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
                secret, attestation_id, passportData, { developmentMode: true }
            );

            /*** Deploy contracts ***/
            await deployContracts();

            /*** Initialize merkle tree ***/
            imt = new LeanIMT((a: bigint, b: bigint) => poseidon2([a, b]), []);
        });
    async function deployContracts(network = 'hardhat') {
        console.log(`Deploying contracts on ${network}...`);

        // Network-specific configurations can be added here
        let deployOptions = {};
        if (network !== 'hardhat') {
            deployOptions = {
                gasPrice: 10 * 10 ** 9,
                gasLimit: 8000000 // example gas limit
            };
        }

        Verifier_register = await ethers.getContractFactory("Verifier_register_sha256WithRSAEncryption_65537");
        verifier_register = await Verifier_register.deploy(deployOptions);
        await verifier_register.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `Verifier_register deployed to ${verifier_register.target}`);

        Formatter = await ethers.getContractFactory("Formatter");
        formatter = await Formatter.deploy(deployOptions);
        await formatter.waitForDeployment();
        await formatter.addCountryCodes(Object.entries(countryCodes));
        console.log('\x1b[34m%s\x1b[0m', `Formatter deployed to ${formatter.target}`);

        Registry = await ethers.getContractFactory("Registry");
        registry = await Registry.deploy(formatRoot(inputs.merkle_root), deployOptions);
        await registry.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `Registry deployed to ${registry.target}`);

        PoseidonT3 = await ethers.getContractFactory("PoseidonT3");
        poseidonT3 = await PoseidonT3.deploy(deployOptions);
        await poseidonT3.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `PoseidonT3 deployed to: ${poseidonT3.target}`);

        const poseidonT3Address = poseidonT3.target;
        Register = await ethers.getContractFactory("ProofOfPassportRegister_dev", {
            libraries: {
                PoseidonT3: poseidonT3Address
            }
        });
        register = await Register.deploy(registry.target, deployOptions);
        await register.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `Register deployed to ${register.target}`);

        Verifier_disclose = await ethers.getContractFactory("Verifier_disclose");
        verifier_disclose = await Verifier_disclose.deploy(deployOptions);
        await verifier_disclose.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `Verifier_disclose deployed to ${verifier_disclose.target}`);

        await register.addSignatureAlgorithm(1, verifier_register.target); // dev function - will not be deployed in production

        SBT = await ethers.getContractFactory("SBT");
        sbt = await SBT.deploy(
            verifier_disclose.target,
            formatter.target,
            register.target,
            deployOptions
        );
        await sbt.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `SBT deployed to ${sbt.target}`);
    }

    describe("Proof of Passport - Utils flow", function () {
        it("Should convert ISO dates to unix timestamps correctly", async function () {
            const unix_timestamp = await formatter.dateToUnixTimestamp("230512") // 2023 05 12
            console.log('unix_timestamp', unix_timestamp.toString());

            var date = new Date(Number(unix_timestamp) * 1000);
            console.log("date:", date.toUTCString());

            expect(date.getUTCFullYear()).to.equal(2023);
            expect(date.getUTCMonth()).to.equal(4);
            expect(date.getUTCDate()).to.equal(12);
        })
    })

    /*** Register flow ***/
    describe("Proof of Passport - Register flow", function () {
        before(async function () {
            /***  Groth16 saga  Register***/
            // Generate the proof
            console.log('\x1b[32m%s\x1b[0m', 'Generating proof - Register...');
            ({ proof, publicSignals } = await groth16.fullProve(
                inputs,
                path_register_wasm,
                path_register_zkey
            ))
            console.log('\x1b[32m%s\x1b[0m', 'Proof generated - Register');
            // Verify the proof
            const vKey = JSON.parse(fs.readFileSync(path_register_vkey) as unknown as string);
            const verified = await groth16.verify(
                vKey,
                publicSignals,
                proof
            )
            assert(verified == true, 'Should verify')
            console.log('\x1b[32m%s\x1b[0m', 'Proof verified - Register');

            const rawCallData = await groth16.exportSolidityCallData(proof, publicSignals);
            parsedCallData_register = JSON.parse(`[${rawCallData}]`);
            formattedCallData_register = formatCallData_register(parsedCallData_register)

            // Set fake commitments into the tree
            const commitments = [1, 2, 3];
            for (const commitment of commitments) {
                await register.devAddCommitment(commitment); // this is a dev function and will not be deplyed in production
                imt.insert(BigInt(commitment));
            }
        });

        it("Verifier_register.sol verifies a correct proof - Register", async () => {
            expect(
                await verifier_register.verifyProof(parsedCallData_register[0], parsedCallData_register[1], parsedCallData_register[2], parsedCallData_register[3])
            ).to.be.true;
        });

        it("Register with a wrong proof should fail - Register", async function () {
            await expect(register
                .validateProof({ ...formattedCallData_register, a: [0, 0] }, 1))
                .to.be.revertedWith("Register__InvalidProof()")
                .catch(error => {
                    assert(error.message.includes("Register__InvalidProof()"), "Expected revert with Register__InvalidProof(), but got another error");
                });
        });

        it("Register with a wrong attestation id should fail - Register", async function () {
            await expect(register
                .validateProof({ ...formattedCallData_register, attestation_id: "10" }, 1))
                .to.be.revertedWith("Register__InvalidSignatureAlgorithm()")
                .catch(error => {
                    assert(error.message.includes("Register__InvalidSignatureAlgorithm()"), "Expected revert with Register__InvalidSignatureAlgorithm(), but got another error");
                });
        });

        it("Register with a wrong signature algorithm should fail - Register", async function () {
            await expect(register
                .validateProof({ ...formattedCallData_register}, 2))
                .to.be.revertedWith("Register__InvalidSignatureAlgorithm()")
                .catch(error => {
                    assert(error.message.includes("Register__InvalidSignatureAlgorithm()"), "Expected revert with Register__InvalidSignatureAlgorithm(), but got another error");
                });
        });

        it("Register with a wrong merkle root should fail - Register", async function () {
            await expect(register
                .validateProof({ ...formattedCallData_register, merkle_root: 0 }, 1))
                .to.be.revertedWith("Register__InvalidMerkleRoot()")
                .catch(error => {
                    assert(error.message.includes("Register__InvalidMerkleRoot()"), "Expected revert with Register__InvalidMerkleRoot(), but got another error");
                });
        });

        it("Register should succeed - Register", async function () {
            expect(await register
                .validateProof(formattedCallData_register, 1)).not.to.be.reverted;
            imt.insert(BigInt(formattedCallData_register.commitment));
            /// check if the merkle root is equal to the one from the imt
            // console.log('\x1b[34m%s\x1b[0m', `IMT Merkle root of TS Object - TS: ${imt.root}`);
            // console.log('\x1b[34m%s\x1b[0m', `Merkle root of contract - TS: ${await register.getMerkleRoot()}`);
            assert.equal(await register.getMerkleRoot(), imt.root);
            console.log('\x1b[34m%s\x1b[0m', `Merkle roots from TS Object and Smart Contract are equal: ${imt.root}`);

        });

        it("Register with the same proof should fail - Register", async function () {
            await expect(register
                .validateProof(formattedCallData_register, 1))
                .to.be.revertedWith("Register__YouAreUsingTheSameNullifierTwice()")
                .catch(error => {
                    assert(error.message.includes("Register__YouAreUsingTheSameNullifierTwice()"), "Expected revert with Register__YouAreUsingTheSameNullifierTwice(), but got another error");
                });
        });

    });



    /*** Disclose flow ***/
    describe("Proof of Passport - Disclose flow", function () {

        //before all
        before(async function () {
            /***  Groth16 saga - Disclose***/

            // refactor in generate inputs function
            bitmap = Array(90).fill("1");
            scope = BigInt(1).toString();
            user_address = await thirdAccount.getAddress();
            majority = ["1", "8"];
            input_disclose = generateCircuitInputsDisclose(
                inputs.secret,
                inputs.attestation_id,
                passportData,
                imt as any,
                majority,
                bitmap,
                scope,
                BigInt(user_address.toString()).toString()
            );
            // Generate the proof
            console.log('\x1b[32m%s\x1b[0m', 'Generating proof - Disclose');
            try {
                proof_result_disclose = await groth16.fullProve(
                    input_disclose,
                    path_disclose_wasm,
                    path_disclose_zkey
                );
            } catch (error) {
                console.error("Error generating proof:", error);
                throw error;
            }
            proof_disclose = proof_result_disclose.proof;
            publicSignals_disclose = proof_result_disclose.publicSignals;

            console.log('\x1b[32m%s\x1b[0m', 'Proof generated - Disclose');
            // Verify the proof
            vkey_disclose = JSON.parse(fs.readFileSync(path_disclose_vkey) as unknown as string);
            verified_disclose = await groth16.verify(
                vkey_disclose,
                publicSignals_disclose,
                proof_disclose
            )
            assert(verified_disclose == true, 'Should verify')
            console.log('\x1b[32m%s\x1b[0m', 'Proof verified - Disclose');
            rawCallData_disclose = await groth16.exportSolidityCallData(proof_disclose, publicSignals_disclose);
            parsedCallData_disclose = JSON.parse(`[${rawCallData_disclose}]`);
            formattedCallData_disclose = formatCallData_disclose(parsedCallData_disclose);
            console.log('formattedCallData_disclose', formattedCallData_disclose);

        })
        it("SBT mint should fail with a wrong current date - SBT", async function () {
            await expect(sbt.mint({ ...formattedCallData_disclose, current_date: [2, 4, 0, 1, 0, 1] }))
                .to.be.revertedWith("Current date is not within the valid range")
        });
        it("SBT mint should fail with a wrong proof - SBT", async function () {
            await expect(sbt.mint({ ...formattedCallData_disclose, nullifier: 0 }))
                .to.be.revertedWith("Invalid Proof");
        });
        it("SBT mint should fail with a wrong merkle_root - SBT", async function () {
            await expect(sbt.mint({ ...formattedCallData_disclose, merkle_root: 0 }))
                .to.be.revertedWith("Invalid merkle root");
        });
        it("Verifier_disclose.sol verifies a correct proof - Disclose", async () => {
            expect(
                await verifier_disclose.verifyProof(parsedCallData_disclose[0], parsedCallData_disclose[1], parsedCallData_disclose[2], parsedCallData_disclose[3])
            ).to.be.true;
        });
        it("SBT mint should succeed - SBT", async function () {
            await expect(
                sbt.mint(formattedCallData_disclose)
            ).not.to.be.reverted;
        });
        it("URI et Expiry saga - SBT", async function () {
            const tokenURI = await sbt.tokenURI(0);
            const decodedTokenURI = Buffer.from(tokenURI.split(',')[1], 'base64').toString();
            let parsedTokenURI;
            try {
                parsedTokenURI = JSON.parse(decodedTokenURI);
            } catch (e) {
                assert(false, 'TokenURI is not a valid JSON');
            }
            // console.log('parsedTokenURI', parsedTokenURI);
            const expired = parsedTokenURI.attributes.find((attribute: any) => attribute.trait_type === 'Expired');
            expect(expired.value).to.equal('No');
            await time.increaseTo(2240161656); // 2040
            const tokenURIAfter = await sbt.tokenURI(0);
            const decodedTokenURIAfter = Buffer.from(tokenURIAfter.split(',')[1], 'base64').toString();
            const parsedTokenURIAfter = JSON.parse(decodedTokenURIAfter);
            const expiredAfter = parsedTokenURIAfter.attributes.find((attribute: any) => attribute.trait_type === 'Expired');
            expect(expiredAfter.value).to.equal('Yes');
        });

        it("SBT mint should fail with same proof twice - SBT", async function () {
            await expect(sbt.mint(formattedCallData_disclose))
                .to.be.revertedWith("Signature already nullified");
        });
    });



    // describe("Minting on mumbai", function () {
    //     it.skip("Should allow minting using a proof generated by ark-circom", async function () {
    //         const newCallDataFromArkCircom = [["0x089e5850e432d76f949cedc26527a7fb093194dd4026d5efb07c8ce6093fa977", "0x0154b01b5698e6249638be776d3641392cf89a5ad687beb2932c0ccf33f271d4"], [["0x2692dbce207361b048e6eff874fdc5d50433baa546fa754348a87373710044c0", "0x1db8ddab0dc204d41728efc05d2dae690bebb782b6088d92dda23a87b6bed0a2"], ["0x106be642690f0fe3562d139ed09498d979c8b35ecfb04e5a49422015cafa2705", "0x0b133e53cd0b4944ce2d34652488a16d1a020905dc1972ccc883d364dd3bb4ee"]], ["0x09eda5d551b150364ecb3efb432e4568b2be8f83c2db1dd1e1285c45a428b32b", "0x008ee9e870e5416849b3c94b8b9e4759580659f5a6535652d0a6634df23db2f5"], ["0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x000000000000000000000000000000006df9dd0914f215fafa1513e51ac9f1e2", "0x00000000000000000000000000000000000000000000093e703cd030e286890e", "0x0000000000000000000000000000000000000000000004770a914f3ae4e1288b", "0x000000000000000000000000000000000000000000000bf7e8ecb4e9609a489d", "0x00000000000000000000000000000000000000000000035762de41038bc2dcf1", "0x00000000000000000000000000000000000000000000050442c4055d62e9c4af", "0x0000000000000000000000000000000000000000000004db2bdc79a477a0fce0", "0x000000000000000000000000000000000000000000000acdbf649c76ec3df9ad", "0x000000000000000000000000000000000000000000000aaa0e6798ee3694f5ca", "0x000000000000000000000000000000000000000000000a1eaac37f80dd5e2879", "0x00000000000000000000000000000000000000000000033e063fba83c27efbce", "0x00000000000000000000000000000000000000000000045b9b05cab95025b000", "0x000000000000000000000000e6e4b6a802f2e0aee5676f6010e0af5c9cdd0a50"]];
    //         // const callDataFromArkCircomGeneratedInTest = [ [ '0x07a378ec2b5bafc15a21fb9c549ba2554a4ef22cfca3d835f44d270f547d0913', '0x089bb81fb68200ef64652ada5edf71a98dcc8a931a54162b03b61647acbae1fe' ], [ [ '0x2127ae75494aed0c384567cc890639d7609040373d0a549e665a26a39b264449', '0x2f0ea6c99648171b7e166086108131c9402f9c5ac4a3759705a9c9217852e328' ], [ '0x04efcb825be258573ffe8c9149dd2b040ea3b8a9fa3dfa1c57a87b11c20c21ec', '0x2b500aece0e5a5a64a5c7262ec379efc1a23f4e46d968aebd42337642ea2bd3e' ] ], [ '0x1964dc2231bcd1e0de363c3d2a790346b7e634b5878498ce6e8db0ac972b8125', '0x0d94cd74a89b0ed777bb309ce960191acd23d5e9c5f418722d03f80944c5e3ed' ], [ '0x000000000000000000544e45524f4c4600000000000000000000000000000000', '0x0000000000000000000000000000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000000000000000000000000000', '0x000000000000000000000000000000000df267467de87516584863641a75504b', '0x00000000000000000000000000000000000000000000084c754a8650038f4c82', '0x000000000000000000000000000000000000000000000d38447935bb72a5193c', '0x000000000000000000000000000000000000000000000cac133b01f78ab24970', '0x0000000000000000000000000000000000000000000006064295cda88310ce6e', '0x000000000000000000000000000000000000000000001026cd8776cbd52df4b0', '0x000000000000000000000000000000000000000000000d4748d254334ce92b36', '0x0000000000000000000000000000000000000000000005c1b0ba7159834b0bf1', '0x00000000000000000000000000000000000000000000029d91f03395b916792a', '0x000000000000000000000000000000000000000000000bcfbb30f8ea70a224df', '0x00000000000000000000000000000000000000000000003dcd943c93e565aa3e', '0x0000000000000000000000000000000000000000000009e8ce7916ab0fb0b000', '0x000000000000000000000000ede0fa5a7b196f512204f286666e5ec03e1005d2' ] ];

    //         const registerOnMumbaiAddress = '0x7D459347d092D35f043f73021f06c19f834f8c3E';
    //         const registerOnMumbai = await ethers.getContractAt('Register', registerOnMumbaiAddress);
    //         try {
    //             const tx = await registerOnMumbai.mint(...newCallDataFromArkCircom as any);
    //             console.log('txHash', tx.hash);
    //             const receipt = await tx.wait();
    //             console.log('receipt', receipt)
    //             expect(receipt?.status).to.equal(1);
    //         } catch (error) {
    //             console.error(error);
    //             expect(true).to.equal(false);
    //         }
    //     });

    //     it.skip("Should allow minting using lambda function", async function () {
    //         const registerOnMumbaiAddress = '0x0AAd39A080129763c8E1e2E9DC44E777DB0362a3';
    //         const provider = new ethers.JsonRpcProvider('https://polygon-mumbai-bor.publicnode.com');
    //         const registerOnMumbai = await ethers.getContractAt('Register', registerOnMumbaiAddress);

    //         try {
    //             const transactionRequest = await registerOnMumbai
    //                 .mint.populateTransaction(...callData);

    //             console.log('transactionRequest', transactionRequest);

    //             const apiEndpoint = process.env.AWS_ENDPOINT;
    //             if (!apiEndpoint) {
    //                 throw new Error('AWS_ENDPOINT env variable is not set');
    //             }
    //             const response = await axios.post(apiEndpoint, {
    //                 chain: "mumbai",
    //                 tx_data: transactionRequest
    //             });
    //             console.log('response status', response.status)
    //             console.log('response data', response.data)
    //             const receipt = await provider.waitForTransaction(response.data.hash);
    //             console.log('receipt', receipt)
    //         } catch (err) {
    //             console.log('err', err);
    //         }
    //     });
    // })

});

