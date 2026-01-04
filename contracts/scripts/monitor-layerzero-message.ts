/**
 * Monitor LayerZero message delivery status
 */

import axios from "axios";

const LAYERZERO_SCAN_API_BASE_URL = "https://scan-testnet.layerzero-api.com/v1/messages";
const TX_HASH = "0xcf53e3d56a46cbaddbfb77b0111874dbbfc10f4b29b78b2641dc66054421f4f7";
const POLL_INTERVAL_MS = 30000; // 30 seconds
const MAX_ATTEMPTS = 40; // 40 * 30s = 20 minutes

async function monitorMessage() {
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║   Monitoring LayerZero Message Delivery                  ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log("Transaction Hash:", TX_HASH);
    console.log("LayerZero Scan Link: https://testnet.layerzeroscan.com/tx/" + TX_HASH);
    console.log("\nPolling every", POLL_INTERVAL_MS / 1000, "seconds...\n");

    let attempts = 0;
    let lastStatus = "";

    while (attempts < MAX_ATTEMPTS) {
        attempts++;

        try {
            const response = await axios.get(
                `${LAYERZERO_SCAN_API_BASE_URL}?srcTxHash=${TX_HASH}`,
                { timeout: 10000 }
            );

            if (response.data && response.data.messages && response.data.messages.length > 0) {
                const message = response.data.messages[0];
                const status = message.status || "UNKNOWN";

                // Only log if status changed
                if (status !== lastStatus) {
                    const timestamp = new Date().toLocaleTimeString();
                    console.log(`[${timestamp}] Attempt ${attempts}/${MAX_ATTEMPTS}: Status = ${status}`);

                    if (message.dstTxHash) {
                        console.log(`  ✅ Destination Tx Hash: ${message.dstTxHash}`);
                        console.log(`  📍 View on Base Sepolia: https://sepolia.basescan.org/tx/${message.dstTxHash}`);
                    }

                    if (status === "DELIVERED") {
                        console.log("\n🎉 MESSAGE DELIVERED SUCCESSFULLY!");
                        console.log("✅ Cross-chain message reached Base Sepolia");
                        return message;
                    }

                    lastStatus = status;
                } else {
                    // Status unchanged, show progress indicator
                    process.stdout.write(`\r[${new Date().toLocaleTimeString()}] Polling... (${attempts}/${MAX_ATTEMPTS}) - Status: ${status}`);
                }
            } else {
                process.stdout.write(`\r[${new Date().toLocaleTimeString()}] Message not indexed yet... (${attempts}/${MAX_ATTEMPTS})`);
            }
        } catch (error: any) {
            if (error.response?.status === 404) {
                process.stdout.write(`\r[${new Date().toLocaleTimeString()}] Message not found in LayerZero Scan... (${attempts}/${MAX_ATTEMPTS})`);
            } else {
                console.error(`\n❌ Error polling: ${error.message}`);
            }
        }

        // Wait before next poll
        if (attempts < MAX_ATTEMPTS) {
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }
    }

    console.log("\n\n⏱️  Monitoring timeout reached.");
    console.log("The message may still be processing. Check manually:");
    console.log("https://testnet.layerzeroscan.com/tx/" + TX_HASH);

    return null;
}

monitorMessage()
    .then((message) => {
        if (message) {
            process.exit(0);
        } else {
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error("Monitoring failed:", error);
        process.exit(1);
    });



