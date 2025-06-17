import { expect } from "chai";
import { ethers } from "hardhat";
import { TestGenericFormatter } from "../../typechain-types";
import type { SelfStructs } from "../../typechain-types/contracts/tests/testGenericFormatter.sol/TestGenericFormatter";

describe("GenericFormatter", function () {
  let testGenericFormatter: TestGenericFormatter;

  before(async function () {
    const TestGenericFormatterFactory = await ethers.getContractFactory("TestGenericFormatter");
    testGenericFormatter = await TestGenericFormatterFactory.deploy();
    await testGenericFormatter.waitForDeployment();
  });

  it("should convert from v1 to the latest config struct", async function () {
    // Create a sample VerificationConfigV1 struct
    const verificationConfigV1: SelfStructs.VerificationConfigV1Struct = {
      olderThanEnabled: true,
      olderThan: 18,
      forbiddenCountriesEnabled: false,
      forbiddenCountriesListPacked: [0n, 0n, 0n, 0n],
      ofacEnabled: [false, false, false],
    };

    const verificationConfigV2 = await testGenericFormatter.testFromV1Config(verificationConfigV1);

    // Add your assertions here
    expect(verificationConfigV2.olderThanEnabled).to.equal(verificationConfigV1.olderThanEnabled);
    expect(verificationConfigV2.olderThan).to.equal(verificationConfigV1.olderThan);
    expect(verificationConfigV2.forbiddenCountriesEnabled).to.equal(verificationConfigV1.forbiddenCountriesEnabled);
    expect(verificationConfigV2.forbiddenCountriesListPacked).to.deep.equal(
      verificationConfigV1.forbiddenCountriesListPacked,
    );
    expect(verificationConfigV2.ofacEnabled).to.deep.equal(verificationConfigV1.ofacEnabled);
  });

  it("should convert from bytes to the latest config struct", async function () {
    // Create a sample VerificationConfigV2 struct
    const verificationConfigV2: SelfStructs.VerificationConfigV2Struct = {
      olderThanEnabled: true,
      olderThan: 18,
      forbiddenCountriesEnabled: false,
      forbiddenCountriesListPacked: [0n, 0n, 0n, 0n],
      ofacEnabled: [false, false, false],
    };

    //abi encode the verificationConfigV2 struct
    const verificationConfigV2Bytes = ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(bool,uint256,bool,uint256[4],bool[3])"],
      [
        [
          verificationConfigV2.olderThanEnabled,
          verificationConfigV2.olderThan,
          verificationConfigV2.forbiddenCountriesEnabled,
          verificationConfigV2.forbiddenCountriesListPacked,
          verificationConfigV2.ofacEnabled,
        ],
      ],
    );

    const verificationConfigV2BytesDecoded =
      await testGenericFormatter.testVerificationConfigFromBytes(verificationConfigV2Bytes);

    // Add your assertions here
    expect(verificationConfigV2BytesDecoded.olderThanEnabled).to.equal(verificationConfigV2.olderThanEnabled);
    expect(verificationConfigV2BytesDecoded.olderThan).to.equal(verificationConfigV2.olderThan);
    expect(verificationConfigV2BytesDecoded.forbiddenCountriesEnabled).to.equal(
      verificationConfigV2.forbiddenCountriesEnabled,
    );
    expect(verificationConfigV2BytesDecoded.forbiddenCountriesListPacked).to.deep.equal(
      verificationConfigV2.forbiddenCountriesListPacked,
    );
    expect(verificationConfigV2BytesDecoded.ofacEnabled).to.deep.equal(verificationConfigV2.ofacEnabled);
  });

  it("should convert v1 config to bytes of the latest config struct", async function () {
    // Create a sample VerificationConfigV1 struct
    const verificationConfigV1: SelfStructs.VerificationConfigV1Struct = {
      olderThanEnabled: true,
      olderThan: 18,
      forbiddenCountriesEnabled: false,
      forbiddenCountriesListPacked: [0n, 0n, 0n, 0n],
      ofacEnabled: [false, false, false],
    };

    const verificationConfigLatest = await testGenericFormatter.testFormatV1Config(verificationConfigV1);

    const verificationConfigLatestDecoded = ethers.AbiCoder.defaultAbiCoder().decode(
      ["tuple(bool,uint256,bool,uint256[4],bool[3])"],
      verificationConfigLatest,
    );

    // Add your assertions here
    expect(verificationConfigLatestDecoded[0][0]).to.equal(verificationConfigV1.olderThanEnabled);
    expect(verificationConfigLatestDecoded[0][1]).to.equal(verificationConfigV1.olderThan);
    expect(verificationConfigLatestDecoded[0][2]).to.equal(verificationConfigV1.forbiddenCountriesEnabled);
    expect(verificationConfigLatestDecoded[0][3]).to.deep.equal(verificationConfigV1.forbiddenCountriesListPacked);
    expect(verificationConfigLatestDecoded[0][4]).to.deep.equal(verificationConfigV1.ofacEnabled);
  });

  it("should convert v2 config to bytes of the latest config struct", async function () {
    // Create a sample VerificationConfigV2 struct
    const verificationConfigV2: SelfStructs.VerificationConfigV2Struct = {
      olderThanEnabled: true,
      olderThan: 18,
      forbiddenCountriesEnabled: false,
      forbiddenCountriesListPacked: [0n, 0n, 0n, 0n],
      ofacEnabled: [false, false, false],
    };

    const verificationConfigV2Bytes = await testGenericFormatter.testFormatV2Config(verificationConfigV2);

    const verificationConfigLatest = ethers.AbiCoder.defaultAbiCoder().decode(
      ["tuple(bool,uint256,bool,uint256[4],bool[3])"],
      verificationConfigV2Bytes,
    );

    // Add your assertions here
    expect(verificationConfigLatest[0][0]).to.equal(verificationConfigV2.olderThanEnabled);
    expect(verificationConfigLatest[0][1]).to.equal(verificationConfigV2.olderThan);
    expect(verificationConfigLatest[0][2]).to.equal(verificationConfigV2.forbiddenCountriesEnabled);
    expect(verificationConfigLatest[0][3]).to.deep.equal(verificationConfigV2.forbiddenCountriesListPacked);
    expect(verificationConfigLatest[0][4]).to.deep.equal(verificationConfigV2.ofacEnabled);
  });

  it("should convert v2 struct to bytes of the latest config struct", async function () {
    // Create a sample GenericDiscloseOutputV2 struct
    const genericDiscloseOutputV2: SelfStructs.GenericDiscloseOutputV2Struct = {
      attestationId: "0x0000000000000000000000000000000000000000000000000000000000000001",
      userIdentifier: 1,
      nullifier: 1,
      forbiddenCountriesListPacked: [0n, 0n, 0n, 0n],
      issuingState: "US",
      name: ["John", "Doe"],
      idNumber: "1234567890",
      nationality: "US",
      dateOfBirth: "1990-01-01",
      gender: "Male",
      expiryDate: "2025-01-01",
      olderThan: 18,
      ofac: [false, false, false],
    };

    const genericDiscloseOutputV2Bytes = await testGenericFormatter.testToV2Struct(genericDiscloseOutputV2);

    const genericDiscloseOutputLatest = ethers.AbiCoder.defaultAbiCoder().decode(
      ["tuple(bytes32,uint256,uint256,uint256[4],string,string[],string,string,string,string,string,uint256,bool[3])"],
      genericDiscloseOutputV2Bytes,
    );

    expect(genericDiscloseOutputV2.attestationId.toString()).to.equal(genericDiscloseOutputV2.attestationId);
    expect(genericDiscloseOutputLatest[0][1]).to.equal(genericDiscloseOutputV2.userIdentifier);
    expect(genericDiscloseOutputLatest[0][2]).to.equal(genericDiscloseOutputV2.nullifier);
    expect(genericDiscloseOutputLatest[0][3]).to.deep.equal(genericDiscloseOutputV2.forbiddenCountriesListPacked);
    expect(genericDiscloseOutputLatest[0][4]).to.equal(genericDiscloseOutputV2.issuingState);
    expect(genericDiscloseOutputLatest[0][5]).to.deep.equal(genericDiscloseOutputV2.name);
    expect(genericDiscloseOutputLatest[0][6]).to.equal(genericDiscloseOutputV2.idNumber);
    expect(genericDiscloseOutputLatest[0][7]).to.equal(genericDiscloseOutputV2.nationality);
    expect(genericDiscloseOutputLatest[0][8]).to.equal(genericDiscloseOutputV2.dateOfBirth);
    expect(genericDiscloseOutputLatest[0][9]).to.equal(genericDiscloseOutputV2.gender);
    expect(genericDiscloseOutputLatest[0][10]).to.equal(genericDiscloseOutputV2.expiryDate);
    expect(genericDiscloseOutputLatest[0][11]).to.equal(genericDiscloseOutputV2.olderThan);
    expect(genericDiscloseOutputLatest[0][12]).to.deep.equal(genericDiscloseOutputV2.ofac);
  });
});
