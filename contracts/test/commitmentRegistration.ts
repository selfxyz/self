import { expect } from "chai";
import { deploySystemFixtures } from "./utils/deployment";
import { DeployedActors } from "./utils/types";
import { ethers } from "hardhat";
import { generateDscSecret } from "../../common/src/utils/csca";
import { CONTRACT_CONSTANTS } from "./utils/constants";
import { RegisterVerifierId, DscVerifierId } from "../../common/src/constants/constants";

import { PassportProof } from "./utils/types";
import { ATTESTATION_ID } from "./utils/constants";

import { generateRegisterProof, generateDscProof } from "./utils/generateProof";

import { getCSCAModulusMerkleTree } from "../../common/src/utils/csca";

describe("Commitment Registration Tests", () => {
    let deployedActors: DeployedActors;
    let snapshotId: string;

    before(async () => {
        deployedActors = await deploySystemFixtures();
        snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    afterEach(async () => {
        await ethers.provider.send("evm_revert", [snapshotId]);
        snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    describe("Register Passport Commitment", () => {
        it("should register passport commitment successfully", async () => {
            const {hub, registry, vcAndDisclose, register, dsc, owner, user1, mockPassport} = deployedActors;

            const registerSecret = "1234567890";
            const dscSecret = generateDscSecret();

            const registerProof = await generateRegisterProof(
                registerSecret,
                dscSecret,
                mockPassport
            );

            const dscProof = await generateDscProof(
                dscSecret,
                mockPassport.dsc,
                1664,
            );

            const passportProof: PassportProof = {
                registerCircuitVerifierId: RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096,
                dscCircuitVerifierId: DscVerifierId.dsc_rsa_sha256_65537_4096,
                registerCircuitProof: registerProof,
                dscCircuitProof: dscProof
            };

            // Get state before registration
            const previousRoot = await registry.getIdentityCommitmentMerkleRoot();
            // const blockTimestamp = (await ethers.provider.getBlock("latest"))!.timestamp;

            // Register commitment
            const tx = await hub.verifyAndRegisterPassportCommitment(passportProof);
            const receipt = await tx.wait();
            const blockTimestamp = (await ethers.provider.getBlock("latest"))!.timestamp;

            // Get state after registration
            const currentRoot = await registry.getIdentityCommitmentMerkleRoot();
            const size = await registry.getIdentityCommitmentMerkleTreeSize();
            const rootTimestamp = await registry.rootTimestamps(currentRoot);

            // Check event emission
            const event = receipt?.logs.find(
                log => log.topics[0] === registry.interface.getEvent("CommitmentRegistered").topicHash
            );
            const eventArgs = event ? registry.interface.decodeEventLog(
                "CommitmentRegistered",
                event.data,
                event.topics
            ) : null;
            console.log("eventArgs", eventArgs);

            expect(eventArgs?.nullifier).to.equal(registerProof.pubSignals[CONTRACT_CONSTANTS.REGISTER_NULLIFIER_INDEX]);
            expect(eventArgs?.commitment).to.equal(registerProof.pubSignals[CONTRACT_CONSTANTS.REGISTER_COMMITMENT_INDEX]);
            expect(eventArgs?.timestamp).to.equal(blockTimestamp);
            expect(eventArgs?.imtRoot).to.equal(currentRoot);
            expect(eventArgs?.imtIndex).to.equal(0);

            // Check state
            expect(currentRoot).to.not.equal(previousRoot);
            console.log("currentRoot", currentRoot);
            console.log("previousRoot", previousRoot);
            expect(size).to.equal(1);
            expect(rootTimestamp).to.equal(blockTimestamp);
        });

        it("should fail when register proof verification fails", async () => {
            const {hub, registry, vcAndDisclose, register, dsc, owner, user1, mockPassport} = deployedActors;

            const registerSecret = "1234567890";
            const dscSecret = generateDscSecret();

            const registerProof = await generateRegisterProof(
                registerSecret,
                dscSecret,
                mockPassport
            );

            // Modify the proof to make it invalid
            registerProof.a[0] = "123456789";

            const dscProof = await generateDscProof(
                dscSecret,
                mockPassport.dsc,
                1664,
            );

            const passportProof: PassportProof = {
                registerCircuitVerifierId: RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096,
                dscCircuitVerifierId: DscVerifierId.dsc_rsa_sha256_65537_4096,
                registerCircuitProof: registerProof,
                dscCircuitProof: dscProof
            };

            await expect(
                hub.verifyAndRegisterPassportCommitment(passportProof)
            ).to.be.revertedWithCustomError(hub, "INVALID_REGISTER_PROOF");
        });

        it("should fail when DSC proof verification fails", async () => {
            const {hub, registry, vcAndDisclose, register, dsc, owner, user1, mockPassport} = deployedActors;

            const registerSecret = "1234567890";
            const dscSecret = generateDscSecret();

            const registerProof = await generateRegisterProof(
                registerSecret,
                dscSecret,
                mockPassport
            );

            const dscProof = await generateDscProof(
                dscSecret,
                mockPassport.dsc,
                1664,
            );

            // Modify the DSC proof to make it invalid
            dscProof.a[0] = "123456789";

            const passportProof: PassportProof = {
                registerCircuitVerifierId: RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096,
                dscCircuitVerifierId: DscVerifierId.dsc_rsa_sha256_65537_4096,
                registerCircuitProof: registerProof,
                dscCircuitProof: dscProof
            };

            await expect(
                hub.verifyAndRegisterPassportCommitment(passportProof)
            ).to.be.revertedWithCustomError(hub, "INVALID_DSC_PROOF");
        });

        it("should fail when blinded DSC commitments don't match", async () => {
            const {hub, registry, vcAndDisclose, register, dsc, owner, user1, mockPassport} = deployedActors;

            const registerSecret = "1234567890";
            const dscSecret = generateDscSecret();
            const differentDscSecret = generateDscSecret();

            const registerProof = await generateRegisterProof(
                registerSecret,
                dscSecret,
                mockPassport
            );

            const dscProof = await generateDscProof(
                differentDscSecret,
                mockPassport.dsc,
                1664,
            );

            const passportProof: PassportProof = {
                registerCircuitVerifierId: RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096,
                dscCircuitVerifierId: DscVerifierId.dsc_rsa_sha256_65537_4096,
                registerCircuitProof: registerProof,
                dscCircuitProof: dscProof
            };

            await expect(
                hub.verifyAndRegisterPassportCommitment(passportProof)
            ).to.be.revertedWithCustomError(hub, "UNEQUAL_BLINDED_DSC_COMMITMENT");
        });

        it("should fail when CSCA root is invalid", async () => {
            const {hub, registry, vcAndDisclose, register, dsc, owner, user1, mockPassport} = deployedActors;

            await registry.updateCscaRoot(123456789);

            const registerSecret = "1234567890";
            const dscSecret = generateDscSecret();

            const registerProof = await generateRegisterProof(
                registerSecret,
                dscSecret,
                mockPassport
            );

            const dscProof = await generateDscProof(
                dscSecret,
                mockPassport.dsc,
                1664,
            );

            const passportProof: PassportProof = {
                registerCircuitVerifierId: RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096,
                dscCircuitVerifierId: DscVerifierId.dsc_rsa_sha256_65537_4096,
                registerCircuitProof: registerProof,
                dscCircuitProof: dscProof
            };

            await expect(
                hub.verifyAndRegisterPassportCommitment(passportProof)
            ).to.be.revertedWithCustomError(hub, "INVALID_CSCA_ROOT");

            const cscaModulusMerkleTree = getCSCAModulusMerkleTree();
            await registry.updateCscaRoot(cscaModulusMerkleTree.root);
        });

        it("should fail when nullifier is already used", async () => {
            const {hub, registry, vcAndDisclose, register, dsc, owner, user1, mockPassport} = deployedActors;

            const registerSecret = "1234567890";
            const dscSecret = generateDscSecret();

            const registerProof = await generateRegisterProof(
                registerSecret,
                dscSecret,
                mockPassport
            );

            const dscProof = await generateDscProof(
                dscSecret,
                mockPassport.dsc,
                1664,
            );

            const passportProof: PassportProof = {
                registerCircuitVerifierId: RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096,
                dscCircuitVerifierId: DscVerifierId.dsc_rsa_sha256_65537_4096,
                registerCircuitProof: registerProof,
                dscCircuitProof: dscProof
            };

            await hub.verifyAndRegisterPassportCommitment(passportProof);

            await expect(
                hub.verifyAndRegisterPassportCommitment(passportProof)
            ).to.be.revertedWithCustomError(registry, "REGISTERED_IDENTITY");
        });

        it("should fail when called by non-hub address", async () => {
            const {hub, registry, vcAndDisclose, register, dsc, owner, user1, mockPassport} = deployedActors;

            await expect(
                registry.connect(user1).registerCommitment(
                    ATTESTATION_ID.E_PASSPORT,
                    123456789, // dummy nullifier
                    987654321  // dummy commitment
                )
            ).to.be.revertedWithCustomError(registry, "ONLY_HUB_CAN_REGISTER_COMMITMENT");
        });
    });
});