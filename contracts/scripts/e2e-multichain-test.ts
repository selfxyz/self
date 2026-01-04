/**
 * Multichain E2E Test Script
 *
 * Tests the complete multichain flow on deployed Sepolia/Base Sepolia contracts:
 * 1. Send test message via BridgeAdapter on Sepolia
 * 2. Monitor LayerZero delivery
 * 3. Verify callback received on Base Sepolia
 *
 * This uses REAL LayerZero testnet infrastructure.
 */

import { ethers, network } from "hardhat";
import axios from "axios";

// Deployed contract addresses (latest deployment with gas fix)
const SEPOLIA_BRIDGE_ADAPTER = "0x1640B2E95909328c83d1987A8902EB8c7a766e97";
const BASE_SEPOLIA_MULTICHAIN_HUB = "0x924000D6b92955197631632e312D5E9032597535";
const BASE_SEPOLIA_TEST_DAPP = "0x651cBceE1180f5800e1970bAeC694bC94EF10fD8";

// Chain IDs
const BASE_SEPOLIA_CHAIN_ID = 84532;

// LayerZero Scan API
const LZ_SCAN_API = "https://scan-testnet.layerzero-api.com/v1";

interface LayerZeroMessage {
    srcChainKey: string;
    srcUaAddress: string;
    dstChainKey: string;
    dstUaAddress: string;
    srcUaNonce: number;
    status: string;
    updated: number;
    created: number;
}

async function ensureHubRole(): Promise<boolean> {
    console.log("\n=== Checking HUB_ROLE ===");
    const [deployer] = await ethers.getSigners();

    const BridgeAdapter = await ethers.getContractFactory("BridgeAdapter");
    const bridgeAdapter = BridgeAdapter.attach(SEPOLIA_BRIDGE_ADAPTER);

    const HUB_ROLE = await bridgeAdapter.HUB_ROLE();
    const hasRole = await bridgeAdapter.hasRole(HUB_ROLE, deployer.address);

    if (hasRole) {
        console.log("   ✅ Already has HUB_ROLE");
        return false;
    }

    console.log("   Granting HUB_ROLE to:", deployer.address);
    const tx = await bridgeAdapter.grantHubRole(deployer.address, { gasLimit: 100000 });
    console.log("   Transaction sent:", tx.hash);
    await tx.wait();
    console.log("   ✅ HUB_ROLE granted");
    return true;
}

async function sendBridgeMessage(): Promise<{ txHash: string; fee: bigint }> {
    console.log("\n=== Sending Bridge Message ===");
    const [deployer] = await ethers.getSigners();

    const BridgeAdapter = await ethers.getContractFactory("BridgeAdapter");
    const bridgeAdapter = BridgeAdapter.attach(SEPOLIA_BRIDGE_ADAPTER);

    // Create mock verification output
    const timestamp = Date.now();
    const mockOutput = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [deployer.address, timestamp]
    );
    const mockUserData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [12345n]
    );

    // Quote fee
    console.log("   Quoting bridge fee...");
    const fee = await bridgeAdapter.quoteBridgeFee(
        BASE_SEPOLIA_CHAIN_ID,
        BASE_SEPOLIA_TEST_DAPP,
        mockOutput,
        mockUserData
    );
    console.log("   Fee:", ethers.formatEther(fee), "ETH");

    // Send message
    console.log("   Sending message...");
    console.log("   Destination Chain:", BASE_SEPOLIA_CHAIN_ID);
    console.log("   Destination DApp:", BASE_SEPOLIA_TEST_DAPP);

    const tx = await bridgeAdapter.sendBridgeMessage(
        BASE_SEPOLIA_CHAIN_ID,
        BASE_SEPOLIA_TEST_DAPP,
        mockOutput,
        mockUserData,
        deployer.address,
        { value: fee, gasLimit: 500000 }
    );

    console.log("   ✅ Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("   ✅ Confirmed in block:", receipt?.blockNumber);
    console.log("   Gas used:", receipt?.gasUsed.toString());

    return { txHash: tx.hash, fee };
}

async function monitorLayerZeroDelivery(txHash: string): Promise<LayerZeroMessage | null> {
    console.log("\n=== Monitoring LayerZero Delivery ===");
    console.log("   Transaction hash:", txHash);
    console.log("   LayerZero Scan: https://testnet.layerzeroscan.com/tx/" + txHash);
    console.log("\n   Waiting for LayerZero to index and deliver the message...\n");

    const maxAttempts = 30;
    const pollInterval = 10000; // 10 seconds

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const response = await axios.get(`${LZ_SCAN_API}/messages/tx/${txHash}`, {
                headers: { 'Accept': 'application/json' },
                timeout: 5000
            });

            if (response.data && response.data.messages && response.data.messages.length > 0) {
                const message: LayerZeroMessage = response.data.messages[0];

                process.stdout.write(`\r   [${attempt}/${maxAttempts}] Status: ${message.status.padEnd(15)}`);

                if (message.status === "DELIVERED") {
                    console.log("\n\n   ✅ Message DELIVERED successfully!");
                    console.log("   Source Chain:", message.srcChainKey);
                    console.log("   Destination Chain:", message.dstChainKey);
                    console.log("   Nonce:", message.srcUaNonce);
                    console.log("   Delivered at:", new Date(message.updated * 1000).toISOString());
                    return message;
                } else if (message.status === "FAILED") {
                    console.log("\n\n   ❌ Message delivery FAILED");
                    return message;
                }
            } else {
                process.stdout.write(`\r   [${attempt}/${maxAttempts}] Waiting for indexing...     `);
            }
        } catch (error: any) {
            if (error.response?.status === 404) {
                process.stdout.write(`\r   [${attempt}/${maxAttempts}] Not indexed yet...          `);
            } else {
                process.stdout.write(`\r   [${attempt}/${maxAttempts}] Checking...                 `);
            }
        }

        if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
    }

    console.log("\n\n   ⚠️  Timeout: Check LayerZero Scan manually");
    return null;
}

async function verifyDestinationCallback(): Promise<number> {
    console.log("\n=== Verifying Callback on Base Sepolia ===");

    // Use Base Sepolia RPC
    const baseSepoliaRpc = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
    const provider = new ethers.JsonRpcProvider(baseSepoliaRpc);

    const TestDApp = await ethers.getContractFactory("TestMultichainDApp");
    const testDApp = TestDApp.attach(BASE_SEPOLIA_TEST_DAPP).connect(provider);

    try {
        const verificationCount = await testDApp.verificationCount();
        console.log("   Verification count:", verificationCount.toString());

        // Query recent events (limited to 10 blocks for free RPC tiers)
        const filter = testDApp.filters.VerificationReceived();
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 9); // Free tier limit

        console.log("   Checking blocks", fromBlock, "to", currentBlock, "(last 10 blocks)");

        const events = await testDApp.queryFilter(filter, fromBlock, currentBlock);

        if (events.length > 0) {
            console.log(`\n   ✅ Found ${events.length} verification event(s)!`);
            const latest = events[events.length - 1];
            console.log("   Latest verification:");
            console.log("     Block:", latest.blockNumber);
            console.log("     TX:", latest.transactionHash);
        } else {
            console.log("   ⚠️  No recent verification events found");
            console.log("   (This may take a minute to propagate)");
        }

        return Number(verificationCount);
    } catch (error: any) {
        console.error("   ❌ Error checking destination:", error.message);
        return 0;
    }
}

async function main() {
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║   E2E Test #1: Multichain (Sepolia → Base Sepolia)         ║");
    console.log("║   Using LayerZero OApp Upgradeable Pattern                 ║");
    console.log("╚════════════════════════════════════════════════════════════╝");

    const [deployer] = await ethers.getSigners();
    console.log("\nDeployer:", deployer.address);
    console.log("Network:", network.name);

    // Check balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH");

    if (balance < ethers.parseEther("0.01")) {
        console.log("\n❌ Insufficient balance. Need at least 0.01 ETH");
        process.exit(1);
    }

    let roleGranted = false;

    try {
        // Step 1: Ensure HUB_ROLE
        roleGranted = await ensureHubRole();

        // Step 2: Send bridge message
        const { txHash } = await sendBridgeMessage();

        // Step 3: Monitor LayerZero delivery
        const message = await monitorLayerZeroDelivery(txHash);

        // Step 4: Verify destination callback
        const count = await verifyDestinationCallback();

        // Summary
        console.log("\n╔════════════════════════════════════════════════════════════╗");
        console.log("║   E2E Test Summary                                         ║");
        console.log("╚════════════════════════════════════════════════════════════╝");
        console.log("Transaction:", txHash);
        console.log("LayerZero Status:", message?.status || "PENDING");
        console.log("Destination Verification Count:", count);
        console.log("\nLayerZero Scan: https://testnet.layerzeroscan.com/tx/" + txHash);

        if (message?.status === "DELIVERED") {
            console.log("\n✅ E2E TEST #1 PASSED!");
            console.log("   Cross-chain message successfully delivered via LayerZero!");
        } else if (message?.status === "INFLIGHT" || !message) {
            console.log("\n⏳ E2E TEST #1 IN PROGRESS");
            console.log("   Message sent but delivery pending. Check LayerZero Scan for updates.");
        } else {
            console.log("\n❌ E2E TEST #1 FAILED");
            console.log("   Status:", message?.status);
        }

    } catch (error: any) {
        console.error("\n❌ E2E TEST FAILED");
        console.error("Error:", error.message);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
