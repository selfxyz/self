import { expect } from "chai";
import { ethers } from "hardhat";
import { deploySystemFixtures } from "../utils/deployment";
import { DeployedActors, VcAndDiscloseHubProof } from "../utils/types";
import { generateRandomFieldElement, splitHexFromBack } from "../utils/utils";
import { generateCommitment } from "@selfxyz/common/utils/passports/passport";
import { ATTESTATION_ID } from "../utils/constants";
import { CIRCUIT_CONSTANTS } from "@selfxyz/common/constants/constants";
import { poseidon2 } from "poseidon-lite";
import { generateVcAndDiscloseProof, parseSolidityCalldata } from "../utils/generateProof";
import { Formatter } from "../utils/formatter";
import { formatCountriesList, reverseBytes } from "@selfxyz/common/utils/circuits/formatInputs";
import { stringToBigInt } from "@selfxyz/common/utils/scope";
import { VerifyAll } from "../../typechain-types";
import { getSMTs } from "../utils/generateProof";
import { Groth16Proof, PublicSignals, groth16 } from "snarkjs";
import { VcAndDiscloseProof } from "../utils/types";

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
  let invalidForbiddenCountriesList: string[];
  let forbiddenCountriesListPacked: string[];
  let invalidForbiddenCountriesListPacked: string[];

  before(async () => {
    deployedActors = await deploySystemFixtures();
    const VerifyAllFactory = await ethers.getContractFactory("VerifyAll");
    verifyAll = await VerifyAllFactory.deploy(deployedActors.hub.getAddress(), deployedActors.registry.getAddress());

    registerSecret = generateRandomFieldElement();
    nullifier = generateRandomFieldElement();
    commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, deployedActors.mockPassport);

    const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
    // must be imported dynamic since @openpassport/zk-kit-lean-imt is exclusively esm and hardhat does not support esm with typescript until verison 3
    const LeanIMT = await import("@openpassport/zk-kit-lean-imt").then((mod) => mod.LeanIMT);
    imt = new LeanIMT<bigint>(hashFunction);
    await imt.insert(BigInt(commitment));

    forbiddenCountriesList = [
      "AAA",
      "ABC",
      "CBA",
      "AAA",
      "AAA",
      "ABC",
      "CBA",
      "AAA",
      "ABC",
      "CBA",
      "AAA",
      "ABC",
      "CBA",
      "AAA",
      "ABC",
      "CBA",
      "AAA",
      "ABC",
      "CBA",
      "AAA",
      "ABC",
      "CBA",
      "AAA",
      "ABC",
      "CBA",
      "AAA",
      "ABC",
      "CBA",
      "AAA",
      "ABC",
      "CBA",
      "AAA",
      "ABC",
      "CBA",
      "AAA",
      "ABC",
      "CBA",
      "AAA",
      "ABC",
      "CBA",
    ];
    const wholePacked = reverseBytes(
      Formatter.bytesToHexString(new Uint8Array(formatCountriesList(forbiddenCountriesList))),
    );
    forbiddenCountriesListPacked = splitHexFromBack(wholePacked);

    invalidForbiddenCountriesList = ["AAA", "ABC", "CBA", "CBA"];
    const invalidWholePacked = reverseBytes(
      Formatter.bytesToHexString(new Uint8Array(formatCountriesList(invalidForbiddenCountriesList))),
    );
    invalidForbiddenCountriesListPacked = splitHexFromBack(invalidWholePacked);

    baseVcAndDiscloseProof = await generateVcAndDiscloseProof(
      registerSecret,
      BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
      deployedActors.mockPassport,
      stringToBigInt("test-scope").toString(),
      new Array(88).fill("1"),
      "1",
      imt,
      "20",
      undefined,
      undefined,
      undefined,
      undefined,
      forbiddenCountriesList,
      await deployedActors.user1.getAddress(),
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
      const { registry, owner } = deployedActors;

      const tx = await registry
        .connect(owner)
        .devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);
      const receipt = (await tx.wait()) as any;
      const timestamp = (await ethers.provider.getBlock(receipt.blockNumber))!.timestamp;

      const vcAndDiscloseHubProof: VcAndDiscloseHubProof = {
        olderThanEnabled: true,
        olderThan: "20",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked,
        ofacEnabled: [true, true, true],
        vcAndDiscloseProof: vcAndDiscloseProof,
      };

      const types = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]; // Example types
      const [readableData, success] = await verifyAll.verifyAll(timestamp, vcAndDiscloseHubProof, types);

      expect(success).to.be.true;
      expect(readableData.name).to.not.be.empty;
    });

    it("should verify and get result successfully with out timestamp verification", async () => {
      const { registry, owner } = deployedActors;

      await registry.connect(owner).devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);
      const vcAndDiscloseHubProof: VcAndDiscloseHubProof = {
        olderThanEnabled: true,
        olderThan: "20",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked,
        ofacEnabled: [true, true, true],
        vcAndDiscloseProof: vcAndDiscloseProof,
      };

      const types = ["0", "1", "2"]; // Example types
      const [readableData, success] = await verifyAll.verifyAll(0, vcAndDiscloseHubProof, types);

      expect(success).to.be.true;
      expect(readableData.name).to.not.be.empty;
    });

    it("should return empty result when verification fails", async () => {
      const { registry, owner } = deployedActors;

      await registry.connect(owner).devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);

      vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_MERKLE_ROOT_INDEX] = generateRandomFieldElement();
      const vcAndDiscloseHubProof: VcAndDiscloseHubProof = {
        olderThanEnabled: true,
        olderThan: "20",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked,
        ofacEnabled: [true, true, true],
        vcAndDiscloseProof: vcAndDiscloseProof,
      };

      const types = ["0", "1", "2"];
      const [readableData, success] = await verifyAll.verifyAll(0, vcAndDiscloseHubProof, types);

      expect(success).to.be.false;
      expect(readableData.name).to.be.empty;
    });

    it("should fail with invalid root timestamp", async () => {
      const { registry, owner } = deployedActors;

      await registry.connect(owner).devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);

      const vcAndDiscloseHubProof: VcAndDiscloseHubProof = {
        olderThanEnabled: true,
        olderThan: "20",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked,
        ofacEnabled: [true, true, true],
        vcAndDiscloseProof: vcAndDiscloseProof,
      };

      const types = ["0", "1", "2"];
      const [readableData, success] = await verifyAll.verifyAll(123456, vcAndDiscloseHubProof, types);

      expect(success).to.be.false;
      expect(readableData.name).to.be.empty;
    });

    describe("Error Handling", () => {
      it("should return error code 'INVALID_VC_AND_DISCLOSE_PROOF' when proof is invalid", async () => {
        const { registry, owner } = deployedActors;
        await registry.connect(owner).devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);

        vcAndDiscloseProof.a[0] = generateRandomFieldElement();

        const vcAndDiscloseHubProof: VcAndDiscloseHubProof = {
          olderThanEnabled: false,
          olderThan: "20",
          forbiddenCountriesEnabled: false,
          forbiddenCountriesListPacked: forbiddenCountriesListPacked,
          ofacEnabled: [false, false, false],
          vcAndDiscloseProof: vcAndDiscloseProof,
        };

        const types = ["0", "1", "2"];
        const [readableData, success, errorCode] = await verifyAll.verifyAll(0, vcAndDiscloseHubProof, types);

        expect(success).to.be.false;
        expect(errorCode).to.equal("INVALID_VC_AND_DISCLOSE_PROOF");
        expect(readableData.name).to.be.empty;
      });

      it("should return error code 'CURRENT_DATE_NOT_IN_VALID_RANGE' when date is invalid", async () => {
        const { registry, owner } = deployedActors;
        await registry.connect(owner).devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);

        vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_CURRENT_DATE_INDEX] = 0;

        const vcAndDiscloseHubProof: VcAndDiscloseHubProof = {
          olderThanEnabled: true,
          olderThan: "20",
          forbiddenCountriesEnabled: true,
          forbiddenCountriesListPacked: forbiddenCountriesListPacked,
          ofacEnabled: [true, true, true],
          vcAndDiscloseProof: vcAndDiscloseProof,
        };

        const types = ["0", "1", "2"];
        const [readableData, success, errorCode] = await verifyAll.verifyAll(0, vcAndDiscloseHubProof, types);

        expect(success).to.be.false;
        expect(errorCode).to.equal("CURRENT_DATE_NOT_IN_VALID_RANGE");
        expect(readableData.name).to.be.empty;
      });

      it("should return error code 'INVALID_OLDER_THAN' when age check fails", async () => {
        const { registry, owner } = deployedActors;
        await registry.connect(owner).devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);

        const vcAndDiscloseHubProof: VcAndDiscloseHubProof = {
          olderThanEnabled: true,
          olderThan: "21", // Higher than the age in proof
          forbiddenCountriesEnabled: false,
          forbiddenCountriesListPacked: forbiddenCountriesListPacked,
          ofacEnabled: [false, false, false],
          vcAndDiscloseProof: vcAndDiscloseProof,
        };

        const types = ["0", "1", "2"];
        const [readableData, success, errorCode] = await verifyAll.verifyAll(0, vcAndDiscloseHubProof, types);

        expect(success).to.be.false;
        expect(errorCode).to.equal("INVALID_OLDER_THAN");
        expect(readableData.name).to.be.empty;
      });

      it("should return error code 'INVALID_OFAC' when OFAC check fails", async () => {
        const { registry, owner } = deployedActors;
        await registry.connect(owner).devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);

        const { passportNo_smt, nameAndDob_smt, nameAndYob_smt } = getSMTs();

        vcAndDiscloseProof = await generateVcAndDiscloseProof(
          registerSecret,
          BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
          deployedActors.mockPassport,
          stringToBigInt("test-scope").toString(),
          new Array(88).fill("1"),
          "1",
          imt,
          "20",
          passportNo_smt,
          nameAndDob_smt,
          nameAndYob_smt,
          "0",
        );

        const vcAndDiscloseHubProof: VcAndDiscloseHubProof = {
          olderThanEnabled: true,
          olderThan: "20",
          forbiddenCountriesEnabled: false,
          forbiddenCountriesListPacked: forbiddenCountriesListPacked,
          ofacEnabled: [true, true, true],
          vcAndDiscloseProof: vcAndDiscloseProof,
        };

        const types = ["0", "1", "2"];
        const [readableData, success, errorCode] = await verifyAll.verifyAll(0, vcAndDiscloseHubProof, types);
        console.log("return values");
        console.log("readable data: ", readableData);
        console.log("success: ", success);
        console.log("errorCode: ", errorCode);

        expect(success).to.be.false;
        expect(errorCode).to.equal("INVALID_OFAC");
        expect(readableData.name).to.be.empty;
      });

      it("should return error code 'INVALID_FORBIDDEN_COUNTRIES' when countries check fails", async () => {
        const { registry, owner } = deployedActors;
        await registry.connect(owner).devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);

        const vcAndDiscloseHubProof: VcAndDiscloseHubProof = {
          olderThanEnabled: true,
          olderThan: "20",
          forbiddenCountriesEnabled: true,
          forbiddenCountriesListPacked: invalidForbiddenCountriesListPacked,
          ofacEnabled: [true, true, true],
          vcAndDiscloseProof: vcAndDiscloseProof,
        };

        const types = ["0", "1", "2"];
        const [readableData, success, errorCode] = await verifyAll.verifyAll(0, vcAndDiscloseHubProof, types);

        expect(success).to.be.false;
        expect(errorCode).to.equal("INVALID_FORBIDDEN_COUNTRIES");
        expect(readableData.name).to.be.empty;
      });

      it("should return error code 'INVALID_TIMESTAMP' when root timestamp doesn't match", async () => {
        const { registry, owner } = deployedActors;
        await registry.connect(owner).devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);

        const vcAndDiscloseHubProof: VcAndDiscloseHubProof = {
          olderThanEnabled: true,
          olderThan: "20",
          forbiddenCountriesEnabled: true,
          forbiddenCountriesListPacked: forbiddenCountriesListPacked,
          ofacEnabled: [true, true, true],
          vcAndDiscloseProof: vcAndDiscloseProof,
        };

        const types = ["0", "1", "2"];
        const [readableData, success, errorCode] = await verifyAll.verifyAll(
          123456, // Invalid timestamp
          vcAndDiscloseHubProof,
          types,
        );

        expect(success).to.be.false;
        expect(errorCode).to.equal("INVALID_TIMESTAMP");
        expect(readableData.name).to.be.empty;
      });

      it("should return error code 'INVALID_OFAC_ROOT' when passport number OFAC root is invalid", async () => {
        const { registry, owner } = deployedActors;
        await registry.connect(owner).devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);

        vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_PASSPORT_NO_SMT_ROOT_INDEX] =
          generateRandomFieldElement();

        const vcAndDiscloseHubProof: VcAndDiscloseHubProof = {
          olderThanEnabled: true,
          olderThan: "20",
          forbiddenCountriesEnabled: true,
          forbiddenCountriesListPacked: forbiddenCountriesListPacked,
          ofacEnabled: [true, true, true],
          vcAndDiscloseProof: vcAndDiscloseProof,
        };

        const types = ["0", "1", "2"];
        const [readableData, success, errorCode] = await verifyAll.verifyAll(0, vcAndDiscloseHubProof, types);

        expect(success).to.be.false;
        expect(errorCode).to.equal("INVALID_OFAC_ROOT");
        expect(readableData.name).to.be.empty;
      });

      it("should return error code 'INVALID_OFAC_ROOT' when name and dob OFAC root is invalid", async () => {
        const { registry, owner } = deployedActors;
        await registry.connect(owner).devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);

        vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_NAME_DOB_SMT_ROOT_INDEX] =
          generateRandomFieldElement();

        const vcAndDiscloseHubProof: VcAndDiscloseHubProof = {
          olderThanEnabled: true,
          olderThan: "20",
          forbiddenCountriesEnabled: true,
          forbiddenCountriesListPacked: forbiddenCountriesListPacked,
          ofacEnabled: [false, true, false],
          vcAndDiscloseProof: vcAndDiscloseProof,
        };

        const types = ["0", "1", "2"];
        const [readableData, success, errorCode] = await verifyAll.verifyAll(0, vcAndDiscloseHubProof, types);

        expect(success).to.be.false;
        expect(errorCode).to.equal("INVALID_OFAC_ROOT");
        expect(readableData.name).to.be.empty;
      });

      it("should return error code 'INVALID_OFAC_ROOT' when name and yob OFAC root is invalid", async () => {
        const { registry, owner } = deployedActors;
        await registry.connect(owner).devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);

        vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_NAME_YOB_SMT_ROOT_INDEX] =
          generateRandomFieldElement();

        const vcAndDiscloseHubProof: VcAndDiscloseHubProof = {
          olderThanEnabled: true,
          olderThan: "20",
          forbiddenCountriesEnabled: true,
          forbiddenCountriesListPacked: forbiddenCountriesListPacked,
          ofacEnabled: [false, false, true],
          vcAndDiscloseProof: vcAndDiscloseProof,
        };

        const types = ["0", "1", "2"];
        const [readableData, success, errorCode] = await verifyAll.verifyAll(0, vcAndDiscloseHubProof, types);

        expect(success).to.be.false;
        expect(errorCode).to.equal("INVALID_OFAC_ROOT");
        expect(readableData.name).to.be.empty;
      });
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
      await expect(verifyAll.connect(deployedActors.user1).setHub(newHubAddress)).to.be.revertedWithCustomError(
        verifyAll,
        "AccessControlUnauthorizedAccount",
      );
    });

    it("should not allow non-owner to set new registry address", async () => {
      const newRegistryAddress = await deployedActors.user1.getAddress();
      await expect(
        verifyAll.connect(deployedActors.user1).setRegistry(newRegistryAddress),
      ).to.be.revertedWithCustomError(verifyAll, "AccessControlUnauthorizedAccount");
    });
  });

  describe("VerifyAll (Custom Error Handling)", () => {
    it("should return error code 'INVALID_VC_AND_DISCLOSE_PROOF' when vcAndDisclose proof is invalid", async () => {
      const { registry, owner } = deployedActors;
      await registry.connect(owner).devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);

      vcAndDiscloseProof.a[0] = generateRandomFieldElement();

      const vcAndDiscloseHubProof: VcAndDiscloseHubProof = {
        olderThanEnabled: true,
        olderThan: "20",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked,
        ofacEnabled: [true, true, true],
        vcAndDiscloseProof: vcAndDiscloseProof,
      };

      const types = ["0", "1", "2"];
      const [readableData, success, errorCode] = await verifyAll.verifyAll(0, vcAndDiscloseHubProof, types);

      expect(success).to.be.false;
      expect(errorCode).to.equal("INVALID_VC_AND_DISCLOSE_PROOF");
      expect(readableData.name).to.be.empty;
    });

    it("should return error code 'CURRENT_DATE_NOT_IN_VALID_RANGE' when current date is out of range", async () => {
      const { registry, owner } = deployedActors;
      await registry.connect(owner).devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);

      vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_CURRENT_DATE_INDEX] = 0;

      const vcAndDiscloseHubProof: VcAndDiscloseHubProof = {
        olderThanEnabled: true,
        olderThan: "20",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked,
        ofacEnabled: [true, true, true],
        vcAndDiscloseProof: vcAndDiscloseProof,
      };

      const types = ["0", "1", "2"];
      const [readableData, success, errorCode] = await verifyAll.verifyAll(0, vcAndDiscloseHubProof, types);

      expect(success).to.be.false;
      expect(errorCode).to.equal("CURRENT_DATE_NOT_IN_VALID_RANGE");
      expect(readableData.name).to.be.empty;
    });
  });
});
