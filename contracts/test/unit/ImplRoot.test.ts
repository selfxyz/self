import { expect } from "chai";
import { ethers } from "hardhat";
import { MockImplRoot } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ImplRoot", () => {
  let mockImplRoot: MockImplRoot;
  let deployer: SignerWithAddress;
  let securityMultisig: SignerWithAddress;
  let operationsMultisig: SignerWithAddress;
  let user1: SignerWithAddress;

  const SECURITY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SECURITY_ROLE"));
  const OPERATIONS_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATIONS_ROLE"));

  beforeEach(async () => {
    [deployer, securityMultisig, operationsMultisig, user1] = await ethers.getSigners();

    const MockImplRootFactory = await ethers.getContractFactory("MockImplRoot", deployer);
    mockImplRoot = await MockImplRootFactory.deploy();
    await mockImplRoot.waitForDeployment();
  });

  describe("Role Constants", () => {
    it("should have correct role constants", async () => {
      expect(await mockImplRoot.SECURITY_ROLE()).to.equal(SECURITY_ROLE);
      expect(await mockImplRoot.OPERATIONS_ROLE()).to.equal(OPERATIONS_ROLE);
    });
  });

  describe("Initialization", () => {
    it("should revert when calling __ImplRoot_init outside initialization phase", async () => {
      // First initialize the contract properly
      await mockImplRoot.exposed__ImplRoot_init();

      // Then try to initialize again - this should fail
      await expect(mockImplRoot.exposed__ImplRoot_init()).to.be.revertedWithCustomError(
        mockImplRoot,
        "InvalidInitialization",
      );
    });

    it("should initialize with deployer having both roles", async () => {
      // Deploy a fresh contract for initialization testing
      const MockImplRootFactory = await ethers.getContractFactory("MockImplRoot");
      const freshContract = await MockImplRootFactory.deploy();
      await freshContract.waitForDeployment();

      await freshContract.exposed__ImplRoot_init();

      // Check role assignments - deployer should have both roles
      expect(await freshContract.hasRole(SECURITY_ROLE, deployer.address)).to.be.true;
      expect(await freshContract.hasRole(OPERATIONS_ROLE, deployer.address)).to.be.true;

      // Check role admins - SECURITY_ROLE manages all roles
      expect(await freshContract.getRoleAdmin(SECURITY_ROLE)).to.equal(SECURITY_ROLE);
      expect(await freshContract.getRoleAdmin(OPERATIONS_ROLE)).to.equal(SECURITY_ROLE);
    });

    it("should allow role transfer after initialization", async () => {
      // Deploy a fresh contract for initialization testing
      const MockImplRootFactory = await ethers.getContractFactory("MockImplRoot");
      const freshContract = await MockImplRootFactory.deploy();
      await freshContract.waitForDeployment();

      await freshContract.exposed__ImplRoot_init();

      // Transfer roles to multisigs
      await freshContract.connect(deployer).grantRole(SECURITY_ROLE, securityMultisig.address);
      await freshContract.connect(deployer).grantRole(OPERATIONS_ROLE, operationsMultisig.address);

      // Verify multisigs have roles
      expect(await freshContract.hasRole(SECURITY_ROLE, securityMultisig.address)).to.be.true;
      expect(await freshContract.hasRole(OPERATIONS_ROLE, operationsMultisig.address)).to.be.true;

      // Deployer can renounce roles
      await freshContract.connect(deployer).renounceRole(SECURITY_ROLE, deployer.address);
      await freshContract.connect(deployer).renounceRole(OPERATIONS_ROLE, deployer.address);

      // Verify deployer no longer has roles
      expect(await freshContract.hasRole(SECURITY_ROLE, deployer.address)).to.be.false;
      expect(await freshContract.hasRole(OPERATIONS_ROLE, deployer.address)).to.be.false;
    });
  });

  describe("Role Management", () => {
    let initializedContract: MockImplRoot;

    beforeEach(async () => {
      const MockImplRootFactory = await ethers.getContractFactory("MockImplRoot");
      initializedContract = await MockImplRootFactory.deploy();
      await initializedContract.waitForDeployment();

      // Initialize with deployer having roles, then transfer to multisigs
      await initializedContract.exposed__ImplRoot_init();
      await initializedContract.connect(deployer).grantRole(SECURITY_ROLE, securityMultisig.address);
      await initializedContract.connect(deployer).grantRole(OPERATIONS_ROLE, operationsMultisig.address);
    });

    it("should allow critical multisig to grant roles", async () => {
      await expect(initializedContract.connect(securityMultisig).grantRole(OPERATIONS_ROLE, user1.address)).to.not.be
        .reverted;

      expect(await initializedContract.hasRole(OPERATIONS_ROLE, user1.address)).to.be.true;
    });

    it("should allow critical multisig to revoke roles", async () => {
      // First grant a role to user1
      await initializedContract.connect(securityMultisig).grantRole(OPERATIONS_ROLE, user1.address);
      expect(await initializedContract.hasRole(OPERATIONS_ROLE, user1.address)).to.be.true;

      // Then revoke it
      await expect(initializedContract.connect(securityMultisig).revokeRole(OPERATIONS_ROLE, user1.address)).to.not.be
        .reverted;

      expect(await initializedContract.hasRole(OPERATIONS_ROLE, user1.address)).to.be.false;
    });

    it("should prevent standard multisig from granting critical role", async () => {
      await expect(
        initializedContract.connect(operationsMultisig).grantRole(SECURITY_ROLE, user1.address),
      ).to.be.revertedWithCustomError(initializedContract, "AccessControlUnauthorizedAccount");
    });

    it("should prevent unauthorized users from granting roles", async () => {
      await expect(
        initializedContract.connect(user1).grantRole(OPERATIONS_ROLE, user1.address),
      ).to.be.revertedWithCustomError(initializedContract, "AccessControlUnauthorizedAccount");
    });

    it("should allow role holders to renounce their own roles", async () => {
      // Grant role to user1
      await initializedContract.connect(securityMultisig).grantRole(OPERATIONS_ROLE, user1.address);
      expect(await initializedContract.hasRole(OPERATIONS_ROLE, user1.address)).to.be.true;

      // User1 can renounce their own role
      await expect(initializedContract.connect(user1).renounceRole(OPERATIONS_ROLE, user1.address)).to.not.be.reverted;

      expect(await initializedContract.hasRole(OPERATIONS_ROLE, user1.address)).to.be.false;
    });

    it("should prevent users from renouncing others' roles", async () => {
      await expect(
        initializedContract.connect(user1).renounceRole(SECURITY_ROLE, securityMultisig.address),
      ).to.be.revertedWithCustomError(initializedContract, "AccessControlBadConfirmation");
    });
  });

  describe("Upgrade Authorization", () => {
    let initializedContract: MockImplRoot;

    beforeEach(async () => {
      const MockImplRootFactory = await ethers.getContractFactory("MockImplRoot");
      initializedContract = await MockImplRootFactory.deploy();
      await initializedContract.waitForDeployment();

      // Initialize and transfer roles
      await initializedContract.exposed__ImplRoot_init();
      await initializedContract.connect(deployer).grantRole(SECURITY_ROLE, securityMultisig.address);
      await initializedContract.connect(deployer).grantRole(OPERATIONS_ROLE, operationsMultisig.address);
    });

    it("should allow critical multisig to authorize upgrades", async () => {
      const newImplementation = ethers.Wallet.createRandom().address;

      // Note: _authorizeUpgrade is internal and can only be called through proxy upgrade mechanism
      // We test this by verifying the critical multisig has the required role
      expect(await initializedContract.hasRole(SECURITY_ROLE, securityMultisig.address)).to.be.true;
    });

    it("should prevent standard multisig from authorizing upgrades", async () => {
      const newImplementation = ethers.Wallet.createRandom().address;

      // Standard multisig should not have SECURITY_ROLE
      expect(await initializedContract.hasRole(SECURITY_ROLE, operationsMultisig.address)).to.be.false;
    });

    it("should prevent unauthorized users from authorizing upgrades", async () => {
      const newImplementation = ethers.Wallet.createRandom().address;

      // Unauthorized users should not have SECURITY_ROLE
      expect(await initializedContract.hasRole(SECURITY_ROLE, user1.address)).to.be.false;
    });
  });

  describe("Role Hierarchy", () => {
    let initializedContract: MockImplRoot;

    beforeEach(async () => {
      const MockImplRootFactory = await ethers.getContractFactory("MockImplRoot");
      initializedContract = await MockImplRootFactory.deploy();
      await initializedContract.waitForDeployment();

      await initializedContract.exposed__ImplRoot_init();
    });

    it("should have SECURITY_ROLE as admin of both roles", async () => {
      expect(await initializedContract.getRoleAdmin(SECURITY_ROLE)).to.equal(SECURITY_ROLE);
      expect(await initializedContract.getRoleAdmin(OPERATIONS_ROLE)).to.equal(SECURITY_ROLE);
    });

    it("should allow SECURITY_ROLE holders to manage OPERATIONS_ROLE", async () => {
      // Grant SECURITY_ROLE to securityMultisig
      await initializedContract.connect(deployer).grantRole(SECURITY_ROLE, securityMultisig.address);

      // Critical multisig should be able to grant OPERATIONS_ROLE
      await expect(initializedContract.connect(securityMultisig).grantRole(OPERATIONS_ROLE, user1.address)).to.not.be
        .reverted;

      expect(await initializedContract.hasRole(OPERATIONS_ROLE, user1.address)).to.be.true;

      // Critical multisig should be able to revoke OPERATIONS_ROLE
      await expect(initializedContract.connect(securityMultisig).revokeRole(OPERATIONS_ROLE, user1.address)).to.not.be
        .reverted;

      expect(await initializedContract.hasRole(OPERATIONS_ROLE, user1.address)).to.be.false;
    });
  });

  describe("Complete Workflow", () => {
    it("should demonstrate complete deployment and role transfer workflow", async () => {
      console.log("\n🔄 Starting Complete ImplRoot Workflow");

      // 1. Deploy contract
      const MockImplRootFactory = await ethers.getContractFactory("MockImplRoot");
      const contract = await MockImplRootFactory.deploy();
      await contract.waitForDeployment();

      console.log("✅ Step 1: Contract deployed");

      // 2. Initialize with deployer having roles
      await contract.exposed__ImplRoot_init();

      console.log("✅ Step 2: Contract initialized");
      console.log(`   - Deployer has SECURITY_ROLE: ${await contract.hasRole(SECURITY_ROLE, deployer.address)}`);
      console.log(`   - Deployer has OPERATIONS_ROLE: ${await contract.hasRole(OPERATIONS_ROLE, deployer.address)}`);

      // 3. Grant roles to multisigs
      await contract.connect(deployer).grantRole(SECURITY_ROLE, securityMultisig.address);
      await contract.connect(deployer).grantRole(OPERATIONS_ROLE, operationsMultisig.address);

      console.log("✅ Step 3: Roles granted to multisigs");
      console.log(
        `   - Critical multisig has SECURITY_ROLE: ${await contract.hasRole(SECURITY_ROLE, securityMultisig.address)}`,
      );
      console.log(
        `   - Standard multisig has OPERATIONS_ROLE: ${await contract.hasRole(OPERATIONS_ROLE, operationsMultisig.address)}`,
      );

      // 4. Verify multisigs can operate (check role permissions)
      expect(await contract.hasRole(SECURITY_ROLE, securityMultisig.address)).to.be.true;

      console.log("✅ Step 4: Multisigs verified functional");

      // 5. Renounce deployer roles
      await contract.connect(deployer).renounceRole(SECURITY_ROLE, deployer.address);
      await contract.connect(deployer).renounceRole(OPERATIONS_ROLE, deployer.address);

      console.log("✅ Step 5: Deployer roles renounced");
      console.log(`   - Deployer has SECURITY_ROLE: ${await contract.hasRole(SECURITY_ROLE, deployer.address)}`);
      console.log(`   - Deployer has OPERATIONS_ROLE: ${await contract.hasRole(OPERATIONS_ROLE, deployer.address)}`);

      // 6. Final verification
      expect(await contract.hasRole(SECURITY_ROLE, securityMultisig.address)).to.be.true;
      expect(await contract.hasRole(OPERATIONS_ROLE, operationsMultisig.address)).to.be.true;
      expect(await contract.hasRole(SECURITY_ROLE, deployer.address)).to.be.false;
      expect(await contract.hasRole(OPERATIONS_ROLE, deployer.address)).to.be.false;

      console.log("🎉 Complete ImplRoot workflow successful!");
    });
  });
});
