import { ethers } from "hardhat";
import { expect } from "chai";

/**
 * Lightweight deployment of just the 4 registry proxies — no verifiers,
 * no hub, no staging artifacts required.
 */
async function deployRegistries() {
  const [owner] = await ethers.getSigners();

  // Deploy PoseidonT3 (required by all registries)
  const poseidonT3 = await (await ethers.getContractFactory("PoseidonT3")).connect(owner).deploy();
  await poseidonT3.waitForDeployment();

  // Deploy PCR0Manager (required by KYC init)
  const pcr0Manager = await (await ethers.getContractFactory("PCR0Manager")).connect(owner).deploy();
  await pcr0Manager.waitForDeployment();

  const libs = { libraries: { PoseidonT3: poseidonT3.target } };
  const temporaryHubAddress = "0x0000000000000000000000000000000000000000";

  // Helper: deploy impl + proxy, return proxy with impl ABI
  async function deployRegistry(implName: string, initArgs: any[]) {
    const ImplFactory = await ethers.getContractFactory(implName, libs);
    const impl = await ImplFactory.connect(owner).deploy();
    await impl.waitForDeployment();

    const initData = impl.interface.encodeFunctionData("initialize", initArgs);
    const ProxyFactory = await ethers.getContractFactory("IdentityRegistry");
    const proxy = await ProxyFactory.connect(owner).deploy(impl.target, initData);
    await proxy.waitForDeployment();

    return ethers.getContractAt(implName, proxy.target);
  }

  const registry = await deployRegistry("IdentityRegistryImplV1", [temporaryHubAddress]);
  const registryId = await deployRegistry("IdentityRegistryIdCardImplV1", [temporaryHubAddress]);
  const registryAadhaar = await deployRegistry("IdentityRegistryAadhaarImplV1", [temporaryHubAddress]);
  const registryKyc = await deployRegistry("IdentityRegistryKycImplV1", [temporaryHubAddress, pcr0Manager.target]);

  return { registry, registryId, registryAadhaar, registryKyc, owner };
}

describe("OFAC Rolling Root Window test", function () {
  this.timeout(0);

  let registry: any;
  let registryId: any;
  let registryAadhaar: any;
  let registryKyc: any;

  const ROOT_A_DOB = 1000n;
  const ROOT_A_YOB = 2000n;
  const ROOT_A_PASSPORT = 3000n;

  const ROOT_B_DOB = 4000n;
  const ROOT_B_YOB = 5000n;
  const ROOT_B_PASSPORT = 6000n;

  const ROOT_C_DOB = 7000n;
  const ROOT_C_YOB = 8000n;
  const ROOT_C_PASSPORT = 9000n;

  before(async () => {
    const d = await deployRegistries();
    registry = d.registry;
    registryId = d.registryId;
    registryAadhaar = d.registryAadhaar;
    registryKyc = d.registryKyc;
  });

  // ──────────────────────────────────────────────────────────
  // KYC Registry (2 roots: nameAndDob, nameAndYob)
  // ──────────────────────────────────────────────────────────
  describe("KYC Registry", () => {
    let snapshotId: string;

    beforeEach(async () => {
      snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    afterEach(async () => {
      await ethers.provider.send("evm_revert", [snapshotId]);
    });

    it("should accept current roots", async () => {
      await registryKyc.updateNameAndDobOfacRoot(ROOT_A_DOB);
      await registryKyc.updateNameAndYobOfacRoot(ROOT_A_YOB);

      expect(await registryKyc.checkOfacRoots(ROOT_A_DOB, ROOT_A_YOB)).to.be.true;
    });

    it("should accept previous roots after one update", async () => {
      await registryKyc.updateNameAndDobOfacRoot(ROOT_A_DOB);
      await registryKyc.updateNameAndYobOfacRoot(ROOT_A_YOB);

      await registryKyc.updateNameAndDobOfacRoot(ROOT_B_DOB);
      await registryKyc.updateNameAndYobOfacRoot(ROOT_B_YOB);

      // Current
      expect(await registryKyc.checkOfacRoots(ROOT_B_DOB, ROOT_B_YOB)).to.be.true;
      // Previous (rolling window)
      expect(await registryKyc.checkOfacRoots(ROOT_A_DOB, ROOT_A_YOB)).to.be.true;
      // Mixed current+previous
      expect(await registryKyc.checkOfacRoots(ROOT_A_DOB, ROOT_B_YOB)).to.be.true;
      expect(await registryKyc.checkOfacRoots(ROOT_B_DOB, ROOT_A_YOB)).to.be.true;
    });

    it("should reject roots from 2 updates ago (window = 1)", async () => {
      await registryKyc.updateNameAndDobOfacRoot(ROOT_A_DOB);
      await registryKyc.updateNameAndYobOfacRoot(ROOT_A_YOB);

      await registryKyc.updateNameAndDobOfacRoot(ROOT_B_DOB);
      await registryKyc.updateNameAndYobOfacRoot(ROOT_B_YOB);

      await registryKyc.updateNameAndDobOfacRoot(ROOT_C_DOB);
      await registryKyc.updateNameAndYobOfacRoot(ROOT_C_YOB);

      expect(await registryKyc.checkOfacRoots(ROOT_C_DOB, ROOT_C_YOB)).to.be.true;
      expect(await registryKyc.checkOfacRoots(ROOT_B_DOB, ROOT_B_YOB)).to.be.true;
      expect(await registryKyc.checkOfacRoots(ROOT_A_DOB, ROOT_A_YOB)).to.be.false;
    });

    it("should store previous root correctly via getters", async () => {
      await registryKyc.updateNameAndDobOfacRoot(ROOT_A_DOB);
      await registryKyc.updateNameAndYobOfacRoot(ROOT_A_YOB);

      expect(await registryKyc.getPrevNameAndDobOfacRoot()).to.equal(0n);
      expect(await registryKyc.getPrevNameAndYobOfacRoot()).to.equal(0n);

      await registryKyc.updateNameAndDobOfacRoot(ROOT_B_DOB);
      await registryKyc.updateNameAndYobOfacRoot(ROOT_B_YOB);

      expect(await registryKyc.getPrevNameAndDobOfacRoot()).to.equal(ROOT_A_DOB);
      expect(await registryKyc.getPrevNameAndYobOfacRoot()).to.equal(ROOT_A_YOB);
      expect(await registryKyc.getNameAndDobOfacRoot()).to.equal(ROOT_B_DOB);
      expect(await registryKyc.getNameAndYobOfacRoot()).to.equal(ROOT_B_YOB);
    });

    it("should reject random roots", async () => {
      await registryKyc.updateNameAndDobOfacRoot(ROOT_A_DOB);
      await registryKyc.updateNameAndYobOfacRoot(ROOT_A_YOB);
      expect(await registryKyc.checkOfacRoots(99999n, 88888n)).to.be.false;
    });
  });

  // ──────────────────────────────────────────────────────────
  // Passport Registry (3 roots)
  // ──────────────────────────────────────────────────────────
  describe("Passport Registry", () => {
    let snapshotId: string;

    beforeEach(async () => {
      snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    afterEach(async () => {
      await ethers.provider.send("evm_revert", [snapshotId]);
    });

    it("should accept current roots", async () => {
      await registry.updatePassportNoOfacRoot(ROOT_A_PASSPORT);
      await registry.updateNameAndDobOfacRoot(ROOT_A_DOB);
      await registry.updateNameAndYobOfacRoot(ROOT_A_YOB);

      expect(await registry.checkOfacRoots(ROOT_A_PASSPORT, ROOT_A_DOB, ROOT_A_YOB)).to.be.true;
    });

    it("should accept previous roots after one update", async () => {
      await registry.updatePassportNoOfacRoot(ROOT_A_PASSPORT);
      await registry.updateNameAndDobOfacRoot(ROOT_A_DOB);
      await registry.updateNameAndYobOfacRoot(ROOT_A_YOB);

      await registry.updatePassportNoOfacRoot(ROOT_B_PASSPORT);
      await registry.updateNameAndDobOfacRoot(ROOT_B_DOB);
      await registry.updateNameAndYobOfacRoot(ROOT_B_YOB);

      expect(await registry.checkOfacRoots(ROOT_B_PASSPORT, ROOT_B_DOB, ROOT_B_YOB)).to.be.true;
      expect(await registry.checkOfacRoots(ROOT_A_PASSPORT, ROOT_A_DOB, ROOT_A_YOB)).to.be.true;
      // Mixed
      expect(await registry.checkOfacRoots(ROOT_A_PASSPORT, ROOT_B_DOB, ROOT_B_YOB)).to.be.true;
    });

    it("should reject roots from 2 updates ago (window = 1)", async () => {
      await registry.updatePassportNoOfacRoot(ROOT_A_PASSPORT);
      await registry.updateNameAndDobOfacRoot(ROOT_A_DOB);
      await registry.updateNameAndYobOfacRoot(ROOT_A_YOB);

      await registry.updatePassportNoOfacRoot(ROOT_B_PASSPORT);
      await registry.updateNameAndDobOfacRoot(ROOT_B_DOB);
      await registry.updateNameAndYobOfacRoot(ROOT_B_YOB);

      await registry.updatePassportNoOfacRoot(ROOT_C_PASSPORT);
      await registry.updateNameAndDobOfacRoot(ROOT_C_DOB);
      await registry.updateNameAndYobOfacRoot(ROOT_C_YOB);

      expect(await registry.checkOfacRoots(ROOT_C_PASSPORT, ROOT_C_DOB, ROOT_C_YOB)).to.be.true;
      expect(await registry.checkOfacRoots(ROOT_B_PASSPORT, ROOT_B_DOB, ROOT_B_YOB)).to.be.true;
      expect(await registry.checkOfacRoots(ROOT_A_PASSPORT, ROOT_A_DOB, ROOT_A_YOB)).to.be.false;
    });

    it("should store previous roots correctly via getters", async () => {
      await registry.updatePassportNoOfacRoot(ROOT_A_PASSPORT);
      await registry.updateNameAndDobOfacRoot(ROOT_A_DOB);
      await registry.updateNameAndYobOfacRoot(ROOT_A_YOB);

      await registry.updatePassportNoOfacRoot(ROOT_B_PASSPORT);
      await registry.updateNameAndDobOfacRoot(ROOT_B_DOB);
      await registry.updateNameAndYobOfacRoot(ROOT_B_YOB);

      expect(await registry.getPrevPassportNoOfacRoot()).to.equal(ROOT_A_PASSPORT);
      expect(await registry.getPrevNameAndDobOfacRoot()).to.equal(ROOT_A_DOB);
      expect(await registry.getPrevNameAndYobOfacRoot()).to.equal(ROOT_A_YOB);
    });
  });

  // ──────────────────────────────────────────────────────────
  // ID Card Registry (2 roots)
  // ──────────────────────────────────────────────────────────
  describe("ID Card Registry", () => {
    let snapshotId: string;

    beforeEach(async () => {
      snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    afterEach(async () => {
      await ethers.provider.send("evm_revert", [snapshotId]);
    });

    it("should accept current roots", async () => {
      await registryId.updateNameAndDobOfacRoot(ROOT_A_DOB);
      await registryId.updateNameAndYobOfacRoot(ROOT_A_YOB);
      expect(await registryId.checkOfacRoots(ROOT_A_DOB, ROOT_A_YOB)).to.be.true;
    });

    it("should accept previous roots after one update", async () => {
      await registryId.updateNameAndDobOfacRoot(ROOT_A_DOB);
      await registryId.updateNameAndYobOfacRoot(ROOT_A_YOB);

      await registryId.updateNameAndDobOfacRoot(ROOT_B_DOB);
      await registryId.updateNameAndYobOfacRoot(ROOT_B_YOB);

      expect(await registryId.checkOfacRoots(ROOT_B_DOB, ROOT_B_YOB)).to.be.true;
      expect(await registryId.checkOfacRoots(ROOT_A_DOB, ROOT_A_YOB)).to.be.true;
    });

    it("should reject roots from 2 updates ago", async () => {
      await registryId.updateNameAndDobOfacRoot(ROOT_A_DOB);
      await registryId.updateNameAndYobOfacRoot(ROOT_A_YOB);

      await registryId.updateNameAndDobOfacRoot(ROOT_B_DOB);
      await registryId.updateNameAndYobOfacRoot(ROOT_B_YOB);

      await registryId.updateNameAndDobOfacRoot(ROOT_C_DOB);
      await registryId.updateNameAndYobOfacRoot(ROOT_C_YOB);

      expect(await registryId.checkOfacRoots(ROOT_C_DOB, ROOT_C_YOB)).to.be.true;
      expect(await registryId.checkOfacRoots(ROOT_B_DOB, ROOT_B_YOB)).to.be.true;
      expect(await registryId.checkOfacRoots(ROOT_A_DOB, ROOT_A_YOB)).to.be.false;
    });

    it("should store previous roots correctly via getters", async () => {
      await registryId.updateNameAndDobOfacRoot(ROOT_A_DOB);
      await registryId.updateNameAndYobOfacRoot(ROOT_A_YOB);

      await registryId.updateNameAndDobOfacRoot(ROOT_B_DOB);
      await registryId.updateNameAndYobOfacRoot(ROOT_B_YOB);

      expect(await registryId.getPrevNameAndDobOfacRoot()).to.equal(ROOT_A_DOB);
      expect(await registryId.getPrevNameAndYobOfacRoot()).to.equal(ROOT_A_YOB);
    });
  });

  // ──────────────────────────────────────────────────────────
  // Aadhaar Registry (2 roots)
  // ──────────────────────────────────────────────────────────
  describe("Aadhaar Registry", () => {
    let snapshotId: string;

    beforeEach(async () => {
      snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    afterEach(async () => {
      await ethers.provider.send("evm_revert", [snapshotId]);
    });

    it("should accept current roots", async () => {
      await registryAadhaar.updateNameAndDobOfacRoot(ROOT_A_DOB);
      await registryAadhaar.updateNameAndYobOfacRoot(ROOT_A_YOB);
      expect(await registryAadhaar.checkOfacRoots(ROOT_A_DOB, ROOT_A_YOB)).to.be.true;
    });

    it("should accept previous roots after one update", async () => {
      await registryAadhaar.updateNameAndDobOfacRoot(ROOT_A_DOB);
      await registryAadhaar.updateNameAndYobOfacRoot(ROOT_A_YOB);

      await registryAadhaar.updateNameAndDobOfacRoot(ROOT_B_DOB);
      await registryAadhaar.updateNameAndYobOfacRoot(ROOT_B_YOB);

      expect(await registryAadhaar.checkOfacRoots(ROOT_B_DOB, ROOT_B_YOB)).to.be.true;
      expect(await registryAadhaar.checkOfacRoots(ROOT_A_DOB, ROOT_A_YOB)).to.be.true;
    });

    it("should reject roots from 2 updates ago", async () => {
      await registryAadhaar.updateNameAndDobOfacRoot(ROOT_A_DOB);
      await registryAadhaar.updateNameAndYobOfacRoot(ROOT_A_YOB);

      await registryAadhaar.updateNameAndDobOfacRoot(ROOT_B_DOB);
      await registryAadhaar.updateNameAndYobOfacRoot(ROOT_B_YOB);

      await registryAadhaar.updateNameAndDobOfacRoot(ROOT_C_DOB);
      await registryAadhaar.updateNameAndYobOfacRoot(ROOT_C_YOB);

      expect(await registryAadhaar.checkOfacRoots(ROOT_C_DOB, ROOT_C_YOB)).to.be.true;
      expect(await registryAadhaar.checkOfacRoots(ROOT_B_DOB, ROOT_B_YOB)).to.be.true;
      expect(await registryAadhaar.checkOfacRoots(ROOT_A_DOB, ROOT_A_YOB)).to.be.false;
    });

    it("should store previous roots correctly via getters", async () => {
      await registryAadhaar.updateNameAndDobOfacRoot(ROOT_A_DOB);
      await registryAadhaar.updateNameAndYobOfacRoot(ROOT_A_YOB);

      await registryAadhaar.updateNameAndDobOfacRoot(ROOT_B_DOB);
      await registryAadhaar.updateNameAndYobOfacRoot(ROOT_B_YOB);

      expect(await registryAadhaar.getPrevNameAndDobOfacRoot()).to.equal(ROOT_A_DOB);
      expect(await registryAadhaar.getPrevNameAndYobOfacRoot()).to.equal(ROOT_A_YOB);
    });
  });
});
