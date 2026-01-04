/**
 * Configure LayerZero OApp peers for cross-chain messaging
 * Based on the working example: https://github.com/selfxyz/self-layerzero-example
 *
 * For LayerZero V2, both sender and receiver need to:
 * 1. Set each other as peers
 * 2. This is done via endpoint.setDelegate() and then calling setPeer() on the OApp
 *
 * Since our contracts don't inherit from OApp, we need to use the endpoint's
 * configuration functions directly.
 */

import { ethers, network } from "hardhat";

// LayerZero Endpoint V2 has configuration methods
const LZ_ENDPOINT_ABI = [
    "function setDelegate(address _delegate) external",
    "function delegates(address _oapp) external view returns (address)",
    // Config setters
    "function setConfig(address _oapp, address _lib, tuple(uint32 eid, uint32 configType, bytes config)[] _params) external",
    "function getConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType) external view returns (bytes)",
    // Send/receive library
    "function setSendLibrary(address _oapp, uint32 _eid, address _newLib) external",
    "function setReceiveLibrary(address _oapp, uint32 _eid, address _newLib, uint256 _gracePeriod) external",
    "function getSendLibrary(address _sender, uint32 _eid) external view returns (address)",
    "function getReceiveLibrary(address _receiver, uint32 _eid) external view returns (address, bool)",
    "function isRegisteredLibrary(address _lib) external view returns (bool)",
    "function quote(tuple(uint32 dstEid, bytes32 receiver, bytes message, bytes options, bool payInLzToken) _params, address _sender) external view returns (tuple(uint256 nativeFee, uint256 lzTokenFee))",
];

// Contract addresses
const SEPOLIA_BRIDGE_ADAPTER = "0x4A2Ca34AC976B55bE875befa11645e8b940FF26F";
const BASE_SEPOLIA_MULTICHAIN_HUB = "0x7f134978E051C313EaAc344372C0D8e75d15aAcF";

// LayerZero endpoints (same address on both testnets)
const LZ_ENDPOINT_V2 = "0x6EDCE65403992e310A62460808c4b910D972f10f";

// LayerZero EIDs
const SEPOLIA_EID = 40161;
const BASE_SEPOLIA_EID = 40245;

async function main() {
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║   Configure LayerZero OApp for Cross-Chain Messaging       ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Network:", network.name);

    const endpoint = new ethers.Contract(LZ_ENDPOINT_V2, LZ_ENDPOINT_ABI, deployer);

    // Check current configuration
    console.log("\n=== Current Configuration (Sepolia) ===");

    const delegate = await endpoint.delegates(SEPOLIA_BRIDGE_ADAPTER);
    console.log("BridgeAdapter delegate:", delegate);

    const sendLib = await endpoint.getSendLibrary(SEPOLIA_BRIDGE_ADAPTER, BASE_SEPOLIA_EID);
    console.log("Send Library for Base Sepolia:", sendLib);

    const isRegistered = await endpoint.isRegisteredLibrary(sendLib);
    console.log("Is Send Library registered:", isRegistered);

    // Check if we can get receive library config
    try {
        const [receiveLib, isDefault] = await endpoint.getReceiveLibrary(SEPOLIA_BRIDGE_ADAPTER, BASE_SEPOLIA_EID);
        console.log("Receive Library:", receiveLib, "(default:", isDefault + ")");
    } catch (e: any) {
        console.log("Receive Library: Not configured");
    }

    // Get DVN config (config type 2 = ULN config)
    console.log("\n=== Checking DVN Configuration ===");
    try {
        // Config type 2 = UlnConfig for send
        const ulnConfig = await endpoint.getConfig(SEPOLIA_BRIDGE_ADAPTER, sendLib, BASE_SEPOLIA_EID, 2);
        console.log("ULN Config (raw):", ulnConfig);
    } catch (e: any) {
        console.log("ULN Config: Not available or using defaults");
    }

    // Test quote
    console.log("\n=== Testing Quote ===");
    const testMessage = ethers.toUtf8Bytes("test");
    const options = "0x00030100110100000000000000000000000000030d40"; // 200k gas
    const params = {
        dstEid: BASE_SEPOLIA_EID,
        receiver: ethers.zeroPadValue(BASE_SEPOLIA_MULTICHAIN_HUB, 32),
        message: testMessage,
        options: options,
        payInLzToken: false
    };

    try {
        const fee = await endpoint.quote(params, SEPOLIA_BRIDGE_ADAPTER);
        console.log("Quote native fee:", ethers.formatEther(fee.nativeFee), "ETH");
        console.log("Quote lzToken fee:", fee.lzTokenFee.toString());
    } catch (e: any) {
        console.log("Quote failed:", e.message);
    }

    console.log("\n=== Diagnosis ===");
    console.log("The 'BLOCKED' status on LayerZero Scan typically means:");
    console.log("1. DVN verification is pending (can take minutes)");
    console.log("2. Receiver needs to accept messages from sender");
    console.log("3. Security stack not configured");
    console.log("");
    console.log("For testnet, LayerZero uses default DVNs. The message should");
    console.log("eventually be delivered once DVNs verify it.");
    console.log("");
    console.log("Check LayerZero Scan in a few minutes for status update:");
    console.log("https://testnet.layerzeroscan.com/tx/0xe5da15f48e231de835fa43f00b48b0268303aeb3b0e94d6cea2784c674269aaf");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });



