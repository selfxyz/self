import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { DataHash } from "../../common/src/utils/types";
import { getPassportData } from "../../common/src/utils/passportData";
import { attributeToPosition } from "../../common/src/constants/constants";
import { formatMrz, splitToWords, formatAndConcatenateDataHashes, toUnsignedByte, hash, bytesToBigDecimal } from "../../common/src/utils/utils";
import { groth16 } from 'snarkjs'
import { countryCodes } from "../../common/src/constants/constants";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import axios from 'axios';

const fs = require('fs');

describe("Proof of Passport", function () {
  this.timeout(0);

  async function deployFixture() {
    const [owner, otherAccount, thirdAccount] = await ethers.getSigners();

    const Verifier = await ethers.getContractFactory("Groth16Verifier");
    const verifier = await Verifier.deploy();
    await verifier.waitForDeployment();
  
    console.log(`Verifier deployed to ${verifier.target}`);

    const Formatter = await ethers.getContractFactory("Formatter");
    const formatter = await Formatter.deploy();
    await formatter.waitForDeployment();
    await formatter.addCountryCodes(Object.entries(countryCodes));

    console.log(`Formatter deployed to ${formatter.target}`);

    const ProofOfPassport = await ethers.getContractFactory("ProofOfPassport");
    const proofOfPassport = await ProofOfPassport.deploy(verifier.target, formatter.target);
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

    return { verifier, proofOfPassport, formatter, owner, otherAccount, thirdAccount, passportData, inputs, proof, publicSignals, revealChars, callData };
  }

  describe("Proof of Passport SBT", function () {
    it("Verifier verifies a correct proof", async () => {
      const { verifier, callData } = await loadFixture(deployFixture);

      expect(
        await verifier.verifyProof(...callData)
      ).to.be.true;
    });

    it("Should allow SBT minting", async function () {
      const { proofOfPassport, otherAccount, thirdAccount, callData } = await loadFixture(
        deployFixture
      );

      await proofOfPassport
        .connect(thirdAccount) // fine that it's not the same account as address is taken from the proof
        .mint(...callData);

      expect(await proofOfPassport.balanceOf(otherAccount.address)).to.equal(1);
    });

    it("Shouldn't allow minting with an invalid proof", async function () {
      const { proofOfPassport, otherAccount, callData } = await loadFixture(
        deployFixture
      );

      const badCallData = JSON.parse(JSON.stringify(callData));

      badCallData[0][1] = "0x1cdbaf59a0439d55f19162ee0be5a501f5b55c669a6e1f8d27b75d95ff31ff7b";

      expect(
        proofOfPassport
          .connect(otherAccount)
          .mint(...badCallData as any)
      ).to.be.revertedWith("Invalid proof");
    });

    it("Should have a correct tokenURI a user to mint a SBT", async function () {
      const { proofOfPassport, otherAccount, callData } = await loadFixture(
        deployFixture
      );

      console.log('callData', callData)

      const tx = await proofOfPassport
        .connect(otherAccount)
        .mint(...callData);

      await tx.wait();

      const tokenURI = await proofOfPassport.tokenURI(0);

      console.log('tokenURI', tokenURI);

      const decodedTokenURI = Buffer.from(tokenURI.split(',')[1], 'base64').toString();
      let parsedTokenURI;

      try {
        parsedTokenURI = JSON.parse(decodedTokenURI);
      } catch (e) {
        assert(false, 'TokenURI is not a valid JSON');
      }
      console.log('parsedTokenURI', parsedTokenURI);
    });

    it("Should convert ISO dates to unix timestamps correctly", async function () {
      const { formatter } = await loadFixture(
        deployFixture
      );

      const unix_timestamp = await formatter.dateToUnixTimestamp("230512") // 2023 05 12
      console.log('unix_timestamp', unix_timestamp.toString());

      var date = new Date(Number(unix_timestamp) * 1000);
      console.log("date:", date.toUTCString());

      expect(date.getUTCFullYear()).to.equal(2023);
      expect(date.getUTCMonth()).to.equal(4);
      expect(date.getUTCDate()).to.equal(12);
    })

    it("Should support expiry", async function () {
      const { proofOfPassport, otherAccount, callData } = await loadFixture(
        deployFixture
      );

      const tx = await proofOfPassport
      .connect(otherAccount)
      .mint(...callData);

      await tx.wait();

      const tokenURI = await proofOfPassport.tokenURI(0);
      const decodedTokenURI = Buffer.from(tokenURI.split(',')[1], 'base64').toString();
      const parsedTokenURI = JSON.parse(decodedTokenURI);

      const expired = parsedTokenURI.attributes.find((attribute: any) => attribute.trait_type === 'Expired');
      expect(expired.value).to.equal('No');

      await time.increaseTo(2240161656); // 2040

      const tokenURIAfter = await proofOfPassport.tokenURI(0);
      const decodedTokenURIAfter = Buffer.from(tokenURIAfter.split(',')[1], 'base64').toString();
      const parsedTokenURIAfter = JSON.parse(decodedTokenURIAfter);

      const expiredAfter = parsedTokenURIAfter.attributes.find((attribute: any) => attribute.trait_type === 'Expired');

      expect(expiredAfter.value).to.equal('Yes');
    })
  });

  describe.only("Minting using lambda function", function () {
    it.skip("Should allow minting using lambda function", async function () {
      const { callData } = await loadFixture(
        deployFixture
      );

      const proofOfPassportOnMumbaiAddress = '0xaf0f1669385182829d0DEa233E83299DED28954A';
      const provider = new ethers.JsonRpcProvider('https://polygon-mumbai-bor.publicnode.com');
      const proofOfPassportOnMumbai = await ethers.getContractAt('ProofOfPassport', proofOfPassportOnMumbaiAddress);

      const transactionRequest = await proofOfPassportOnMumbai
        .mint.populateTransaction(...callData);

      console.log('transactionRequest', transactionRequest);

      try {
        const apiEndpoint = process.env.AWS_ENDPOINT;
        if (!apiEndpoint) {
          throw new Error('AWS_ENDPOINT env variable is not set');
        }
        const response = await axios.post(apiEndpoint, {
          chain: "mumbai",
          tx_data: transactionRequest
        });
        console.log('response status', response.status)
        console.log('response data', response.data)
        const receipt = await provider.waitForTransaction(response.data.hash);
        console.log('receipt', receipt)
      } catch (err) {
        console.log('err', err);
      }
    });
  })
});
