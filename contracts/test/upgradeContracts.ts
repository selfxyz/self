import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { deploySystemFixtures } from "./utils/deployment";
import { DeployedActors } from "./utils/types";
import { ethers } from "hardhat";

describe("Upgrade Tests", () => {
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

    describe("Upgradeability", () => {
        it("should allow owner to upgrade implementation", async () => {
            const {hub, registry, owner, user1} = deployedActors;
            
            // Deploy new implementation
            const HubV2Factory = await ethers.getContractFactory("IdentityVerificationHubImplV1", owner);
            const hubV2Implementation = await HubV2Factory.deploy();
            await hubV2Implementation.waitForDeployment();

            // Get proxy interface with implementation ABI
            const hubAsImpl = await ethers.getContractAt(
                "IdentityVerificationHubImplV1",
                hub.target
            );

            // Upgrade through proxy
            await hubAsImpl.connect(owner).upgradeToAndCall(
                hubV2Implementation.target,
                "0x"  // No initialization data needed
            );

            // Verify implementation address was updated
            const implementationSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
            const implementationAddress = await ethers.provider.getStorage(hub.target, implementationSlot);
            expect(ethers.zeroPadValue(implementationAddress, 32))
                .to.equal(ethers.zeroPadValue(hubV2Implementation.target.toString(), 32));
        });

        it("should not allow non-owner to upgrade implementation", async () => {
            const {hub, registry, owner, user1} = deployedActors;
            
            // Deploy new implementation
            const HubV2Factory = await ethers.getContractFactory("IdentityVerificationHubImplV1", owner);
            const hubV2Implementation = await HubV2Factory.deploy();
            await hubV2Implementation.waitForDeployment();

            // Get proxy interface with implementation ABI
            const hubAsImpl = await ethers.getContractAt(
                "IdentityVerificationHubImplV1",
                hub.target
            );

            // Try to upgrade from non-owner account
            await expect(
                hubAsImpl.connect(user1).upgradeToAndCall(
                    hubV2Implementation.target,
                    "0x"
                )
            ).to.be.revertedWithCustomError(hubAsImpl, "OwnableUnauthorizedAccount");
        });

        it("should not allow implementation contract to be initialized directly", async () => {
            const {hub, owner} = deployedActors;
            
            // Deploy new implementation
            const HubV2Factory = await ethers.getContractFactory("IdentityVerificationHubImplV1", owner);
            const hubV2Implementation = await HubV2Factory.deploy();
            await hubV2Implementation.waitForDeployment();

            // Try to initialize the implementation contract directly
            await expect(
                hubV2Implementation.initialize(
                    ethers.ZeroAddress,  // registry
                    ethers.ZeroAddress,  // vcAndDiscloseCircuitVerifier
                    [],  // registerCircuitVerifierIds
                    [],  // registerCircuitVerifiers
                    [],  // dscCircuitVerifierIds
                    []   // dscCircuitVerifiers
                )
            ).to.be.revertedWithCustomError(hub, "InvalidInitialization");
        });

        it("should preserve state after upgrade", async () => {
            const {hub, registry, owner, user1} = deployedActors;
            
            // Store some state before upgrade
            const registryAddressBefore = await hub.registry();
            
            // Deploy new implementation
            const HubV2Factory = await ethers.getContractFactory("IdentityVerificationHubImplV1", owner);
            const hubV2Implementation = await HubV2Factory.deploy();
            await hubV2Implementation.waitForDeployment();

            // Get proxy interface with implementation ABI
            const hubAsImpl = await ethers.getContractAt(
                "IdentityVerificationHubImplV1",
                hub.target
            );

            // Upgrade through proxy
            await hubAsImpl.connect(owner).upgradeToAndCall(
                hubV2Implementation.target,
                "0x"
            );

            // Verify state is preserved
            const hubV2 = await ethers.getContractAt("IdentityVerificationHubImplV1", hub.target);
            const registryAddressAfter = await hubV2.registry();
            expect(registryAddressAfter).to.equal(registryAddressBefore);
        });
    });
});
