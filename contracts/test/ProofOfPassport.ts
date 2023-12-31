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

  async function deployProofFixture() {
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

    return { passportData, inputs, proof, publicSignals, revealChars, callData };
  }

  describe("Proof of Passport SBT", function () {
    async function deployHardhatFixture() {
      const proofFixtureOutput = await deployProofFixture();

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

      return {verifier, proofOfPassport, formatter, owner, otherAccount, thirdAccount, ...proofFixtureOutput}
    }

    it("Verifier verifies a correct proof", async () => {
      const { verifier, callData } = await loadFixture(deployHardhatFixture);

      expect(
        await verifier.verifyProof(callData[0], callData[1], callData[2], callData[3])
      ).to.be.true;
    });

    it("Should allow SBT minting", async function () {
      const { proofOfPassport, otherAccount, thirdAccount, callData } = await loadFixture(
        deployHardhatFixture
      );

      await proofOfPassport
        .connect(thirdAccount) // fine that it's not the same account as address is taken from the proof
        .mint(...callData);

      expect(await proofOfPassport.balanceOf(otherAccount.address)).to.equal(1);
    });

    it("Shouldn't allow minting with an invalid proof", async function () {
      const { proofOfPassport, otherAccount, callData } = await loadFixture(
        deployHardhatFixture
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
        deployHardhatFixture
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
        deployHardhatFixture
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
        deployHardhatFixture
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

  describe("Minting on mumbai", function () {
    it.only("Should allow minting using a proof generated by ark-circom", async function () {
      const callDataFromArkCircom = [["0x247c20c5b5fb7f346341254abc22cb4677fb75537699646301aa0753b497638e", "0x08a06011dc0f82bdff18a17e1e65d37f4857bbe1b06c8cd63dc331682b43609f"], [["0x0619582dab21f8aa49a2eb81214f4d8d47ae724a1f6d9ea4fac1903e20646ba2", "0x20276fc851f2ecf7ec0944802cc1783f277797bed71cc92aea852587a5f67980"], ["0x0dc7d6e1501602fdf29eae0bbdc30d839b21f91a0f36f4b45fdcf93f70e55fce", "0x18eec3364fb37ba95b4a01c7c89d7c1408311809d06aa531dd2e7e8a1205f29e"]], ["0x0d861d4efb8bc2c8e0768ae6de070964ef0f1102d0157e32ede629ddfe188d77", "0x16afd1673e9434b985adaaacb7c4009260a4733c08144ae85ba4fdbaa24ee678"], ["0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x000000000000000000000000000000006df9dd0914f215fafa1513e51ac9f1e2", "0x00000000000000000000000000000000000000000000093e703cd030e286890e", "0x0000000000000000000000000000000000000000000004770a914f3ae4e1288b", "0x000000000000000000000000000000000000000000000bf7e8ecb4e9609a489d", "0x00000000000000000000000000000000000000000000035762de41038bc2dcf1", "0x00000000000000000000000000000000000000000000050442c4055d62e9c4af", "0x0000000000000000000000000000000000000000000004db2bdc79a477a0fce0", "0x000000000000000000000000000000000000000000000acdbf649c76ec3df9ad", "0x000000000000000000000000000000000000000000000aaa0e6798ee3694f5ca", "0x000000000000000000000000000000000000000000000a1eaac37f80dd5e2879", "0x00000000000000000000000000000000000000000000033e063fba83c27efbce", "0x00000000000000000000000000000000000000000000045b9b05cab95025b000", "0x000000000000000000000000e6e4b6a802f2e0aee5676f6010e0af5c9cdd0a50"]];

      const proofOfPassportOnMumbaiAddress = '0x81Ed3aB113C3169B4F1709c2F184Cb9B45Ea81E9';
      const proofOfPassportOnMumbai = await ethers.getContractAt('ProofOfPassport', proofOfPassportOnMumbaiAddress);
      try {
        const tx = await proofOfPassportOnMumbai.mint(...callDataFromArkCircom as any);
        console.log('txHash', tx.hash);
        const receipt = await tx.wait();
        console.log('receipt', receipt)
        expect(receipt?.status).to.equal(1);
      } catch (error) {
        console.error(error);
      }
    });

    it.skip("Should allow minting using lambda function", async function () {
      const { callData } = await loadFixture(
        deployProofFixture
      );

      const proofOfPassportOnMumbaiAddress = '0x0AAd39A080129763c8E1e2E9DC44E777DB0362a3';
      const provider = new ethers.JsonRpcProvider('https://polygon-mumbai-bor.publicnode.com');
      const proofOfPassportOnMumbai = await ethers.getContractAt('ProofOfPassport', proofOfPassportOnMumbaiAddress);

      try {
        const transactionRequest = await proofOfPassportOnMumbai
          .mint.populateTransaction(...callData);

        console.log('transactionRequest', transactionRequest);

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
