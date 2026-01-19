import { expect } from "chai";
import { ethers } from "hardhat";
import { TestGCPJWTHelper, MockGCPJWTVerifier } from "../../typechain-types";

// Helper to pack a string into field elements (max 31 bytes per field)
function packStringToFieldElements(str: string): [bigint, bigint, bigint] {
  const bytes = Buffer.from(str, "utf8");
  let p0 = 0n,
    p1 = 0n,
    p2 = 0n;

  for (let i = 0; i < Math.min(31, bytes.length); i++) {
    p0 |= BigInt(bytes[i]) << BigInt(i * 8);
  }
  for (let i = 31; i < Math.min(62, bytes.length); i++) {
    p1 |= BigInt(bytes[i]) << BigInt((i - 31) * 8);
  }
  for (let i = 62; i < Math.min(93, bytes.length); i++) {
    p2 |= BigInt(bytes[i]) << BigInt((i - 62) * 8);
  }

  return [p0, p1, p2];
}

describe("GCPJWTHelper", function () {
  let testHelper: TestGCPJWTHelper;

  before(async function () {
    const TestGCPJWTHelperFactory = await ethers.getContractFactory("TestGCPJWTHelper");
    testHelper = await TestGCPJWTHelperFactory.deploy();
    await testHelper.waitForDeployment();
  });

  describe("unpackAndConvertImageHash", function () {
    // Known test vectors from TypeScript implementation
    // These values pack to the hex string: "d2221a0ee83901980c607ceff2edbedf3f6ce5f437eafa5d89be39e9e7487c04"
    const testDigest = {
      p0: 177384435506496807268973340845468654286294928521500580044819492874465981028n,
      p1: 175298970718174405520284770870231222447414486446296682893283627688949855078n,
      p2: 13360n,
    };

    // Expected hash bytes (32 bytes)
    const expectedHashHex = "d2221a0ee83901980c607ceff2edbedf3f6ce5f437eafa5d89be39e9e7487c04";

    it("should return 48 bytes with correct structure", async function () {
      const result = await testHelper.testUnpackAndConvertImageHash(testDigest.p0, testDigest.p1, testDigest.p2);

      // Should be 48 bytes total
      expect(ethers.getBytes(result).length).to.equal(48);
    });

    it("should have 16 leading zero bytes (PCR0 padding)", async function () {
      const result = await testHelper.testUnpackAndConvertImageHash(testDigest.p0, testDigest.p1, testDigest.p2);

      const bytes = ethers.getBytes(result);

      // First 16 bytes should be zeros
      for (let i = 0; i < 16; i++) {
        expect(bytes[i]).to.equal(0, `Byte at index ${i} should be 0`);
      }
    });

    it("should correctly convert hex string to hash bytes", async function () {
      const result = await testHelper.testUnpackAndConvertImageHash(testDigest.p0, testDigest.p1, testDigest.p2);

      const bytes = ethers.getBytes(result);

      // Last 32 bytes should match the expected hash
      const actualHashBytes = bytes.slice(16);
      const expectedHashBytes = ethers.getBytes("0x" + expectedHashHex);

      for (let i = 0; i < 32; i++) {
        expect(actualHashBytes[i]).to.equal(expectedHashBytes[i], `Hash byte at index ${i} mismatch`);
      }
    });

    it("should handle zeros correctly", async function () {
      // All zeros should produce all zero output
      const result = await testHelper.testUnpackAndConvertImageHash(0n, 0n, 0n);
      const bytes = ethers.getBytes(result);

      for (let i = 0; i < 48; i++) {
        expect(bytes[i]).to.equal(0, `Byte at index ${i} should be 0`);
      }
    });

    it("should correctly parse individual hex characters", async function () {
      // Test that the first byte of the hash (after padding) is correct
      // The hex string starts with "d2", so first hash byte should be 0xd2 = 210
      const byte16 = await testHelper.testGetImageHashByte(testDigest.p0, testDigest.p1, testDigest.p2, 16);

      expect(byte16).to.equal(0xd2);
    });

    it("should handle lowercase hex characters (a-f)", async function () {
      // The test digest contains lowercase hex chars like 'e', 'f', 'a', 'b', 'c', 'd'
      // Hex string: d2221a0ee83901980c607ceff2edbedf3f6ce5f437eafa5d89be39e9e7487c04
      // Verify specific bytes that use these chars
      const result = await testHelper.testUnpackAndConvertImageHash(testDigest.p0, testDigest.p1, testDigest.p2);

      const bytes = ethers.getBytes(result);

      // "be" at hash position 14 (result[16+14] = result[30]) should be 0xbe = 190
      expect(bytes[30]).to.equal(0xbe);

      // "df" at hash position 15 (result[16+15] = result[31]) should be 0xdf = 223
      expect(bytes[31]).to.equal(0xdf);

      // "ef" at hash position 11 (result[16+11] = result[27]) should be 0xef = 239
      expect(bytes[27]).to.equal(0xef);
    });
  });

  describe("unpackAndDecodeHexPubkey", function () {
    // Test vector from the JWT example:
    // eat_nonce[0] = "1618d28fdfb51eb55112bb56ddf92b87a6d44d0f61dd04a811680b90b6533ce5"
    // Expected decoded value: 9994740243950890658651670052465332625517225873797253432802227881421242055909n
    const testHexString = "1618d28fdfb51eb55112bb56ddf92b87a6d44d0f61dd04a811680b90b6533ce5";
    const expectedValue = 9994740243950890658651670052465332625517225873797253432802227881421242055909n;

    // Pack the hex string into field elements
    const [p0, p1, p2] = packStringToFieldElements(testHexString);

    it("should correctly decode hex string to uint256", async function () {
      const result = await testHelper.testUnpackPubkeyString(p0, p1, p2);
      expect(result).to.equal(expectedValue);
    });

    it("should handle zeros correctly", async function () {
      // All zeros should produce zero output
      const result = await testHelper.testUnpackPubkeyString(0n, 0n, 0n);
      expect(result).to.equal(0n);
    });

    it("should produce consistent results", async function () {
      // Call multiple times to ensure deterministic behavior
      const result1 = await testHelper.testUnpackPubkeyString(p0, p1, p2);
      const result2 = await testHelper.testUnpackPubkeyString(p0, p1, p2);
      expect(result1).to.equal(result2);
    });

    it("should handle uppercase hex characters correctly", async function () {
      // Test with uppercase hex
      const upperHex = "ABCDEF0123456789";
      const [up0, up1, up2] = packStringToFieldElements(upperHex);
      const result = await testHelper.testUnpackPubkeyString(up0, up1, up2);
      // 0xABCDEF0123456789 = 12379813738877118345
      expect(result).to.equal(12379813738877118345n);
    });

    it("should handle mixed case hex characters", async function () {
      // Test with mixed case
      const mixedHex = "AbCdEf";
      const [mp0, mp1, mp2] = packStringToFieldElements(mixedHex);
      const result = await testHelper.testUnpackPubkeyString(mp0, mp1, mp2);
      // 0xABCDEF = 11259375
      expect(result).to.equal(11259375n);
    });

    it("should revert with invalid hex character", async function () {
      // Pack a string with invalid hex character 'g'
      const invalidHex = "abcdefg";
      const [ip0, ip1, ip2] = packStringToFieldElements(invalidHex);
      await expect(testHelper.testUnpackPubkeyString(ip0, ip1, ip2)).to.be.revertedWith("Invalid hex character");
    });

    it("should handle hex string spanning multiple field elements", async function () {
      // 64-char hex string spans p0 (31 chars) + p1 (31 chars) + p2 (2 chars)
      const longHex = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
      const [lp0, lp1, lp2] = packStringToFieldElements(longHex);
      const result = await testHelper.testUnpackPubkeyString(lp0, lp1, lp2);
      expect(result).to.equal(BigInt("0x" + longHex));
    });
  });

  describe("Edge Cases", function () {
    it("should handle maximum single byte value in each field", async function () {
      // Pack a single byte 0xff ('ÿ') - not a valid hex char, should revert
      // But the contract reverts with "Invalid hex character"
      // For image hash, invalid chars return 0
      const result = await testHelper.testUnpackAndConvertImageHash(255n, 0n, 0n);
      const bytes = ethers.getBytes(result);

      // _hexToNibble returns 0 for invalid hex chars
      expect(bytes[16]).to.equal(0);
    });

    it("should handle field elements with partial data", async function () {
      // Only p0 has data, p1 and p2 are zero
      // Pack "00" as hex (two '0' characters = ASCII 48, 48)
      // 48 + (48 << 8) = 48 + 12288 = 12336
      const result = await testHelper.testUnpackAndConvertImageHash(12336n, 0n, 0n);
      const bytes = ethers.getBytes(result);

      // "00" hex should produce byte 0x00
      expect(bytes[16]).to.equal(0x00);
    });
  });
});

describe("MockGCPJWTVerifier", function () {
  let mockVerifier: MockGCPJWTVerifier;

  beforeEach(async function () {
    const MockGCPJWTVerifierFactory = await ethers.getContractFactory("MockGCPJWTVerifier");
    mockVerifier = await MockGCPJWTVerifierFactory.deploy();
    await mockVerifier.waitForDeployment();
  });

  const mockProofA: [bigint, bigint] = [1n, 2n];
  const mockProofB: [[bigint, bigint], [bigint, bigint]] = [
    [1n, 2n],
    [3n, 4n],
  ];
  const mockProofC: [bigint, bigint] = [1n, 2n];
  const mockPubSignals: [bigint, bigint, bigint, bigint, bigint, bigint, bigint] = [1n, 2n, 3n, 4n, 5n, 6n, 7n];

  describe("Default behavior", function () {
    it("should return true by default", async function () {
      const result = await mockVerifier.verifyProof(mockProofA, mockProofB, mockProofC, mockPubSignals);
      expect(result).to.be.true;
    });

    it("should start with shouldVerify = true", async function () {
      expect(await mockVerifier.getShouldVerify()).to.be.true;
    });
  });

  describe("Configurable verification", function () {
    it("should return false when setShouldVerify(false) is called", async function () {
      await mockVerifier.setShouldVerify(false);
      expect(await mockVerifier.getShouldVerify()).to.be.false;

      const result = await mockVerifier.verifyProof(mockProofA, mockProofB, mockProofC, mockPubSignals);

      expect(result).to.be.false;
    });

    it("should return true again after setShouldVerify(true)", async function () {
      await mockVerifier.setShouldVerify(false);
      await mockVerifier.setShouldVerify(true);
      expect(await mockVerifier.getShouldVerify()).to.be.true;

      const result = await mockVerifier.verifyProof(mockProofA, mockProofB, mockProofC, mockPubSignals);

      expect(result).to.be.true;
    });

    it("should persist configuration across multiple calls", async function () {
      // Set to false
      await mockVerifier.setShouldVerify(false);

      // Multiple calls should all return false
      expect(await mockVerifier.verifyProof(mockProofA, mockProofB, mockProofC, mockPubSignals)).to.be.false;
      expect(await mockVerifier.verifyProof(mockProofA, mockProofB, mockProofC, mockPubSignals)).to.be.false;

      // Set back to true
      await mockVerifier.setShouldVerify(true);

      // Now should return true
      expect(await mockVerifier.verifyProof(mockProofA, mockProofB, mockProofC, mockPubSignals)).to.be.true;
    });
  });
});
