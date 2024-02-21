import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { getPassportData } from "../../common/src/utils/passportData";
import { MAX_DATAHASHES_LEN, attributeToPosition } from "../../common/src/constants/constants";
import { formatMrz, splitToWords, formatAndConcatenateDataHashes, toUnsignedByte, hash, bytesToBigDecimal } from "../../common/src/utils/utils";
import { groth16 } from 'snarkjs'
import { countryCodes } from "../../common/src/constants/constants";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import axios from 'axios';
import { sha256Pad } from "../../common/src/utils/sha256Pad";
const fs = require('fs');

describe("Proof of Passport", function () {
  this.timeout(0);

  let passportData, inputs, proof, publicSignals, revealChars, callData: any;

  before(async function generateProof() {
    passportData = getPassportData();

    const formattedMrz = formatMrz(passportData.mrz);

    const attributeToReveal = {
      issuing_state: true,
      name: true,
      passport_number: true,
      nationality: true,
      date_of_birth: true,
      gender: true,
      expiry_date: true,
    }

    const reveal_bitmap = Array(88).fill('0');

    Object.entries(attributeToReveal).forEach(([attribute, reveal]) => {
      if (reveal) {
        const [start, end] = attributeToPosition[attribute as keyof typeof attributeToPosition];
        reveal_bitmap.fill('1', start, end + 1);
      }
    });

    const [messagePadded, messagePaddedLen] = sha256Pad(
      new Uint8Array(passportData.dataGroupHashes),
      MAX_DATAHASHES_LEN
    );

    inputs = {
      mrz: formattedMrz.map(byte => String(byte)),
      reveal_bitmap: reveal_bitmap.map(byte => String(byte)),
      dataHashes: Array.from(messagePadded).map((x) => x.toString()),
      datahashes_padded_length: messagePaddedLen.toString(),
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
    ({ proof, publicSignals } = await groth16.fullProve(
      inputs,
      "../circuits/build/proof_of_passport_js/proof_of_passport.wasm",
      "../circuits/build/proof_of_passport_final.zkey"
    ))

    console.log('proof done');

    revealChars = publicSignals.slice(0, 88).map((byte: string) => String.fromCharCode(parseInt(byte, 10))).join('');

    const vKey = JSON.parse(fs.readFileSync("../circuits/build/verification_key.json"));
    const verified = await groth16.verify(
      vKey,
      publicSignals,
      proof
    )

    assert(verified == true, 'Should verifiable')

    const cd = await groth16.exportSolidityCallData(proof, publicSignals);
    callData = JSON.parse(`[${cd}]`);
    console.log('callData', callData);
  });

  describe("Proof of Passport SBT", function () {
    async function deployHardhatFixture() {
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

      return {verifier, proofOfPassport, formatter, owner, otherAccount, thirdAccount}
    }

    it("Verifier verifies a correct proof", async () => {
      const { verifier } = await loadFixture(deployHardhatFixture);

      expect(
        await verifier.verifyProof(callData[0], callData[1], callData[2], callData[3])
      ).to.be.true;
    });

    it("Should allow SBT minting", async function () {
      const { proofOfPassport, otherAccount, thirdAccount } = await loadFixture(
        deployHardhatFixture
      );

      await proofOfPassport
        .connect(thirdAccount) // fine that it's not the same account as address is taken from the proof
        .mint(...callData);

      expect(await proofOfPassport.balanceOf(otherAccount.address)).to.equal(1);
    });

    it("Shouldn't allow minting with an invalid proof", async function () {
      const { proofOfPassport, otherAccount } = await loadFixture(
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
      const { proofOfPassport, otherAccount } = await loadFixture(
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
      const { proofOfPassport, otherAccount } = await loadFixture(
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
    it.skip("Should allow minting using a proof generated by ark-circom", async function () {
      const newCallDataFromArkCircom = [["0x1b705a58553cffb9bc3a8db59a697b2fe74b8f2543656a3dbfe445697ae8ba8e", "0x1ce8c0f6a50a82184b0f1ca42136a20ba8cc97b57fdcdd2c6b229ca42137390b"], [["0x1702629fd4c1dedc03f91cf86dce3247c4f865829a031513123becf8f2bcd6f7", "0x1511f6385ddd0fcdda2469aa365de2ed6317c2a86ae2de0a41675ccd7ce716e9"], ["0x05ac0906dd573bc5aa47878267c2297792a93ae07d5970c30504e86f24c876af", "0x29efb34eb0e176460a8c5797660093abe95d005e90d6dae1d1b3e4d15c54ad3e"]], ["0x24bc6bb9a9eba6bcf0790e91c027be7c123b8896efcc82aa8e161fb14c8a7eb8", "0x06f667003028a257bf19fb38ae1124f53e0ac9a9736af469611d770e6c684f11"], ["0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x00000000000000000000000000000000f8b23bcf3ecb363ff9b3333b34c2dcb4", "0x00000000000000000000000000000000000000000000016d536c78e55b684d93", "0x000000000000000000000000000000000000000000000518776d3dc80018d102", "0x0000000000000000000000000000000000000000000002e4fbc5d4e68d6c9bf7", "0x0000000000000000000000000000000000000000000003873a30e9d962126f82", "0x000000000000000000000000000000000000000000000388a0d69ac0f1995668", "0x000000000000000000000000000000000000000000000c3cbf461924e4e645ef", "0x000000000000000000000000000000000000000000000a59ec146b8f392105e8", "0x0000000000000000000000000000000000000000000000742acc4c0c6e9b1b20", "0x0000000000000000000000000000000000000000000006f010a5ce0929d0b84b", "0x0000000000000000000000000000000000000000000002cfd0895be937a6ccb7", "0x0000000000000000000000000000000000000000000005a1d397686d1b4ad000", "0x000000000000000000000000e6e4b6a802f2e0aee5676f6010e0af5c9cdd0a50"]];
      // const callDataFromArkCircomGeneratedInTest = [ [ '0x07a378ec2b5bafc15a21fb9c549ba2554a4ef22cfca3d835f44d270f547d0913', '0x089bb81fb68200ef64652ada5edf71a98dcc8a931a54162b03b61647acbae1fe' ], [ [ '0x2127ae75494aed0c384567cc890639d7609040373d0a549e665a26a39b264449', '0x2f0ea6c99648171b7e166086108131c9402f9c5ac4a3759705a9c9217852e328' ], [ '0x04efcb825be258573ffe8c9149dd2b040ea3b8a9fa3dfa1c57a87b11c20c21ec', '0x2b500aece0e5a5a64a5c7262ec379efc1a23f4e46d968aebd42337642ea2bd3e' ] ], [ '0x1964dc2231bcd1e0de363c3d2a790346b7e634b5878498ce6e8db0ac972b8125', '0x0d94cd74a89b0ed777bb309ce960191acd23d5e9c5f418722d03f80944c5e3ed' ], [ '0x000000000000000000544e45524f4c4600000000000000000000000000000000', '0x0000000000000000000000000000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000000000000000000000000000', '0x000000000000000000000000000000000df267467de87516584863641a75504b', '0x00000000000000000000000000000000000000000000084c754a8650038f4c82', '0x000000000000000000000000000000000000000000000d38447935bb72a5193c', '0x000000000000000000000000000000000000000000000cac133b01f78ab24970', '0x0000000000000000000000000000000000000000000006064295cda88310ce6e', '0x000000000000000000000000000000000000000000001026cd8776cbd52df4b0', '0x000000000000000000000000000000000000000000000d4748d254334ce92b36', '0x0000000000000000000000000000000000000000000005c1b0ba7159834b0bf1', '0x00000000000000000000000000000000000000000000029d91f03395b916792a', '0x000000000000000000000000000000000000000000000bcfbb30f8ea70a224df', '0x00000000000000000000000000000000000000000000003dcd943c93e565aa3e', '0x0000000000000000000000000000000000000000000009e8ce7916ab0fb0b000', '0x000000000000000000000000ede0fa5a7b196f512204f286666e5ec03e1005d2' ] ];

      const proofOfPassportOnMumbaiAddress = '0x7D459347d092D35f043f73021f06c19f834f8c3E';
      const proofOfPassportOnMumbai = await ethers.getContractAt('ProofOfPassport', proofOfPassportOnMumbaiAddress);
      try {
        const tx = await proofOfPassportOnMumbai.mint(...newCallDataFromArkCircom as any);
        console.log('txHash', tx.hash);
        const receipt = await tx.wait();
        console.log('receipt', receipt)
        expect(receipt?.status).to.equal(1);
      } catch (error) {
        console.error(error);
        expect(true).to.equal(false);
      }
    });

    it.skip("Should allow minting using lambda function", async function () {
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
