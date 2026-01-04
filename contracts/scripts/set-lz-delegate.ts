/**
 * Set LayerZero delegate for BridgeAdapter
 * 
 * In LayerZero V2, the sender must either own the OApp or have delegate permissions.
 * This script sets the BridgeAdapter as its own delegate.
 */

import { ethers } from "hardhat";

const SEPOLIA_BRIDGE_ADAPTER = "0x4A2Ca34AC976B55bE875befa11645e8b940FF26F";
const SEPOLIA_LZ_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";

async function main() {
    console.log("\n=== Setting LayerZero Delegate ===\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Get LayerZero endpoint interface
    const ILayerZeroEndpointV2 = new ethers.Interface([
        "function setDelegate(address _delegate) external"
    ]);

    const endpoint = new ethers.Contract(SEPOLIA_LZ_ENDPOINT, ILayerZeroEndpointV2, deployer);

    console.log("Setting BridgeAdapter as its own delegate...");
    console.log("  BridgeAdapter:", SEPOLIA_BRIDGE_ADAPTER);
    console.log("  LayerZero Endpoint:", SEPOLIA_LZ_ENDPOINT);

    try {
        const tx = await endpoint.setDelegate(SEPOLIA_BRIDGE_ADAPTER);
        console.log("\n  Transaction sent:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("  ✅ Transaction confirmed in block:", receipt?.blockNumber);
        console.log("\n✅ Delegate set successfully!");
    } catch (error: any) {
        console.error("\n  ❌ Error setting delegate:", error.message);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });




