/**
 * Configure LayerZero Peers for Multichain E2E
 *
 * This script configures the peer relationships between:
 * - Sepolia BridgeAdapter -> Base Sepolia MultichainHub
 * - Base Sepolia MultichainHub -> Sepolia IdentityVerificationHubImplV2
 */

import { ethers } from "hardhat";

// Deployed contract addresses (latest deployment with gas fix)
const SEPOLIA_HUB = "0x10889E87186B35166254e6a19B6452F5CF1A9Be7";
const SEPOLIA_BRIDGE_ADAPTER = "0x1640B2E95909328c83d1987A8902EB8c7a766e97";
const BASE_SEPOLIA_MULTICHAIN_HUB = "0x924000D6b92955197631632e312D5E9032597535";

// Note: For LayerZero OApp pattern, peers are set by EID, not chainId
// - Sepolia BridgeAdapter -> Base Sepolia MultichainHub (peer)
// - Base Sepolia MultichainHub -> Sepolia BridgeAdapter (peer)

// Chain IDs
const SEPOLIA_CHAIN_ID = 11155111;
const BASE_SEPOLIA_CHAIN_ID = 84532;

// LayerZero Endpoint IDs (EIDs)
const SEPOLIA_EID = 40161;
const BASE_SEPOLIA_EID = 40245;

async function configureSepolia() {
    console.log("\n=== Configuring Sepolia BridgeAdapter ===");
    const [deployer] = await ethers.getSigners();

    const BridgeAdapter = await ethers.getContractFactory("BridgeAdapter");
    const bridgeAdapter = BridgeAdapter.attach(SEPOLIA_BRIDGE_ADAPTER);

    // Convert Base Sepolia MultichainHub address to bytes32
    const destHubBytes32 = ethers.zeroPadValue(BASE_SEPOLIA_MULTICHAIN_HUB, 32);

    console.log("1. Setting LayerZero EID for Base Sepolia (for backward compatibility)...");
    console.log("   Chain ID:", BASE_SEPOLIA_CHAIN_ID);
    console.log("   LayerZero EID:", BASE_SEPOLIA_EID);
    const tx1 = await bridgeAdapter.connect(deployer).setChainEid(BASE_SEPOLIA_CHAIN_ID, BASE_SEPOLIA_EID);
    await tx1.wait();
    console.log("   ✅ Transaction:", tx1.hash);

    console.log("\n2. Setting peer for Base Sepolia (OApp pattern)...");
    console.log("   EID:", BASE_SEPOLIA_EID);
    console.log("   Peer address (bytes32):", destHubBytes32);
    const tx2 = await bridgeAdapter.connect(deployer).setPeer(BASE_SEPOLIA_EID, destHubBytes32);
    await tx2.wait();
    console.log("   ✅ Transaction:", tx2.hash);

    console.log("\n✅ Sepolia BridgeAdapter configured successfully");
}

async function configureBaseSepolia() {
    console.log("\n=== Configuring Base Sepolia MultichainHub ===");
    const [deployer] = await ethers.getSigners();

    const MultichainHub = await ethers.getContractFactory("IdentityVerificationHubMultichain");
    const multichainHub = MultichainHub.attach(BASE_SEPOLIA_MULTICHAIN_HUB);

    // Convert Sepolia BridgeAdapter address to bytes32 (this is the sender)
    const sourceBridgeAdapterBytes32 = ethers.zeroPadValue(SEPOLIA_BRIDGE_ADAPTER, 32);

    console.log("1. Setting peer for Sepolia (OApp pattern)...");
    console.log("   EID:", SEPOLIA_EID);
    console.log("   Peer address (bytes32):", sourceBridgeAdapterBytes32);
    console.log("   Note: This sets Sepolia BridgeAdapter as the trusted peer");
    const tx = await multichainHub.connect(deployer).setPeer(SEPOLIA_EID, sourceBridgeAdapterBytes32);
    await tx.wait();
    console.log("   ✅ Transaction:", tx.hash);

    // Also set chainId mapping for backward compatibility
    console.log("\n2. Setting chainId mapping for backward compatibility...");
    console.log("   Chain ID:", SEPOLIA_CHAIN_ID);
    console.log("   EID:", SEPOLIA_EID);
    const tx2 = await multichainHub.connect(deployer).setSourceHub(SEPOLIA_CHAIN_ID, sourceBridgeAdapterBytes32, SEPOLIA_EID);
    await tx2.wait();
    console.log("   ✅ Transaction:", tx2.hash);

    console.log("\n✅ Base Sepolia MultichainHub configured successfully");
}

async function verifySepolia() {
    console.log("\n=== Verifying Sepolia Configuration ===");

    const BridgeAdapter = await ethers.getContractFactory("BridgeAdapter");
    const bridgeAdapter = BridgeAdapter.attach(SEPOLIA_BRIDGE_ADAPTER);

    // Check peer using OAppCore's peers mapping
    const destPeer = await bridgeAdapter.peers(BASE_SEPOLIA_EID);
    const destEid = await bridgeAdapter.chainEids(BASE_SEPOLIA_CHAIN_ID);

    console.log("   Peer for EID", BASE_SEPOLIA_EID + ":", destPeer);
    console.log("   LayerZero EID for", BASE_SEPOLIA_CHAIN_ID + ":", destEid.toString());

    const expectedDestPeer = ethers.zeroPadValue(BASE_SEPOLIA_MULTICHAIN_HUB, 32).toLowerCase();

    if (destPeer.toLowerCase() === expectedDestPeer && destEid === BigInt(BASE_SEPOLIA_EID)) {
        console.log("\n   ✅ Sepolia -> Base Sepolia peer configured correctly");
        return true;
    } else {
        console.log("\n   ❌ Sepolia -> Base Sepolia peer configuration mismatch");
        console.log("   Expected:", expectedDestPeer);
        console.log("   Got:", destPeer.toLowerCase());
        return false;
    }
}

async function verifyBaseSepolia() {
    console.log("\n=== Verifying Base Sepolia Configuration ===");

    const MultichainHub = await ethers.getContractFactory("IdentityVerificationHubMultichain");
    const multichainHub = MultichainHub.attach(BASE_SEPOLIA_MULTICHAIN_HUB);

    // Check peer using OAppCore's peers mapping
    const sourcePeer = await multichainHub.peers(SEPOLIA_EID);
    const sourceHub = await multichainHub.getSourceHub(SEPOLIA_CHAIN_ID);

    console.log("   Peer for EID", SEPOLIA_EID + ":", sourcePeer);
    console.log("   Source Hub for", SEPOLIA_CHAIN_ID + ":", sourceHub);

    const expectedSourcePeer = ethers.zeroPadValue(SEPOLIA_BRIDGE_ADAPTER, 32).toLowerCase();

    if (sourcePeer.toLowerCase() === expectedSourcePeer) {
        console.log("\n   ✅ Base Sepolia -> Sepolia peer configured correctly");
        return true;
    } else {
        console.log("\n   ❌ Base Sepolia -> Sepolia peer configuration mismatch");
        console.log("   Expected:", expectedSourcePeer);
        console.log("   Got:", sourcePeer.toLowerCase());
        return false;
    }
}

// Auto-detect network and run appropriate configuration
async function run() {
    const network = (await ethers.provider.getNetwork()).chainId;

    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║   Configure LayerZero Peers                       ║");
    console.log("╚════════════════════════════════════════════════════╝");

    if (network === BigInt(SEPOLIA_CHAIN_ID)) {
        await configureSepolia();
        await verifySepolia();
        console.log("\n⚠️  Next step: Configure Base Sepolia");
        console.log("   Command: npx hardhat run scripts/configure-multichain-peers.ts --network base-sepolia\n");
    } else if (network === BigInt(BASE_SEPOLIA_CHAIN_ID)) {
        await configureBaseSepolia();
        await verifyBaseSepolia();
        console.log("\n✅ All peers configured successfully!\n");
    } else {
        console.error("❌ Unsupported network. Please use --network sepolia or --network base-sepolia");
        process.exit(1);
    }
}

run()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
