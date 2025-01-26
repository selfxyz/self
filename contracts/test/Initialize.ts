import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { deploySystemFixtures } from "./utils/deployment";
import { DeployedActors } from "./utils/types";
import { ethers } from "hardhat";
import { ZeroAddress } from "ethers";
import { RegisterVerifierId, DscVerifierId } from "../../common/src/constants/constants";

describe("Initialize Tests", () => {
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

    describe("Registry Initialization", () => {
        it("should initialize registry with correct hub address", async () => {
            const {registry, hub} = deployedActors;
            // Check initial state
            expect(await registry.hub()).to.equal(hub.target);
            
            // Check event emission
            const initializedFiler = registry.filters.RegistryInitialized;
            const events = await registry.queryFilter(initializedFiler);
            expect(events.length).to.equal(1);
            expect(events[0].args.hub).to.equal(ZeroAddress);
            const updatedFiler = registry.filters.HubUpdated;
            const updatedEvents = await registry.queryFilter(updatedFiler);
            expect(updatedEvents.length).to.equal(1);
            expect(updatedEvents[0].args.hub).to.equal(hub.target);
        });

        it("should not allow direct initialization of registry implementation", async () => {
            const {owner, hub} = deployedActors;
            
            const PoseidonT3Factory = await ethers.getContractFactory("PoseidonT3", owner);
            const poseidonT3 = await PoseidonT3Factory.deploy();
            await poseidonT3.waitForDeployment();

            const RegistryFactory = await ethers.getContractFactory(
                "IdentityRegistryImplV1", 
                {
                    libraries: {
                        PoseidonT3: poseidonT3.target
                    }
                },
                owner
            );
            const registryImpl = await RegistryFactory.deploy();

            await expect(
                registryImpl.initialize(hub.target)
            ).to.be.revertedWithCustomError(registryImpl, "InvalidInitialization");
        });
    });

    describe("Hub Initialization", () => {
        it("should initialize hub with correct parameters", async () => {
            const {hub, registry, vcAndDisclose, register, dsc} = deployedActors;
            
            // Check initial state
            expect(await hub.registry()).to.equal(registry.target);
            expect(await hub.vcAndDiscloseCircuitVerifier()).to.equal(vcAndDisclose.target);
            
            // Check verifier mappings
            const registerId = RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096; // Example ID, adjust as needed
            const dscId = DscVerifierId.dsc_rsa_sha256_65537_4096; // Example ID, adjust as needed
            expect(await hub.sigTypeToRegisterCircuitVerifiers(registerId)).to.equal(register.target);
            expect(await hub.sigTypeToDscCircuitVerifiers(dscId)).to.equal(dsc.target);

            // Check event emission
            const filter = hub.filters.HubInitialized;
            const events = await hub.queryFilter(filter);
            expect(events.length).to.equal(1);
            const event = events[0];
            expect(event.args.registry).to.equal(registry.target);
            expect(event.args.vcAndDiscloseCircuitVerifier).to.equal(vcAndDisclose.target);
            // Verify arrays in event match expected values
            expect(event.args.registerCircuitVerifierIds).to.deep.equal([registerId]);
            expect(event.args.registerCircuitVerifiers).to.deep.equal([register.target]);
            expect(event.args.dscCircuitVerifierIds).to.deep.equal([dscId]);
            expect(event.args.dscCircuitVerifiers).to.deep.equal([dsc.target]);
        });

        it("should not allow direct initialization of hub implementation", async () => {
            const {owner, registry, vcAndDisclose} = deployedActors;
            
            const HubFactory = await ethers.getContractFactory("IdentityVerificationHubImplV1", owner);
            const hubImpl = await HubFactory.deploy();

            await expect(
                hubImpl.initialize(
                    registry.target,
                    vcAndDisclose.target,
                    [],
                    [],
                    [],
                    []
                )
            ).to.be.revertedWithCustomError(hubImpl, "InvalidInitialization");
        });

        it("should revert when register circuit verifier arrays length mismatch", async () => {
            const {owner, registry, vcAndDisclose} = deployedActors;
            
            // Deploy new hub implementation
            const HubFactory = await ethers.getContractFactory("IdentityVerificationHubImplV1", owner);
            const hubImpl = await HubFactory.deploy();
            await hubImpl.waitForDeployment();

            // Deploy new hub proxy with mismatched arrays
            const initializeData = hubImpl.interface.encodeFunctionData("initialize", [
                registry.target,
                vcAndDisclose.target,
                [1],
                [], 
                [],
                []
            ]);
            const hubProxyFactory = await ethers.getContractFactory("IdentityVerificationHub", owner);
            
            await expect(
                hubProxyFactory.deploy(hubImpl.target, initializeData)
            ).to.be.revertedWithCustomError(hubImpl, "LENGTH_MISMATCH");
        });

        it("should revert when DSC circuit verifier arrays length mismatch", async () => {
            const {owner, registry, vcAndDisclose} = deployedActors;
            
            // Deploy new hub implementation
            const HubFactory = await ethers.getContractFactory("IdentityVerificationHubImplV1", owner);
            const hubImpl = await HubFactory.deploy();
            await hubImpl.waitForDeployment();

            // Deploy new hub proxy with mismatched arrays
            const initializeData = hubImpl.interface.encodeFunctionData("initialize", [
                registry.target,
                vcAndDisclose.target,
                [],
                [],
                [1],
                [] 
            ]);
            const hubProxyFactory = await ethers.getContractFactory("IdentityVerificationHub", owner);
            
            await expect(
                hubProxyFactory.deploy(hubImpl.target, initializeData)
            ).to.be.revertedWithCustomError(hubImpl, "LENGTH_MISMATCH");
        });
    });

    describe("Cross-contract initialization", () => {
        it("should have consistent addresses between registry and hub", async () => {
            const {hub, registry} = deployedActors;
            
            expect(await registry.hub()).to.equal(hub.target);
            expect(await hub.registry()).to.equal(registry.target);
        });
    });
}); 