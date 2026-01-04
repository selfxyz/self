import { ethers } from "hardhat";

const SEPOLIA_BRIDGE_ADAPTER = "0x4A2Ca34AC976B55bE875befa11645e8b940FF26F";
const BASE_SEPOLIA_CHAIN_ID = 84532;

async function main() {
    console.log("\n=== Verifying BridgeAdapter Configuration ===\n");

    const BridgeAdapter = await ethers.getContractFactory("BridgeAdapter");
    const bridgeAdapter = BridgeAdapter.attach(SEPOLIA_BRIDGE_ADAPTER);

    // Check bridge endpoint
    const endpoint = await bridgeAdapter.bridgeEndpoint();
    console.log("Bridge Endpoint:", endpoint);

    // Check destination hub
    const destHub = await bridgeAdapter.destHubs(BASE_SEPOLIA_CHAIN_ID);
    console.log("Destination Hub for chain", BASE_SEPOLIA_CHAIN_ID + ":", destHub);

    // Check chain EID
    const chainEid = await bridgeAdapter.chainEids(BASE_SEPOLIA_CHAIN_ID);
    console.log("Chain EID for chain", BASE_SEPOLIA_CHAIN_ID + ":", chainEid.toString());

    // Check LZ receive gas limit
    const gasLimit = await bridgeAdapter.lzReceiveGasLimit();
    console.log("LZ Receive Gas Limit:", gasLimit.toString());

    // Check HUB_ROLE
    const HUB_ROLE = await bridgeAdapter.HUB_ROLE();
    console.log("\nHUB_ROLE:", HUB_ROLE);

    const [deployer] = await ethers.getSigners();
    const hasRole = await bridgeAdapter.hasRole(HUB_ROLE, deployer.address);
    console.log("Deployer has HUB_ROLE:", hasRole);

    // Summary
    console.log("\n=== Configuration Status ===");
    if (endpoint === ethers.ZeroAddress) {
        console.log("❌ Bridge endpoint not set!");
    } else {
        console.log("✅ Bridge endpoint set");
    }

    if (destHub === ethers.ZeroHash) {
        console.log("❌ Destination hub not set for Base Sepolia!");
    } else {
        console.log("✅ Destination hub set for Base Sepolia");
    }

    if (chainEid === 0n) {
        console.log("❌ Chain EID not set for Base Sepolia!");
    } else {
        console.log("✅ Chain EID set for Base Sepolia");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });



