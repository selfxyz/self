import { ethers } from "hardhat";
import { expect } from "chai";

// Mirrors the circuit's PackBytes: <=31 ASCII bytes per field, little-endian per chunk.
function packAscii(s: string): bigint[] {
  const bytes = Buffer.from(s, "ascii");
  const chunks: bigint[] = [];
  for (let c = 0; c * 31 < bytes.length; c++) {
    let acc = 0n;
    for (let j = 0; j < 31; j++) {
      const i = c * 31 + j;
      if (i >= bytes.length) break;
      acc += BigInt(bytes[i]) * 256n ** BigInt(j);
    }
    chunks.push(acc);
  }
  return chunks;
}

describe("GCPJWTHelper.unpackAndDecodeAddress", () => {
  let helper: any;

  before(async () => {
    const F = await ethers.getContractFactory("TestGCPJWTHelper");
    helper = await F.deploy();
    await helper.waitForDeployment();
  });

  it("decodes 40 lowercase hex chars to the matching address", async () => {
    const addr = "0xab12cd34ef56ab78cd90ef12ab34cd56ef78ab90";
    const [p0, p1] = packAscii(addr.slice(2));
    expect(await helper.testUnpackAndDecodeAddress(p0, p1)).to.equal(
      ethers.getAddress(addr),
    );
  });

  it("decodes an address whose hex contains only digits", async () => {
    const addr = "0x1111111111111111111111111111111111111111";
    const [p0, p1] = packAscii(addr.slice(2));
    expect(await helper.testUnpackAndDecodeAddress(p0, p1)).to.equal(
      ethers.getAddress(addr),
    );
  });

  it("reverts when fewer than 40 characters are packed", async () => {
    const [p0, p1 = 0n] = packAscii("ab12cd34ef"); // 10 chars
    await expect(helper.testUnpackAndDecodeAddress(p0, p1)).to.be.reverted;
  });

  it("reverts when the second chunk carries more than 9 characters", async () => {
    // 31 + 20 chars: chunk 1 still holds bytes after the 40-char boundary.
    const [p0, p1] = packAscii("a".repeat(51));
    await expect(helper.testUnpackAndDecodeAddress(p0, p1)).to.be.reverted;
  });

  it("reverts on a non-hex character", async () => {
    const [p0, p1] = packAscii("z".repeat(40));
    await expect(helper.testUnpackAndDecodeAddress(p0, p1)).to.be.reverted;
  });

  it("reverts on exactly 31 characters (chunk 0 exhausts, chunk 1 absent)", async () => {
    const [p0, p1 = 0n] = packAscii("a".repeat(31));
    await expect(helper.testUnpackAndDecodeAddress(p0, p1)).to.be.reverted;
  });

  it("reverts when chunk 0 itself holds more than 31 meaningful bytes", async () => {
    // packAscii can't produce this (it caps each chunk at 31 bytes), so build p0 directly:
    // 32 bytes of 'a' (0x61), little-endian. The unpack loop only reads 31 of them (idx < 31
    // cap), so after shifting p0 still holds 1 leftover nonzero byte. Pair it with a p1 that
    // supplies exactly 9 more chars so idx reaches 40 via the normal path, and only the
    // residual-check on p0 catches the overflow.
    let p0 = 0n;
    for (let i = 0; i < 32; i++) {
      p0 += 0x61n * 256n ** BigInt(i);
    }
    let p1 = 0n;
    for (let i = 0; i < 9; i++) {
      p1 += 0x62n * 256n ** BigInt(i);
    }
    await expect(helper.testUnpackAndDecodeAddress(p0, p1)).to.be.reverted;
  });

  it("decodes uppercase and mixed-case hex identically to lowercase", async () => {
    // Case is not meaningful in the packed hex itself (unlike EIP-55 checksums), so compare
    // against the address derived from the plain lowercase hex rather than routing this
    // arbitrary-case string through ethers.getAddress (which enforces EIP-55 checksums).
    const lowercaseHex = "ab12cd34ef56ab78cd90ef12ab34cd56ef78ab90";
    const mixedCaseHex = "AB12cd34EF56ab78CD90ef12AB34cd56EF78ab90";
    const expected = ethers.getAddress(`0x${lowercaseHex}`);
    const [p0, p1] = packAscii(mixedCaseHex);
    expect(await helper.testUnpackAndDecodeAddress(p0, p1)).to.equal(expected);
  });
});
