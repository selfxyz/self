/**
 * Deploy MultichainDemoApp to Base Mainnet
 *
 * This contract receives bridged verification data from Celo via LayerZero.
 * It stores disclosed nationality, bridged message, and verification timestamps.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-multichain-demo.ts --network base
 *
 * For testnet (Base Sepolia):
 *   npx hardhat run scripts/deploy-multichain-demo.ts --network base-sepolia
 */

import { ethers, network } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    const networkName = network.name;
    const chainId = (await ethers.provider.getNetwork()).chainId;

    console.log("\n=== Deploying MultichainDemoApp ===");
    console.log("Network:", networkName);
    console.log("Chain ID:", chainId.toString());
    console.log("Deployer:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
        throw new Error("Deployer has no balance. Please fund the deployer address.");
    }

    // Deploy MultichainDemoApp
    console.log("\nDeploying MultichainDemoApp...");
    const MultichainDemoApp = await ethers.getContractFactory("MultichainDemoApp");
    const demoApp = await MultichainDemoApp.deploy();
    await demoApp.waitForDeployment();

    const demoAppAddress = await demoApp.getAddress();
    console.log("✅ MultichainDemoApp deployed at:", demoAppAddress);

    // Verify deployment
    const scope = await demoApp.SCOPE();
    console.log("   Scope:", scope.toString());

    const count = await demoApp.getVerificationCount();
    console.log("   Initial verification count:", count.toString());

    // Determine block explorer URL
    let explorerUrl = "";
    if (networkName === "base") {
        explorerUrl = `https://basescan.org/address/${demoAppAddress}`;
    } else if (networkName === "base-sepolia") {
        explorerUrl = `https://sepolia.basescan.org/address/${demoAppAddress}`;
    }

    console.log("\n=== Deployment Summary ===");
    console.log("MultichainDemoApp:", demoAppAddress);
    console.log("Network:", networkName);
    console.log("Chain ID:", chainId.toString());
    if (explorerUrl) {
        console.log("Explorer:", explorerUrl);
    }

    console.log("\n=== Next Steps ===");
    console.log("1. Update .env.local in demo-frontend with:");
    console.log(`   NEXT_PUBLIC_SELF_ENDPOINT=${demoAppAddress}`);
    console.log(`   NEXT_PUBLIC_RECEIVER_ADDRESS=${demoAppAddress}`);
    console.log("");
    console.log("2. Ensure the MultichainHub on this chain is configured to allow callbacks");
    console.log("   The MultichainHub calls onVerificationSuccess() on your dApp");
    console.log("");
    console.log("3. For mainnet: Ensure Celo Hub and Base MultichainHub peers are configured");
    console.log("   Run: npx hardhat run scripts/configure-mainnet-peers.ts --network base");

    return demoAppAddress;
}

main()
    .then((address) => {
        console.log("\n✅ Deployment successful!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Deployment failed:", error);
        process.exit(1);
    });


