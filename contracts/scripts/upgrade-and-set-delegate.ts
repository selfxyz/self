/**
 * Upgrade BridgeAdapter and set endpoint delegate
 */

import { ethers } from "hardhat";

const SEPOLIA_BRIDGE_ADAPTER_PROXY = "0x4A2Ca34AC976B55bE875befa11645e8b940FF26F";

async function main() {
    console.log("\n=== Upgrade BridgeAdapter and Set Delegate ===\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Proxy:", SEPOLIA_BRIDGE_ADAPTER_PROXY);

    // Deploy new implementation
    console.log("\n1. Deploying new BridgeAdapter implementation...");
    const BridgeAdapter = await ethers.getContractFactory("BridgeAdapter");
    const newImpl = await BridgeAdapter.deploy();
    await newImpl.waitForDeployment();
    const newImplAddress = await newImpl.getAddress();
    console.log("   New implementation deployed at:", newImplAddress);

    // Get current proxy contract
    const proxy = await ethers.getContractAt("BridgeAdapter", SEPOLIA_BRIDGE_ADAPTER_PROXY);

    // Upgrade proxy
    console.log("\n2. Upgrading proxy...");
    const tx1 = await proxy.upgradeToAndCall(newImplAddress, "0x");
    await tx1.wait();
    console.log("   ✅ Proxy upgraded");

    // Set endpoint delegate
    console.log("\n3. Setting endpoint delegate...");
    console.log("   Delegate:", deployer.address);
    const tx2 = await proxy.setEndpointDelegate(deployer.address);
    await tx2.wait();
    console.log("   ✅ Delegate set on LayerZero endpoint");

    // Verify
    console.log("\n4. Verifying configuration...");
    const endpoint = await proxy.bridgeEndpoint();
    console.log("   Bridge endpoint:", endpoint);

    console.log("\n✅ Upgrade and delegate setup complete!");
    console.log("\nNow retry the E2E test.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });



