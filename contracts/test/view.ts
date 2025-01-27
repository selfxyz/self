import { expect } from "chai";
import { deploySystemFixtures } from "./utils/deployment";
import { DeployedActors } from "./utils/types";
import { ethers } from "hardhat";
import { RegisterVerifierId, DscVerifierId } from "../../common/src/constants/constants";
import { getCSCAModulusMerkleTree } from "../../common/src/utils/csca";
import { generateRandomFieldElement } from "./utils/utils";

describe("View Function Tests", () => {
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

    describe("Hub View Functions", () => {
        it("should return correct registry address", async () => {
            const { hub, registry } = deployedActors;
            expect(await hub.registry()).to.equal(registry.target);
        });

        it("should return correct vcAndDiscloseCircuitVerifier address", async () => {
            const { hub, vcAndDisclose } = deployedActors;
            expect(await hub.vcAndDiscloseCircuitVerifier()).to.equal(vcAndDisclose.target);
        });

        it("should return correct register circuit verifier address", async () => {
            const { hub, register } = deployedActors;
            const verifierId = RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096;
            expect(await hub.sigTypeToRegisterCircuitVerifiers(verifierId)).to.equal(register.target);
        });

        it("should return correct dsc circuit verifier address", async () => {
            const { hub, dsc } = deployedActors;
            const verifierId = DscVerifierId.dsc_rsa_sha256_65537_4096;
            expect(await hub.sigTypeToDscCircuitVerifiers(verifierId)).to.equal(dsc.target);
        });
    });

    describe("Registry View Functions", () => {
        it("should return correct hub address", async () => {
            const { hub, registry } = deployedActors;
            expect(await registry.hub()).to.equal(hub.target);
        });

        it("should return correct CSCA root", async () => {
            const { registry } = deployedActors;
            const cscaModulusMerkleTree = getCSCAModulusMerkleTree();
            expect(await registry.getCscaRoot()).to.equal(cscaModulusMerkleTree.root);
        });

        it("should check CSCA root correctly", async () => {
            const { registry } = deployedActors;
            const cscaModulusMerkleTree = getCSCAModulusMerkleTree();
            expect(await registry.checkCscaRoot(cscaModulusMerkleTree.root)).to.be.true;
            expect(await registry.checkCscaRoot(generateRandomFieldElement())).to.be.false;
        });

        it("should return correct OFAC root", async () => {
            const { registry } = deployedActors;
            const ofacRoot = await registry.getOfacRoot();
            expect(await registry.checkOfacRoot(ofacRoot)).to.be.true;
            expect(await registry.checkOfacRoot(generateRandomFieldElement())).to.be.false;
        });

        it("should return correct nullifier status", async () => {
            const { registry } = deployedActors;
            const attestationId = ethers.toBeHex(generateRandomFieldElement());
            const nullifier = ethers.toBeHex(generateRandomFieldElement());
            
            // Should return false for unused nullifier
            expect(await registry.nullifiers(attestationId, nullifier)).to.be.false;
        });
    });
});
