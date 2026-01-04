/**
 * Manual upgrade of BridgeAdapter to add receive() function
 * Uses UUPS upgrade pattern directly
 */

import { ethers } from "hardhat";

const SEPOLIA_BRIDGE_ADAPTER_PROXY = "0x4A2Ca34AC976B55bE875befa11645e8b940FF26F";

async function main() {
    console.log("\n=== Manual Upgrade of BridgeAdapter ===\n");

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

    // Get current proxy contract with UUPS interface
    const proxy = await ethers.getContractAt("BridgeAdapter", SEPOLIA_BRIDGE_ADAPTER_PROXY);

    // Verify deployer has admin role
    const DEFAULT_ADMIN_ROLE = await proxy.DEFAULT_ADMIN_ROLE();
    const hasAdmin = await proxy.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
    console.log("\n2. Checking admin role...");
    console.log("   Deployer has DEFAULT_ADMIN_ROLE:", hasAdmin);

    if (!hasAdmin) {
        console.log("   ❌ Deployer doesn't have admin role, cannot upgrade!");
        return;
    }

    // Call upgradeToAndCall
    console.log("\n3. Upgrading proxy to new implementation...");
    const tx = await proxy.upgradeToAndCall(newImplAddress, "0x");
    console.log("   Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("   ✅ Upgrade confirmed in block:", receipt?.blockNumber);

    // Verify upgrade
    console.log("\n4. Verifying upgrade...");
    const endpoint = await proxy.bridgeEndpoint();
    console.log("   Bridge endpoint still set:", endpoint);

    // Try to send ETH to the contract to verify receive() works
    console.log("\n5. Testing receive() function...");
    try {
        const testTx = await deployer.sendTransaction({
            to: SEPOLIA_BRIDGE_ADAPTER_PROXY,
            value: ethers.parseEther("0.0001")
        });
        await testTx.wait();
        console.log("   ✅ receive() function works! Can receive ETH.");

        // Check balance
        const balance = await ethers.provider.getBalance(SEPOLIA_BRIDGE_ADAPTER_PROXY);
        console.log("   Contract balance:", ethers.formatEther(balance), "ETH");
    } catch (error: any) {
        console.log("   ❌ receive() test failed:", error.message);
    }

    console.log("\n✅ Upgrade complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });



