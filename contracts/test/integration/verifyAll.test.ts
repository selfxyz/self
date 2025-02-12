import { expect } from "chai";
import { ethers } from "hardhat";
import { deploySystemFixtures } from "../utils/deployment";
import { DeployedActors } from "../utils/types";
import { generateRandomFieldElement } from "../utils/utils";
import { generateCommitment } from "../../../common/src/utils/passports/passport";
import { ATTESTATION_ID, CIRCUIT_CONSTANTS } from "../utils/constants";
import { LeanIMT } from "@openpassport/zk-kit-lean-imt";
import { poseidon2 } from "poseidon-lite";
import { generateVcAndDiscloseProof } from "../utils/generateProof";
import { Formatter } from "../utils/formatter";
import { formatCountriesList, reverseBytes } from "../../../common/src/utils/circuits/formatInputs";
import { VerifyAll } from "../../typechain-types";

describe("VerifyAll", () => {
    let deployedActors: DeployedActors;
    let verifyAll: VerifyAll;
    let snapshotId: string;
    let baseVcAndDiscloseProof: any;
    let vcAndDiscloseProof: any;
    let registerSecret: any;
    let imt: any;
    let commitment: any;
    let nullifier: any;
    let forbiddenCountriesList: string[];
    let forbiddenCountriesListPacked: string;

    before(async () => {
        deployedActors = await deploySystemFixtures();
        const VerifyAllFactory = await ethers.getContractFactory("VerifyAll");
        verifyAll = await VerifyAllFactory.deploy(
            deployedActors.hub.getAddress(),
            deployedActors.registry.getAddress()
        );

        registerSecret = generateRandomFieldElement();
        nullifier = generateRandomFieldElement();
        commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, deployedActors.mockPassport);
        
        const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
        imt = new LeanIMT<bigint>(hashFunction);
        await imt.insert(BigInt(commitment));

        forbiddenCountriesList = ['AAA', 'ABC', 'CBA'];
        forbiddenCountriesListPacked = reverseBytes(Formatter.bytesToHexString(new Uint8Array(formatCountriesList(forbiddenCountriesList))));

        baseVcAndDiscloseProof = await generateVcAndDiscloseProof(
            registerSecret,
            BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
            deployedActors.mockPassport,
            "test-scope",
            new Array(88).fill("1"),
            "1",
            imt,
            "20",
            undefined,
            undefined,
            forbiddenCountriesList,
            (await deployedActors.user1.getAddress()).slice(2)
        );
        snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    beforeEach(async () => {
        vcAndDiscloseProof = structuredClone(baseVcAndDiscloseProof);
    });

    afterEach(async () => {
        await ethers.provider.send("evm_revert", [snapshotId]);
        snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    describe("verifyAll", () => {
        it("should verify and get result successfully", async () => {
            const {registry, owner} = deployedActors;

            const tx = await registry.connect(owner).devAddIdentityCommitment(
                ATTESTATION_ID.E_PASSPORT,
                nullifier,
                commitment
            );
            const receipt = await tx.wait() as any;
            const timestamp = (await ethers.provider.getBlock(receipt.blockNumber))!.timestamp;

            const vcAndDiscloseHubProof = {
                olderThanEnabled: true,
                olderThan: "20",
                forbiddenCountriesEnabled: true,
                forbiddenCountriesListPacked: forbiddenCountriesListPacked,
                ofacEnabled: true,
                vcAndDiscloseProof: vcAndDiscloseProof
            };

            const types = ['0', '1', '2']; // Example types
            const [readableData, success] = await verifyAll.verifyAll(
                timestamp,
                vcAndDiscloseHubProof,
                types
            );

            expect(success).to.be.true;
            expect(readableData.name).to.not.be.empty;
            
        });

        it("should verify and get result successfully with out timestamp verification", async () => {
            const {registry, owner} = deployedActors;

            await registry.connect(owner).devAddIdentityCommitment(
                ATTESTATION_ID.E_PASSPORT,
                nullifier,
                commitment
            );
            const vcAndDiscloseHubProof = {
                olderThanEnabled: true,
                olderThan: "20",
                forbiddenCountriesEnabled: true,
                forbiddenCountriesListPacked: forbiddenCountriesListPacked,
                ofacEnabled: true,
                vcAndDiscloseProof: vcAndDiscloseProof
            };

            const types = ['0', '1', '2']; // Example types
            const [readableData, success] = await verifyAll.verifyAll(
                0,
                vcAndDiscloseHubProof,
                types
            );

            expect(success).to.be.true;
            expect(readableData.name).to.not.be.empty;
            
        });

        it("should return empty result when verification fails", async () => {
            const {registry, owner} = deployedActors;

            await registry.connect(owner).devAddIdentityCommitment(
                ATTESTATION_ID.E_PASSPORT,
                nullifier,
                commitment
            );

            vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_MERKLE_ROOT_INDEX] = generateRandomFieldElement();
            const vcAndDiscloseHubProof = {
                olderThanEnabled: true,
                olderThan: "20",
                forbiddenCountriesEnabled: true,
                forbiddenCountriesListPacked: forbiddenCountriesListPacked,
                ofacEnabled: true,
                vcAndDiscloseProof: vcAndDiscloseProof
            };

            const types = ['0', '1', '2'];
            const [readableData, success] = await verifyAll.verifyAll(
                0,
                vcAndDiscloseHubProof,
                types
            );

            expect(success).to.be.false;
            expect(readableData.name).to.be.empty;
            
        });

        it("should fail with invalid root timestamp", async () => {
            const {registry, owner} = deployedActors;

            await registry.connect(owner).devAddIdentityCommitment(
                ATTESTATION_ID.E_PASSPORT,
                nullifier,
                commitment
            );

            const vcAndDiscloseHubProof = {
                olderThanEnabled: true,
                olderThan: "20",
                forbiddenCountriesEnabled: true,
                forbiddenCountriesListPacked: forbiddenCountriesListPacked,
                ofacEnabled: true,
                vcAndDiscloseProof: vcAndDiscloseProof
            };

            const types = ['0', '1', '2'];
            const [readableData, success] = await verifyAll.verifyAll(
                123456, // Invalid timestamp
                vcAndDiscloseHubProof,
                types
            );

            expect(success).to.be.false;
            expect(readableData.name).to.be.empty;
        });
    });

    describe("admin functions", () => {
        it("should allow owner to set new hub address", async () => {
            const newHubAddress = await deployedActors.user1.getAddress();
            await verifyAll.setHub(newHubAddress);
        });

        it("should allow owner to set new registry address", async () => {
            const newRegistryAddress = await deployedActors.user1.getAddress();
            await verifyAll.setRegistry(newRegistryAddress);
        });

        it("should not allow non-owner to set new hub address", async () => {
            const newHubAddress = await deployedActors.user1.getAddress();
            await expect(
                verifyAll.connect(deployedActors.user1).setHub(newHubAddress)
            ).to.be.revertedWithCustomError(verifyAll, "OwnableUnauthorizedAccount");
        });

        it("should not allow non-owner to set new registry address", async () => {
            const newRegistryAddress = await deployedActors.user1.getAddress();
            await expect(
                verifyAll.connect(deployedActors.user1).setRegistry(newRegistryAddress)
            ).to.be.revertedWithCustomError(verifyAll, "OwnableUnauthorizedAccount");
        });
    });
});
