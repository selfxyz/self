import { ethers } from "hardhat";
import { expect, assert } from "chai";
import { BigNumberish, Block, dataLength } from "ethers";
import { genMockPassportData } from "../../common/src/utils/genMockPassportData";
import { 
    generateCircuitInputsProve,
    generateCircuitInputsDisclose
} from "../../common/src/utils/generateInputs";
import { 
    generateMockRSAProveVerifierInputs,
    generateMockDSCVerifierInputs
} from "../../common/src/utils/unitTest/generateMockProof";
import { getCSCAModulusMerkleTree } from "../../common/src/utils/csca";
import { formatRoot } from "../../common/src/utils/utils";
import { IMT } from "../../common/node_modules/@zk-kit/imt";

const TRUE_VERIFIER_ID = 0;
const FALSE_VERIFIER_ID = 1;

describe("Unit test for OneTimeSBT.sol", function() {

    let verifiersManager: any;
    let formatter: any;
    let oneTimeSBT: any;

    let owner: any;
    let addr1: any;
    let addr2: any;

    before(async function() {
        [owner, addr1, addr2] = await ethers.getSigners();

        const verifiersManagerFactory = await ethers.getContractFactory("VerifiersManagerMock");
        verifiersManager = await verifiersManagerFactory.deploy();
        await verifiersManager.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `Verifier_disclose deployed to ${verifiersManager.target}`);

        const formatterFactory = await ethers.getContractFactory("Formatter");
        formatter = await formatterFactory.deploy();
        await formatter.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `formatter deployed to ${formatter.target}`);

        const sbtFactory = await ethers.getContractFactory("OneTimeSBT");
        oneTimeSBT = await sbtFactory.deploy(
            verifiersManager,
            formatter
        );
        await oneTimeSBT.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `sbt deployed to ${oneTimeSBT.target}`);
    });

    describe("Test mint function", async function () {

        it("Should revert if current time is +2 dyas", async function() {
            let twoDaysPassed = new Date();
            twoDaysPassed.setDate(twoDaysPassed.getDate() + 2);
            let mockRSAProveVerifierProof = generateMockRSAProveVerifierInputs({
                current_date: twoDaysPassed
            });
            let p_proof = {
                a: mockRSAProveVerifierProof.proof.a,
                b: mockRSAProveVerifierProof.proof.b,
                c: mockRSAProveVerifierProof.proof.c,
                pubSignals: mockRSAProveVerifierProof.pub_signals
            }

            let mockDscVerifierProof = generateMockDSCVerifierInputs({});
            let d_proof = {
                a: mockDscVerifierProof.proof.a,
                b: mockDscVerifierProof.proof.b,
                c: mockDscVerifierProof.proof.c,
                pubSignals: mockDscVerifierProof.pub_signals
            }

            await expect(
                oneTimeSBT.mint(
                    TRUE_VERIFIER_ID,
                    TRUE_VERIFIER_ID,
                    p_proof,
                    d_proof
                )
            ).to.be.revertedWithCustomError(
                oneTimeSBT,
                "CURRENT_DATE_NOT_IN_VALID_RANGE"
            );
        });
        it("Should revert if current time is -2 dyas", async function() {
            let twoDaysBefore = new Date();
            twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);
            let mockRSAProveVerifierProof = generateMockRSAProveVerifierInputs({
                current_date: twoDaysBefore
            });
            let p_proof = {
                a: mockRSAProveVerifierProof.proof.a,
                b: mockRSAProveVerifierProof.proof.b,
                c: mockRSAProveVerifierProof.proof.c,
                pubSignals: mockRSAProveVerifierProof.pub_signals
            }

            let mockDscVerifierProof = generateMockDSCVerifierInputs({});
            let d_proof = {
                a: mockDscVerifierProof.proof.a,
                b: mockDscVerifierProof.proof.b,
                c: mockDscVerifierProof.proof.c,
                pubSignals: mockDscVerifierProof.pub_signals
            }

            await expect(
                oneTimeSBT.mint(
                    TRUE_VERIFIER_ID,
                    TRUE_VERIFIER_ID,
                    p_proof,
                    d_proof
                )
            ).to.be.revertedWithCustomError(
                oneTimeSBT,
                "CURRENT_DATE_NOT_IN_VALID_RANGE"
            );
        });

        it("Should revert if Blinded_dsc_commitment is not equal", async function() {
            let mockRSAProveVerifierProof = generateMockRSAProveVerifierInputs({
                blinded_dsc_commitment: "42"
            });
            let p_proof = {
                a: mockRSAProveVerifierProof.proof.a,
                b: mockRSAProveVerifierProof.proof.b,
                c: mockRSAProveVerifierProof.proof.c,
                pubSignals: mockRSAProveVerifierProof.pub_signals
            }

            let mockDscVerifierProof = generateMockDSCVerifierInputs({
                blinded_dsc_commitment: "43"
            });
            let d_proof = {
                a: mockDscVerifierProof.proof.a,
                b: mockDscVerifierProof.proof.b,
                c: mockDscVerifierProof.proof.c,
                pubSignals: mockDscVerifierProof.pub_signals
            }

            await expect(
                oneTimeSBT.mint(
                    TRUE_VERIFIER_ID,
                    TRUE_VERIFIER_ID,
                    p_proof,
                    d_proof
                )
            ).to.be.revertedWithCustomError(
                oneTimeSBT,
                "UNEQUAL_BLINDED_DSC_COMMITMENT"
            );
        });

        it("Should revert if prove verifier returns false", async function() {
            let mockRSAProveVerifierProof = generateMockRSAProveVerifierInputs({});
            let p_proof = {
                a: mockRSAProveVerifierProof.proof.a,
                b: mockRSAProveVerifierProof.proof.b,
                c: mockRSAProveVerifierProof.proof.c,
                pubSignals: mockRSAProveVerifierProof.pub_signals
            }

            let mockDscVerifierProof = generateMockDSCVerifierInputs({});
            let d_proof = {
                a: mockDscVerifierProof.proof.a,
                b: mockDscVerifierProof.proof.b,
                c: mockDscVerifierProof.proof.c,
                pubSignals: mockDscVerifierProof.pub_signals
            }

            await expect(
                oneTimeSBT.mint(
                    FALSE_VERIFIER_ID,
                    TRUE_VERIFIER_ID,
                    p_proof,
                    d_proof
                )
            ).to.be.revertedWithCustomError(
                oneTimeSBT,
                "INVALID_PROVE_PROOF"
            );
        });

        it("Should revert if dsc veriifier returns false", async function() {
            let mockRSAProveVerifierProof = generateMockRSAProveVerifierInputs({});
            let p_proof = {
                a: mockRSAProveVerifierProof.proof.a,
                b: mockRSAProveVerifierProof.proof.b,
                c: mockRSAProveVerifierProof.proof.c,
                pubSignals: mockRSAProveVerifierProof.pub_signals
            }

            let mockDscVerifierProof = generateMockDSCVerifierInputs({});
            let d_proof = {
                a: mockDscVerifierProof.proof.a,
                b: mockDscVerifierProof.proof.b,
                c: mockDscVerifierProof.proof.c,
                pubSignals: mockDscVerifierProof.pub_signals
            }

            await expect(
                oneTimeSBT.mint(
                    TRUE_VERIFIER_ID,
                    FALSE_VERIFIER_ID,
                    p_proof,
                    d_proof
                )
            ).to.be.revertedWithCustomError(
                oneTimeSBT,
                "INVALID_DSC_PROOF"
            );
        });
    });

    describe("Test util functions", async function () {

        describe("Test fieldElementsToBytes function", async function () {

        });

        describe("Test sliceFirstThree function", async function () {

        });

    });

    describe("Test attrs are correctly registerd", async function () {
        
    })
});