import { expect } from "chai";
import { ethers } from "hardhat";
import { TestCustomVerifier, CustomVerifier } from "../../typechain-types";

export const AttestationId = {
  E_PASSPORT: "0x0000000000000000000000000000000000000000000000000000000000000001",
  EU_ID_CARD: "0x0000000000000000000000000000000000000000000000000000000000000002",
} as const;

describe("CustomVerifier", function () {
  let testVerifier: TestCustomVerifier;
  let customVerifier: CustomVerifier;

  before(async function () {
    const CustomVerifierFactory = await ethers.getContractFactory("CustomVerifier");
    customVerifier = await CustomVerifierFactory.deploy();
    await customVerifier.waitForDeployment();

    const TestVerifierFactory = await ethers.getContractFactory("TestCustomVerifier", {
      libraries: {
        CustomVerifier: await customVerifier.getAddress(),
      },
    });
    testVerifier = await TestVerifierFactory.deploy();
    await testVerifier.waitForDeployment();
  });

  describe("Passport Verification", function () {
    const mrz = ethers.toUtf8Bytes(
      "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<" + "L898902C36UTO7408122F1204159ZE184226B<<<<<1018",
    );
    const mrzBytes = new Uint8Array([...mrz, 1, 0, 1]);
    const samplePassportOutput = [
      ethers.getBigInt(ethers.hexlify(ethers.randomBytes(32))), // attestationId (uint256)
      mrzBytes, // revealedDataPacked (bytes)
      ethers.getBigInt(ethers.hexlify(ethers.randomBytes(32))), // userIdentifier (uint256)
      ethers.getBigInt(ethers.hexlify(ethers.randomBytes(32))), // nullifier (uint256)
      [ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0)], // forbiddenCountriesListPacked
    ];

    it("should verify passport with all checks disabled", async function () {
      const config = [
        false,
        0,
        false,
        [ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0)],
        [false, false, false],
      ];

      const result = await testVerifier.testCustomVerify(
        AttestationId.E_PASSPORT,
        ethers.AbiCoder.defaultAbiCoder().encode(["tuple(bool,uint256,bool,uint256[4],bool[3])"], [config]),
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["tuple(uint256,bytes,uint256,uint256,uint256[4])"],
          [samplePassportOutput],
        ),
      );

      expect(result.attestationId).to.equal(AttestationId.E_PASSPORT);
    });

    it("should not verify passport with OFAC checks", async function () {
      const config = [
        false,
        0,
        false,
        [ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0)],
        [true, false, true],
      ];

      expect(
        async () =>
          await testVerifier.testCustomVerify(
            AttestationId.E_PASSPORT,
            ethers.AbiCoder.defaultAbiCoder().encode(["tuple(bool,uint256,bool,uint256[4],bool[3])"], [config]),
            ethers.AbiCoder.defaultAbiCoder().encode(
              ["tuple(uint256,bytes,uint256,uint256,uint256[4])"],
              [samplePassportOutput],
            ),
          ),
      ).to.be.revertedWithCustomError(customVerifier, "InvalidOfacCheck");
    });

    it("should return proper OFAC results", async function () {
      const config = [
        false,
        0,
        false,
        [ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0)],
        [false, false, false],
      ];

      const result = await testVerifier.testCustomVerify(
        AttestationId.E_PASSPORT,
        ethers.AbiCoder.defaultAbiCoder().encode(["tuple(bool,uint256,bool,uint256[4],bool[3])"], [config]),
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["tuple(uint256,bytes,uint256,uint256,uint256[4])"],
          [samplePassportOutput],
        ),
      );

      expect(result.attestationId).to.equal(AttestationId.E_PASSPORT);
      expect(result.ofac[0]).to.equal(true);
      expect(result.ofac[1]).to.equal(false);
      expect(result.ofac[2]).to.equal(true);
    });

    it("should verify passport with forbidden countries check", async function () {
      const config = [
        false,
        0,
        true,
        [ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0)],
        [false, false, false],
      ];

      const result = await testVerifier.testCustomVerify(
        AttestationId.E_PASSPORT,
        ethers.AbiCoder.defaultAbiCoder().encode(["tuple(bool,uint256,bool,uint256[4],bool[3])"], [config]),
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["tuple(uint256,bytes,uint256,uint256,uint256[4])"],
          [samplePassportOutput],
        ),
      );

      expect(result.attestationId).to.equal(AttestationId.E_PASSPORT);
    });

    it("should throw an error if age is not valid", async function () {
      const config = [
        true,
        19,
        false,
        [ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0)],
        [false, false, false],
      ];

      expect(
        async () =>
          await testVerifier.testCustomVerify(
            AttestationId.E_PASSPORT,
            ethers.AbiCoder.defaultAbiCoder().encode(["tuple(bool,uint256,bool,uint256[4],bool[3])"], [config]),
            ethers.AbiCoder.defaultAbiCoder().encode(
              ["tuple(uint256,bytes,uint256,uint256,uint256[4])"],
              [samplePassportOutput],
            ),
          ),
      ).to.be.revertedWithCustomError(customVerifier, "InvalidOlderThan");
    });

    it("should not throw an error if older than is not enabled", async function () {
      const config = [
        false,
        19,
        false,
        [ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0)],
        [false, false, false],
      ];

      const result = await testVerifier.testCustomVerify(
        AttestationId.E_PASSPORT,
        ethers.AbiCoder.defaultAbiCoder().encode(["tuple(bool,uint256,bool,uint256[4],bool[3])"], [config]),
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["tuple(uint256,bytes,uint256,uint256,uint256[4])"],
          [samplePassportOutput],
        ),
      );

      expect(result.attestationId).to.equal(AttestationId.E_PASSPORT);
    });

    it("should not throw an error if age is valid", async function () {
      const config = [
        true,
        18,
        false,
        [ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0)],
        [false, false, false],
      ];

      const result = await testVerifier.testCustomVerify(
        AttestationId.E_PASSPORT,
        ethers.AbiCoder.defaultAbiCoder().encode(["tuple(bool,uint256,bool,uint256[4],bool[3])"], [config]),
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["tuple(uint256,bytes,uint256,uint256,uint256[4])"],
          [samplePassportOutput],
        ),
      );

      expect(result.attestationId).to.equal(AttestationId.E_PASSPORT);
      expect(result.olderThan).to.equal(18);
    });
  });

  describe("ID Card Verification", function () {
    let mrz = "I<FRA1234567890<<<<<<<<<<<<<<<5410070M3001010FRA<<<<<<<<<<<1HENAO<MONTOYA<<ARCANGEL<DE<JES18";
    let mrzBytes = new Uint8Array([...ethers.toUtf8Bytes(mrz), 1, 0]);
    const sampleIdCardOutput = [
      ethers.getBigInt(ethers.hexlify(ethers.randomBytes(32))), // attestationId (uint256)
      mrzBytes, // revealedDataPacked (bytes)
      ethers.getBigInt(ethers.hexlify(ethers.randomBytes(32))), // userIdentifier (uint256)
      ethers.getBigInt(ethers.hexlify(ethers.randomBytes(32))), // nullifier (uint256)
      [ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0)], // forbiddenCountriesListPacked
    ];

    it("should verify ID card with all checks disabled", async function () {
      const config = [
        false,
        0,
        false,
        [ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0)],
        [false, false, false],
      ];

      const result = await testVerifier.testCustomVerify(
        AttestationId.EU_ID_CARD,
        ethers.AbiCoder.defaultAbiCoder().encode(["tuple(bool,uint256,bool,uint256[4],bool[3])"], [config]),
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["tuple(uint256,bytes,uint256,uint256,uint256[4])"],
          [sampleIdCardOutput],
        ),
      );

      expect(result.attestationId).to.equal(AttestationId.EU_ID_CARD);
    });

    it("should not verify ID card with OFAC checks", async function () {
      const config = [
        false,
        0,
        false,
        [ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0)],
        [true, false, true],
      ];

      expect(
        async () =>
          await testVerifier.testCustomVerify(
            AttestationId.EU_ID_CARD,
            ethers.AbiCoder.defaultAbiCoder().encode(["tuple(bool,uint256,bool,uint256[4],bool[3])"], [config]),
            ethers.AbiCoder.defaultAbiCoder().encode(
              ["tuple(uint256,bytes,uint256,uint256,uint256[4])"],
              [sampleIdCardOutput],
            ),
          ),
      ).to.be.revertedWithCustomError(customVerifier, "InvalidOfacCheck");
    });

    it("should return proper OFAC results", async function () {
      const config = [
        false,
        0,
        false,
        [ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0)],
        [false, false, false],
      ];

      const result = await testVerifier.testCustomVerify(
        AttestationId.EU_ID_CARD,
        ethers.AbiCoder.defaultAbiCoder().encode(["tuple(bool,uint256,bool,uint256[4],bool[3])"], [config]),
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["tuple(uint256,bytes,uint256,uint256,uint256[4])"],
          [sampleIdCardOutput],
        ),
      );

      expect(result.attestationId).to.equal(AttestationId.EU_ID_CARD);
      expect(result.ofac[0]).to.equal(false);
      expect(result.ofac[1]).to.equal(true);
      expect(result.ofac[2]).to.equal(false);
    });

    it("should verify ID card with OFAC checks", async function () {
      const config = [
        false,
        0,
        false,
        [ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0)],
        [false, false, false],
      ];

      const result = await testVerifier.testCustomVerify(
        AttestationId.EU_ID_CARD,
        ethers.AbiCoder.defaultAbiCoder().encode(["tuple(bool,uint256,bool,uint256[4],bool[3])"], [config]),
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["tuple(uint256,bytes,uint256,uint256,uint256[4])"],
          [sampleIdCardOutput],
        ),
      );

      expect(result.attestationId).to.equal(AttestationId.EU_ID_CARD);
    });

    it("should verify ID card with forbidden countries check", async function () {
      const config = [
        false,
        0,
        true,
        [ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0)],
        [false, false, false],
      ];

      const result = await testVerifier.testCustomVerify(
        AttestationId.EU_ID_CARD,
        ethers.AbiCoder.defaultAbiCoder().encode(["tuple(bool,uint256,bool,uint256[4],bool[3])"], [config]),
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["tuple(uint256,bytes,uint256,uint256,uint256[4])"],
          [sampleIdCardOutput],
        ),
      );

      expect(result.attestationId).to.equal(AttestationId.EU_ID_CARD);
    });

    it("should throw an error if age is not valid", async function () {
      const config = [
        true,
        19,
        false,
        [ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0)],
        [false, false, false],
      ];

      expect(
        async () =>
          await testVerifier.testCustomVerify(
            AttestationId.EU_ID_CARD,
            ethers.AbiCoder.defaultAbiCoder().encode(["tuple(bool,uint256,bool,uint256[4],bool[3])"], [config]),
            ethers.AbiCoder.defaultAbiCoder().encode(
              ["tuple(uint256,bytes,uint256,uint256,uint256[4])"],
              [sampleIdCardOutput],
            ),
          ),
      ).to.be.revertedWithCustomError(customVerifier, "InvalidOlderThan");
    });

    it("should not throw an error if older than is not enabled", async function () {
      const config = [
        false,
        19,
        false,
        [ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0)],
        [false, false, false],
      ];

      const result = await testVerifier.testCustomVerify(
        AttestationId.EU_ID_CARD,
        ethers.AbiCoder.defaultAbiCoder().encode(["tuple(bool,uint256,bool,uint256[4],bool[3])"], [config]),
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["tuple(uint256,bytes,uint256,uint256,uint256[4])"],
          [sampleIdCardOutput],
        ),
      );

      expect(result.attestationId).to.equal(AttestationId.EU_ID_CARD);
    });

    it("should verify ID card with age check", async function () {
      const config = [
        true,
        18,
        false,
        [ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0)],
        [false, false, false],
      ];

      const result = await testVerifier.testCustomVerify(
        AttestationId.EU_ID_CARD,
        ethers.AbiCoder.defaultAbiCoder().encode(["tuple(bool,uint256,bool,uint256[4],bool[3])"], [config]),
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["tuple(uint256,bytes,uint256,uint256,uint256[4])"],
          [sampleIdCardOutput],
        ),
      );

      expect(result.attestationId).to.equal(AttestationId.EU_ID_CARD);
      expect(result.olderThan).to.equal(18);
    });
  });

  it("should revert with invalid attestation ID", async function () {
    const config = [
      false,
      0,
      false,
      [ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0)],
      [false, false, false],
    ];

    const invalidAttestationId = ethers.zeroPadValue(ethers.toBeHex(999), 32);

    await expect(
      testVerifier.testCustomVerify(
        invalidAttestationId,
        ethers.AbiCoder.defaultAbiCoder().encode(["tuple(bool,uint256,bool,uint256[4],bool[3])"], [config]),
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["tuple(uint256,bytes,uint256,uint256,uint256[4])"],
          [
            [
              ethers.getBigInt(ethers.hexlify(ethers.randomBytes(32))), // attestationId (uint256)
              ethers.randomBytes(88), // revealedDataPacked (bytes)
              ethers.getBigInt(ethers.hexlify(ethers.randomBytes(32))), // userIdentifier (uint256)
              ethers.getBigInt(ethers.hexlify(ethers.randomBytes(32))), // nullifier (uint256)
              [ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0), ethers.getBigInt(0)], // forbiddenCountriesListPacked
            ],
          ],
        ),
      ),
    ).to.be.revertedWithCustomError(customVerifier, "InvalidAttestationId");
  });
});
