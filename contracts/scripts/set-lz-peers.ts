/**
 * Set LayerZero Peers for OApp contracts
 * 
 * In LayerZero V2, OApps must call setPeer() on the endpoint to configure
 * which contracts they trust on other chains.
 */

import { ethers } from "hardhat";

const SEPOLIA_BRIDGE_ADAPTER = "0x4A2Ca34AC976B55bE875befa11645e8b940FF26F";
const BASE_SEPOLIA_MULTICHAIN_HUB = "0x7f134978E051C313EaAc344372C0D8e75d15aAcF";
const SEPOLIA_LZ_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";
const BASE_SEPOLIA_EID = 40245;

async function main() {
    console.log("\n=== Setting LayerZero Peers ===\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Get LayerZero endpoint interface for OAppCore
    const IOAppCore = new ethers.Interface([
        "function setPeer(uint32 _eid, bytes32 _peer) external",
        "function peers(uint32 _eid) external view returns (bytes32)"
    ]);

    const endpoint = new ethers.Contract(SEPOLIA_LZ_ENDPOINT, IOAppCore, deployer);

    // Convert Base Sepolia MultichainHub address to bytes32
    const peerBytes32 = ethers.zeroPadValue(BASE_SEPOLIA_MULTICHAIN_HUB, 32);

    console.log("Setting peer for BridgeAdapter...");
    console.log("  Local OApp (BridgeAdapter):", SEPOLIA_BRIDGE_ADAPTER);
    console.log("  Remote EID:", BASE_SEPOLIA_EID);
    console.log("  Remote Peer (MultichainHub):", BASE_SEPOLIA_MULTICHAIN_HUB);
    console.log("  Peer as bytes32:", peerBytes32);

    try {
        // Check if peer is already set
        const currentPeer = await endpoint.peers(BASE_SEPOLIA_EID);
        console.log("\n  Current peer:", currentPeer);

        if (currentPeer !== ethers.ZeroHash) {
            console.log("  ⚠️  Peer already set!");
            return;
        }

        const tx = await endpoint.setPeer(BASE_SEPOLIA_EID, peerBytes32);
        console.log("\n  Transaction sent:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("  ✅ Transaction confirmed in block:", receipt?.blockNumber);
        console.log("\n✅ Peer set successfully!");
    } catch (error: any) {
        console.error("\n  ❌ Error setting peer:", error.message);
        
        // The endpoint doesn't have setPeer - it's on the OApp itself
        console.log("\n  Note: setPeer() must be called ON the OApp contract (BridgeAdapter),");
        console.log("  not on the endpoint. Trying via BridgeAdapter...");

        const BridgeAdapter = await ethers.getContractFactory("BridgeAdapter");
        const bridgeAdapter = BridgeAdapter.attach(SEPOLIA_BRIDGE_ADAPTER);

        // Check if BridgeAdapter has setPeer function
        if (bridgeAdapter.interface.hasFunction("setPeer")) {
            console.log("\n  Calling setPeer on BridgeAdapter...");
            const tx2 = await bridgeAdapter.setPeer(BASE_SEPOLIA_EID, peerBytes32);
            console.log("  Transaction sent:", tx2.hash);
            
            const receipt2 = await tx2.wait();
            console.log("  ✅ Transaction confirmed in block:", receipt2?.blockNumber);
            console.log("\n✅ Peer set via BridgeAdapter!");
        } else {
            console.log("\n  ❌ BridgeAdapter doesn't have setPeer() function");
            console.log("  This is expected if using custom bridge logic.");
            console.log("  The peer configuration is handled via destHubs mapping.");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });




