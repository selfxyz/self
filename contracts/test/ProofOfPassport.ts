import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { DataHash } from "../../common/src/utils/types";
import { getPassportData } from "../../common/src/utils/passportData";
import { attributeToPosition } from "../../common/src/constants/constants";
import { formatMrz, splitToWords, formatAndConcatenateDataHashes, toUnsignedByte, hash, bytesToBigDecimal } from "../../common/src/utils/utils";
import { groth16 } from 'snarkjs'
const fs = require('fs');

describe("ProofOfPassport", function () {
  this.timeout(0);

  async function deployFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const Verifier = await ethers.getContractFactory("Groth16Verifier");
    const verifier = await Verifier.deploy();
    await verifier.waitForDeployment();
  
    console.log(`Verifier deployed to ${verifier.target}`);
  
    const ProofOfPassport = await ethers.getContractFactory("ProofOfPassport");
    const proofOfPassport = await ProofOfPassport.deploy(verifier.target);
    await proofOfPassport.waitForDeployment();
  
    console.log(`ProofOfPassport NFT deployed to ${proofOfPassport.target}`);

    const passportData = getPassportData();
  
    const formattedMrz = formatMrz(passportData.mrz);
    const mrzHash = hash(formatMrz(passportData.mrz));
    const concatenatedDataHashes = formatAndConcatenateDataHashes(
      mrzHash,
      passportData.dataGroupHashes as DataHash[],
    );

    const attributeToReveal = {
      issuing_state: true,
      name: true,
      passport_number: true,
      nationality: true,
      date_of_birth: true,
      gender: true,
      expiry_date: true,
    }

    const bitmap = Array(88).fill('0');

    Object.entries(attributeToReveal).forEach(([attribute, reveal]) => {
      if (reveal) {
        const [start, end] = attributeToPosition[attribute as keyof typeof attributeToPosition];
        bitmap.fill('1', start, end + 1);
      }
    });

    const inputs = {
      mrz: formattedMrz.map(byte => String(byte)),
      reveal_bitmap: bitmap.map(byte => String(byte)),
      dataHashes: concatenatedDataHashes.map(toUnsignedByte).map(byte => String(byte)),
      eContentBytes: passportData.eContent.map(toUnsignedByte).map(byte => String(byte)),
      pubkey: splitToWords(
        BigInt(passportData.pubKey.modulus as string),
        BigInt(64),
        BigInt(32)
      ),
      signature: splitToWords(
        BigInt(bytesToBigDecimal(passportData.encryptedDigest)),
        BigInt(64),
        BigInt(32)
      ),
      address: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8", // hardhat account 1
    }

    console.log('generating proof...');
    const { proof, publicSignals } = await groth16.fullProve(
      inputs,
      "../circuits/build/proof_of_passport_js/proof_of_passport.wasm",
      "../circuits/build/proof_of_passport_final.zkey"
    )

    console.log('proof done');

    const revealChars = publicSignals.slice(0, 88).map((byte: string) => String.fromCharCode(parseInt(byte, 10))).join('');
    // console.log('reveal chars', revealChars);

    const vKey = JSON.parse(fs.readFileSync("../circuits/build/verification_key.json"));
    const verified = await groth16.verify(
      vKey,
      publicSignals,
      proof
    )

    assert(verified == true, 'Should verifiable')

    const cd = await groth16.exportSolidityCallData(proof, publicSignals);
    const callData = JSON.parse(`[${cd}]`);
    console.log('callData', callData);

    return { verifier, proofOfPassport, owner, otherAccount, passportData, inputs, proof, publicSignals, revealChars, callData };
  }

  describe("Deployment", function () {
    it("Verifier verifies a correct proof", async () => {
      const { verifier, callData } = await loadFixture(deployFixture);

      expect(
        await verifier.verifyProof(...callData)
      ).to.be.true;
    });

    it("Should allow a user to mint a SBT", async function () {
      const { proofOfPassport, otherAccount, callData } = await loadFixture(
        deployFixture
      );

      await proofOfPassport
        .connect(otherAccount)
        .mint(...callData);

      expect(await proofOfPassport.balanceOf(otherAccount.address)).to.equal(1);
    });

    it("Shouldn't allow minting with an invalid proof", async function () {
      const { proofOfPassport, otherAccount, callData } = await loadFixture(
        deployFixture
      );

      callData[0][1] = "0x1cdbaf59a0439d55f19162ee0be5a501f5b55c669a6e1f8d27b75d95ff31ff7b";

      expect(
        proofOfPassport
          .connect(otherAccount)
          .mint(...callData)
      ).to.be.revertedWith("Invalid proof");
    });

    it.only("Should have a correct tokenURI a user to mint a SBT", async function () {
      const { proofOfPassport, otherAccount, callData } = await loadFixture(
        deployFixture
      );

      const tx = await proofOfPassport
        .connect(otherAccount)
        .mint(...callData);

      const receipt = await tx.wait();

      const tokenURI = await proofOfPassport.tokenURI(0);

      console.log('tokenURI', tokenURI);

      // expect(await proofOfPassport.balanceOf(otherAccount.address)).to.equal(1);
    });

  });
});
