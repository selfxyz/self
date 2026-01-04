/**
 * Simple test of BridgeAdapter with minimal parameters
 */

import { ethers } from "hardhat";

const SEPOLIA_BRIDGE_ADAPTER = "0x4A2Ca34AC976B55bE875befa11645e8b940FF26F";
const BASE_SEPOLIA_MULTICHAIN_HUB = "0x7f134978E051C313EaAc344372C0D8e75d15aAcF";
const BASE_SEPOLIA_TEST_DAPP = "0xC6F41Ff1c43a9DfA42262Bb6723Fb5cCfD1e7AB8";
const BASE_SEPOLIA_CHAIN_ID = 84532;

async function main() {
    console.log("\n=== Simple BridgeAdapter Test ===\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const BridgeAdapter = await ethers.getContractFactory("BridgeAdapter");
    const bridgeAdapter = BridgeAdapter.attach(SEPOLIA_BRIDGE_ADAPTER);

    // Grant HUB_ROLE
    console.log("\n1. Granting HUB_ROLE...");
    const HUB_ROLE = await bridgeAdapter.HUB_ROLE();
    const hasRole = await bridgeAdapter.hasRole(HUB_ROLE, deployer.address);
    if (!hasRole) {
        await (await bridgeAdapter.grantHubRole(deployer.address)).wait();
        console.log("   ✅ Role granted");
    } else {
        console.log("   Already has role");
    }

    // Use very simple output and userData
    const simpleOutput = "0x1234";
    const simpleUserData = "0x5678";

    // Quote
    console.log("\n2. Quoting bridge fee...");
    const fee = await bridgeAdapter.quoteBridgeFee(
        BASE_SEPOLIA_CHAIN_ID,
        BASE_SEPOLIA_TEST_DAPP,
        simpleOutput,
        simpleUserData
    );
    console.log("   Fee:", ethers.formatEther(fee), "ETH");

    // Send with exact fee (not overpaying)
    console.log("\n3. Sending bridge message...");
    console.log("   Output:", simpleOutput);
    console.log("   UserData:", simpleUserData);

    try {
        const tx = await bridgeAdapter.sendBridgeMessage(
            BASE_SEPOLIA_CHAIN_ID,
            BASE_SEPOLIA_TEST_DAPP,
            simpleOutput,
            simpleUserData,
            deployer.address,
            { value: fee, gasLimit: 500000 }
        );
        console.log("   Transaction sent:", tx.hash);

        const receipt = await tx.wait();
        console.log("   ✅ Transaction confirmed!");
        console.log("   Block:", receipt?.blockNumber);
        console.log("   Gas used:", receipt?.gasUsed.toString());

    } catch (error: any) {
        console.error("   ❌ Failed:", error.message);

        // Try to get revert reason
        if (error.receipt) {
            console.log("   Receipt status:", error.receipt.status);
            console.log("   Gas used:", error.receipt.gasUsed);
        }
    }

    // Revoke role
    console.log("\n4. Revoking HUB_ROLE...");
    await (await bridgeAdapter.revokeHubRole(deployer.address)).wait();
    console.log("   ✅ Role revoked");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });



