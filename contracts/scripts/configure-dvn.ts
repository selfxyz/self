/**
 * Configure DVN (Decentralized Verifier Network) for LayerZero V2
 *
 * The message is BLOCKED because the sender's DVN doesn't match the receiver's required DVN.
 *
 * For testnet:
 * - We need to configure the sender to use a DVN that matches the receiver's requirements
 * - Or configure the receiver to accept the sender's DVN
 *
 * LayerZero V2 Config Types:
 * - Type 1: Executor Config
 * - Type 2: ULN (Ultra Light Node) Send Config - DVN settings for sending
 * - Type 3: ULN Receive Config - DVN settings for receiving
 */

import { ethers, network } from "hardhat";

// LayerZero Endpoint V2 ABI for configuration
const ENDPOINT_ABI = [
    "function setConfig(address _oapp, address _lib, tuple(uint32 eid, uint32 configType, bytes config)[] _params) external",
    "function getConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType) external view returns (bytes)",
    "function delegates(address _oapp) external view returns (address)",
    "function getSendLibrary(address _sender, uint32 _eid) external view returns (address)",
    "function getReceiveLibrary(address _receiver, uint32 _eid) external view returns (address, bool)",
];

// Addresses
const SEPOLIA_BRIDGE_ADAPTER = "0x4A2Ca34AC976B55bE875befa11645e8b940FF26F";
const LZ_ENDPOINT_V2 = "0x6EDCE65403992e310A62460808c4b910D972f10f";
const BASE_SEPOLIA_EID = 40245;
const SEPOLIA_EID = 40161;

// DVN addresses for testnet (from LayerZero Scan)
// Sender's current DVN
const SENDER_DVN = "0x8eebf8b423b73bfca51a1db4b7354aa0bfca9193";
// Receiver's required DVN (Base Sepolia)
const RECEIVER_REQUIRED_DVN = "0xe1a12515f9ab2764b887bf60b923ca494ebbb2d6";

async function main() {
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║   Configure DVN for LayerZero Cross-Chain Messages         ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Network:", network.name);

    const endpoint = new ethers.Contract(LZ_ENDPOINT_V2, ENDPOINT_ABI, deployer);

    // Check current config
    console.log("\n=== Current Configuration ===");

    const delegate = await endpoint.delegates(SEPOLIA_BRIDGE_ADAPTER);
    console.log("BridgeAdapter delegate:", delegate);

    if (delegate !== deployer.address) {
        console.log("⚠️  Delegate is not deployer - setConfig might fail");
        console.log("   Expected:", deployer.address);
        console.log("   Actual:", delegate);
    }

    const sendLib = await endpoint.getSendLibrary(SEPOLIA_BRIDGE_ADAPTER, BASE_SEPOLIA_EID);
    console.log("Send Library:", sendLib);

    // Get current ULN config (config type 2)
    console.log("\n=== Current ULN Send Config ===");
    try {
        const ulnConfig = await endpoint.getConfig(SEPOLIA_BRIDGE_ADAPTER, sendLib, BASE_SEPOLIA_EID, 2);
        console.log("ULN Config (raw):", ulnConfig);

        // Decode UlnConfig struct
        // struct UlnConfig {
        //     uint64 confirmations;
        //     uint8 requiredDVNCount;
        //     uint8 optionalDVNCount;
        //     uint8 optionalDVNThreshold;
        //     address[] requiredDVNs;
        //     address[] optionalDVNs;
        // }
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
            ["tuple(uint64, uint8, uint8, uint8, address[], address[])"],
            ulnConfig
        );
        console.log("Decoded ULN Config:");
        console.log("  confirmations:", decoded[0][0].toString());
        console.log("  requiredDVNCount:", decoded[0][1]);
        console.log("  optionalDVNCount:", decoded[0][2]);
        console.log("  optionalDVNThreshold:", decoded[0][3]);
        console.log("  requiredDVNs:", decoded[0][4]);
        console.log("  optionalDVNs:", decoded[0][5]);
    } catch (e: any) {
        console.log("Error decoding ULN config:", e.message);
    }

    console.log("\n=== Analysis ===");
    console.log("The message is BLOCKED because:");
    console.log("1. Sender DVN:", SENDER_DVN);
    console.log("2. Receiver requires DVN:", RECEIVER_REQUIRED_DVN);
    console.log("3. These DVNs are different!");
    console.log("");
    console.log("To fix this, we need to either:");
    console.log("A) Configure sender to use receiver's required DVN");
    console.log("B) Configure receiver to accept sender's DVN");
    console.log("");
    console.log("For testnet, both should be LayerZero Labs DVNs and should work.");
    console.log("The BLOCKED status might just be DVN verification delay.");
    console.log("");
    console.log("Let's check if the message eventually gets delivered...");

    // Option: Configure the sender to use the receiver's required DVN
    console.log("\n=== Configuring Sender DVN ===");
    console.log("Setting sender to use receiver's required DVN:", RECEIVER_REQUIRED_DVN);

    // Encode the new ULN config
    // We want to set the sender to use the receiver's required DVN
    const newUlnConfig = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint64, uint8, uint8, uint8, address[], address[])"],
        [[
            2, // confirmations (2 blocks)
            1, // requiredDVNCount
            0, // optionalDVNCount
            0, // optionalDVNThreshold
            [RECEIVER_REQUIRED_DVN], // requiredDVNs - use receiver's DVN
            [] // optionalDVNs
        ]]
    );

    console.log("New ULN Config:", newUlnConfig);

    // Create setConfig params
    const configParams = [{
        eid: BASE_SEPOLIA_EID,
        configType: 2, // ULN Send Config
        config: newUlnConfig
    }];

    console.log("\n=== Applying Configuration ===");
    try {
        const tx = await endpoint.setConfig(SEPOLIA_BRIDGE_ADAPTER, sendLib, configParams);
        console.log("Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ Configuration applied in block:", receipt?.blockNumber);
    } catch (e: any) {
        console.error("❌ Error applying configuration:", e.message);
        if (e.reason) {
            console.error("Reason:", e.reason);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
