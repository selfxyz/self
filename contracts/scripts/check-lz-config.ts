/**
 * Check LayerZero V2 configuration for BridgeAdapter
 */

import { ethers } from "hardhat";

const SEPOLIA_BRIDGE_ADAPTER = "0x4A2Ca34AC976B55bE875befa11645e8b940FF26F";
const SEPOLIA_LZ_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";
const BASE_SEPOLIA_EID = 40245;

async function main() {
    console.log("\n=== Checking LayerZero Configuration ===\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("BridgeAdapter:", SEPOLIA_BRIDGE_ADAPTER);
    console.log("LayerZero Endpoint:", SEPOLIA_LZ_ENDPOINT);

    // IMessageLibManager interface
    const IMessageLibManager = new ethers.Interface([
        "function getSendLibrary(address _sender, uint32 _dstEid) external view returns (address lib)",
        "function getReceiveLibrary(address _receiver, uint32 _srcEid) external view returns (address lib, bool isDefault)",
        "function isRegisteredLibrary(address _lib) external view returns (bool)"
    ]);

    const endpoint = new ethers.Contract(SEPOLIA_LZ_ENDPOINT, IMessageLibManager, deployer);

    console.log("\n1. Checking Send Library for Base Sepolia...");
    try {
        const sendLib = await endpoint.getSendLibrary(SEPOLIA_BRIDGE_ADAPTER, BASE_SEPOLIA_EID);
        console.log("   Send Library:", sendLib);
        
        if (sendLib === ethers.ZeroAddress) {
            console.log("   ⚠️  No send library configured!");
            console.log("   This is likely the cause of the revert.");
        } else {
            const isRegistered = await endpoint.isRegisteredLibrary(sendLib);
            console.log("   Is Registered:", isRegistered);
        }
    } catch (error: any) {
        console.error("   Error:", error.message);
    }

    console.log("\n2. Checking Delegate...");
    const IDelegateManager = new ethers.Interface([
        "function delegates(address _sender) external view returns (address delegate)"
    ]);
    const delegateManager = new ethers.Contract(SEPOLIA_LZ_ENDPOINT, IDelegateManager, deployer);
    
    try {
        const delegate = await delegateManager.delegates(SEPOLIA_BRIDGE_ADAPTER);
        console.log("   Delegate for BridgeAdapter:", delegate);
        
        if (delegate === ethers.ZeroAddress) {
            console.log("   ⚠️  No delegate set (using self)");
        }
    } catch (error: any) {
        console.error("   Error:", error.message);
    }

    console.log("\n3. Test: Try calling send with verbose error handling...");
    const BridgeAdapter = await ethers.getContractFactory("BridgeAdapter");
    const bridgeAdapter = BridgeAdapter.attach(SEPOLIA_BRIDGE_ADAPTER);

    const mockOutput = "0x1234";
    const mockUserData = "0x5678";
    
    try {
        const fee = await bridgeAdapter.quoteBridgeFee(
            84532,
            "0xC6F41Ff1c43a9DfA42262Bb6723Fb5cCfD1e7AB8",
            mockOutput,
            mockUserData
        );
        console.log("   Quote succeeded:", ethers.formatEther(fee), "ETH");
    } catch (error: any) {
        console.error("   Quote failed:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });




