/**
 * Deploy and test a minimal OApp to understand LayerZero V2 send pattern
 */

import { ethers } from "hardhat";

const SEPOLIA_LZ_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";
const BASE_SEPOLIA_MULTICHAIN_HUB = "0x7f134978E051C313EaAc344372C0D8e75d15aAcF";
const BASE_SEPOLIA_EID = 40245;

async function main() {
    console.log("\n=== Testing Minimal OApp Sender ===\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Deploy TestOAppSender
    console.log("\n1. Deploying TestOAppSender...");
    const TestOAppSender = await ethers.getContractFactory("TestOAppSender");
    const oapp = await TestOAppSender.deploy(SEPOLIA_LZ_ENDPOINT, deployer.address);
    await oapp.waitForDeployment();
    console.log("   Deployed at:", await oapp.getAddress());

    // Set peer (required for OApp to send)
    console.log("\n2. Setting peer for Base Sepolia...");
    const peerBytes32 = ethers.zeroPadValue(BASE_SEPOLIA_MULTICHAIN_HUB, 32);
    const tx1 = await oapp.setPeer(BASE_SEPOLIA_EID, peerBytes32);
    await tx1.wait();
    console.log("   ✅ Peer set:", peerBytes32);

    // Quote fee
    console.log("\n3. Quoting fee...");
    const message = ethers.toUtf8Bytes("Hello from OApp!");
    const gasLimit = 200000n;
    const fee = await oapp.quote(BASE_SEPOLIA_EID, message, gasLimit);
    console.log("   Native fee:", ethers.formatEther(fee.nativeFee), "ETH");

    // Send message
    console.log("\n4. Sending message via OApp...");
    try {
        const tx = await oapp.send(BASE_SEPOLIA_EID, message, gasLimit, { value: fee.nativeFee });
        console.log("   Transaction sent:", tx.hash);

        const receipt = await tx.wait();
        console.log("   ✅ Transaction confirmed!");
        console.log("   Block:", receipt?.blockNumber);
        console.log("   Gas used:", receipt?.gasUsed.toString());

        console.log("\n✅ OApp send succeeded!");
        console.log("   This confirms LayerZero V2 requires the OApp pattern with setPeer().");

    } catch (error: any) {
        console.error("   ❌ Send failed:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });



