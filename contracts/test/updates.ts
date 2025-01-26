import { expect } from "chai";
import { deploySystemFixtures } from "./utils/deployment";
import { DeployedActors } from "./utils/types";
import { ethers } from "hardhat";
import { RegisterVerifierId, DscVerifierId } from "../../common/src/constants/constants";

describe("Update Function Tests", () => {
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

    describe("Registry Update Functions", () => {
        it("should update hub address", async () => {
            const { registry, owner, user1 } = deployedActors;
            const newHubAddress = await user1.getAddress();

            // Update hub address and check event emission
            await expect(registry.updateHub(newHubAddress))
                .to.emit(registry, "HubUpdated")
                .withArgs(newHubAddress);

            expect(await registry.hub()).to.equal(newHubAddress);
        });

        it("should update OFAC root", async () => {
            const { registry } = deployedActors;
            const newOfacRoot = ethers.hexlify(ethers.randomBytes(32));

            // Update OFAC root and check event emission
            await expect(registry.updateOfacRoot(newOfacRoot))
                .to.emit(registry, "OfacRootUpdated")
                .withArgs(newOfacRoot);

            expect(await registry.getOfacRoot()).to.equal(newOfacRoot);
        });

        it("should update CSCA root", async () => {
            const { registry } = deployedActors;
            const newCscaRoot = ethers.hexlify(ethers.randomBytes(32));

            // Update CSCA root and check event emission
            await expect(registry.updateCscaRoot(newCscaRoot))
                .to.emit(registry, "CscaRootUpdated")
                .withArgs(newCscaRoot);

            expect(await registry.getCscaRoot()).to.equal(newCscaRoot);
        });

        it("should fail when non-owner tries to update", async () => {
            const { registry, user1 } = deployedActors;
            const newValue = ethers.hexlify(ethers.randomBytes(32));

            const user1Address = await user1.getAddress();
            // Try to update with non-owner account
            await expect(
                registry.connect(user1).updateHub(user1Address)
            ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount")
                .withArgs(user1Address);

            await expect(
                registry.connect(user1).updateOfacRoot(newValue)
            ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount")
                .withArgs(user1Address);

            await expect(
                registry.connect(user1).updateCscaRoot(newValue)
            ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount")
                .withArgs(user1Address);
        });
    });

    describe("Hub Update Functions", () => {
        it("should update registry address", async () => {
            const { hub, user1 } = deployedActors;
            const newRegistryAddress = await user1.getAddress();

            await expect(hub.updateRegistry(newRegistryAddress))
                .to.emit(hub, "RegistryUpdated")
                .withArgs(newRegistryAddress);

            expect(await hub.registry()).to.equal(newRegistryAddress);
        });

        it("should update vc and disclose circuit verifier", async () => {
            const { hub, user1 } = deployedActors;
            const newVerifierAddress = await user1.getAddress();

            await expect(hub.updateVcAndDiscloseCircuit(newVerifierAddress))
                .to.emit(hub, "VcAndDiscloseCircuitUpdated")
                .withArgs(newVerifierAddress);

            expect(await hub.vcAndDiscloseCircuitVerifier()).to.equal(newVerifierAddress);
        });

        it("should update register circuit verifier", async () => {
            const { hub, user1 } = deployedActors;
            const verifierId = RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096;
            const newVerifierAddress = await user1.getAddress();

            await expect(hub.updateRegisterCircuitVerifier(verifierId, newVerifierAddress))
                .to.emit(hub, "RegisterCircuitVerifierUpdated")
                .withArgs(verifierId, newVerifierAddress);

            expect(await hub.sigTypeToRegisterCircuitVerifiers(verifierId)).to.equal(newVerifierAddress);
        });

        it("should update DSC verifier", async () => {
            const { hub, user1 } = deployedActors;
            const verifierId = DscVerifierId.dsc_rsa_sha256_65537_4096;
            const newVerifierAddress = await user1.getAddress();

            await expect(hub.updateDscVerifier(verifierId, newVerifierAddress))
                .to.emit(hub, "DscCircuitVerifierUpdated")
                .withArgs(verifierId, newVerifierAddress);

            expect(await hub.sigTypeToDscCircuitVerifiers(verifierId)).to.equal(newVerifierAddress);
        });

        it("should batch update register circuit verifiers", async () => {
            const { hub, user1 } = deployedActors;
            const verifierIds = [1, 2];
            const newVerifierAddresses = [await user1.getAddress(), await user1.getAddress()];

            await hub.batchUpdateRegisterCircuitVerifiers(verifierIds, newVerifierAddresses);
            
            for (let i = 0; i < verifierIds.length; i++) {
                expect(await hub.sigTypeToRegisterCircuitVerifiers(verifierIds[i]))
                    .to.equal(newVerifierAddresses[i]);
            }
        });

        it("should batch update DSC circuit verifiers", async () => {
            const { hub, user1 } = deployedActors;
            const verifierIds = [1, 2];
            const newVerifierAddresses = [await user1.getAddress(), await user1.getAddress()];

            await hub.batchUpdateDscCircuitVerifiers(verifierIds, newVerifierAddresses);
            
            for (let i = 0; i < verifierIds.length; i++) {
                expect(await hub.sigTypeToDscCircuitVerifiers(verifierIds[i]))
                    .to.equal(newVerifierAddresses[i]);
            }
        });

        it("should fail when non-owner tries to update", async () => {
            const { hub, user1 } = deployedActors;
            const verifierId = 1;
            const newAddress = await user1.getAddress();
            const user1Address = await user1.getAddress();

            await expect(
                hub.connect(user1).updateRegistry(newAddress)
            ).to.be.revertedWithCustomError(hub, "OwnableUnauthorizedAccount")
                .withArgs(user1Address);

            await expect(
                hub.connect(user1).updateVcAndDiscloseCircuit(newAddress)
            ).to.be.revertedWithCustomError(hub, "OwnableUnauthorizedAccount")
                .withArgs(user1Address);

            await expect(
                hub.connect(user1).updateRegisterCircuitVerifier(verifierId, newAddress)
            ).to.be.revertedWithCustomError(hub, "OwnableUnauthorizedAccount")
                .withArgs(user1Address);

            await expect(
                hub.connect(user1).updateDscVerifier(verifierId, newAddress)
            ).to.be.revertedWithCustomError(hub, "OwnableUnauthorizedAccount")
                .withArgs(user1Address);
        });

        it("should fail batch updates with mismatched array lengths", async () => {
            const { hub, user1 } = deployedActors;
            const verifierIds = [1];
            const newVerifierAddresses = [await user1.getAddress(), await user1.getAddress()];

            await expect(
                hub.batchUpdateRegisterCircuitVerifiers(verifierIds, newVerifierAddresses)
            ).to.be.revertedWithCustomError(hub, "LENGTH_MISMATCH");

            await expect(
                hub.batchUpdateDscCircuitVerifiers(verifierIds, newVerifierAddresses)
            ).to.be.revertedWithCustomError(hub, "LENGTH_MISMATCH");
        });
    });
});
