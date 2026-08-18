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
});
