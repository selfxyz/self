/**
 * Upgrade BridgeAdapter to add receive() function
 */

import { ethers, upgrades } from "hardhat";

const SEPOLIA_BRIDGE_ADAPTER_PROXY = "0x4A2Ca34AC976B55bE875befa11645e8b940FF26F";

async function main() {
    console.log("\n=== Upgrading BridgeAdapter ===\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Proxy:", SEPOLIA_BRIDGE_ADAPTER_PROXY);

    console.log("\n1. Deploying new BridgeAdapter implementation...");
    const BridgeAdapterV2 = await ethers.getContractFactory("BridgeAdapter");
    
    const upgraded = await upgrades.upgradeProxy(SEPOLIA_BRIDGE_ADAPTER_PROXY, BridgeAdapterV2);
    await upgraded.waitForDeployment();
    
    const newImplAddress = await upgrades.erc1967.getImplementationAddress(SEPOLIA_BRIDGE_ADAPTER_PROXY);
    
    console.log("   ✅ New implementation deployed:", newImplAddress);
    console.log("   ✅ Proxy upgraded successfully!");

    // Verify the upgrade
    console.log("\n2. Verifying upgrade...");
    const bridgeAdapter = BridgeAdapterV2.attach(SEPOLIA_BRIDGE_ADAPTER_PROXY);
    
    const endpoint = await bridgeAdapter.bridgeEndpoint();
    console.log("   Bridge endpoint still set:", endpoint);
    
    console.log("\n✅ Upgrade complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });




