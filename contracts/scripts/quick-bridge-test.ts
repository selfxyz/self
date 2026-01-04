/**
 * Quick Bridge Test - Sends a test message via LayerZero
 */
import { ethers } from "hardhat";

const SEPOLIA_BRIDGE_ADAPTER = "0x1640B2E95909328c83d1987A8902EB8c7a766e97";
const BASE_SEPOLIA_TEST_DAPP = "0x651cBceE1180f5800e1970bAeC694bC94EF10fD8";
const BASE_SEPOLIA_CHAIN_ID = 84532;

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const BridgeAdapter = await ethers.getContractFactory("BridgeAdapter");
    const bridgeAdapter = BridgeAdapter.attach(SEPOLIA_BRIDGE_ADAPTER);

    // Check if we already have HUB_ROLE
    const HUB_ROLE = await bridgeAdapter.HUB_ROLE();
    const hasRole = await bridgeAdapter.hasRole(HUB_ROLE, deployer.address);
    console.log("Has HUB_ROLE:", hasRole);

    if (!hasRole) {
        console.log("Granting HUB_ROLE...");
        const tx = await bridgeAdapter.grantHubRole(deployer.address);
        await tx.wait();
        console.log("HUB_ROLE granted");
    }

    // Create simple mock data
    const mockOutput = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [deployer.address, Date.now()]
    );
    const mockUserData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [12345n]
    );

    // Quote fee
    console.log("\nQuoting bridge fee...");
    const fee = await bridgeAdapter.quoteBridgeFee(
        BASE_SEPOLIA_CHAIN_ID,
        BASE_SEPOLIA_TEST_DAPP,
        mockOutput,
        mockUserData
    );
    console.log("Fee:", ethers.formatEther(fee), "ETH");

    // Send message
    console.log("\nSending bridge message...");
    const tx = await bridgeAdapter.sendBridgeMessage(
        BASE_SEPOLIA_CHAIN_ID,
        BASE_SEPOLIA_TEST_DAPP,
        mockOutput,
        mockUserData,
        deployer.address,
        { value: fee, gasLimit: 500000 }
    );
    console.log("Transaction hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("Confirmed in block:", receipt?.blockNumber);
    console.log("\n✅ Message sent! Check LayerZero Scan:");
    console.log(`   https://testnet.layerzeroscan.com/tx/${tx.hash}`);
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });



