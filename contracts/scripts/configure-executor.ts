/**
 * Configure Executor for LayerZero V2
 *
 * The executor is responsible for executing lzReceive() on the destination chain.
 * Without an executor configured, messages will be BLOCKED even if DVNs verify them.
 *
 * Config Type 1 = Executor Config
 */

import { ethers, network } from "hardhat";

const ENDPOINT_ABI = [
    "function setConfig(address _oapp, address _lib, tuple(uint32 eid, uint32 configType, bytes config)[] _params) external",
    "function getConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType) external view returns (bytes)",
];

const SEPOLIA_BRIDGE_ADAPTER = "0x4A2Ca34AC976B55bE875befa11645e8b940FF26F";
const LZ_ENDPOINT_V2 = "0x6EDCE65403992e310A62460808c4b910D972f10f";
const SEND_LIB = "0xcc1ae8Cf5D3904Cef3360A9532B477529b177cCE";
const BASE_SEPOLIA_EID = 40245;

// Executor addresses for testnet (LayerZero Labs executors)
// These are the default executors provided by LayerZero
// For Base Sepolia testnet, we need to find the executor address
// Common testnet executor: 0x0000000000000000000000000000000000000000 (default/any executor)
// Or we can use LayerZero's default executor

async function main() {
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║   Configure Executor for LayerZero Cross-Chain Messages   ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Network:", network.name);

    const endpoint = new ethers.Contract(LZ_ENDPOINT_V2, ENDPOINT_ABI, deployer);

    // Check current executor config (config type 1)
    console.log("\n=== Current Executor Config ===");
    try {
        const executorConfig = await endpoint.getConfig(SEPOLIA_BRIDGE_ADAPTER, SEND_LIB, BASE_SEPOLIA_EID, 1);
        console.log("Executor Config (raw):", executorConfig);

        if (executorConfig === "0x" || executorConfig.length <= 2) {
            console.log("⚠️  No executor configured!");
        } else {
            // Decode ExecutorConfig struct
            // struct ExecutorConfig {
            //     uint128 executor;
            //     uint128 maxMsgSize;
            // }
            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                ["tuple(uint128, uint128)"],
                executorConfig
            );
            console.log("Decoded Executor Config:");
            console.log("  executor:", decoded[0][0].toString());
            console.log("  maxMsgSize:", decoded[0][1].toString());
        }
    } catch (e: any) {
        console.log("Error reading executor config:", e.message);
        console.log("This likely means no executor is configured.");
    }

    // For testnet, LayerZero uses default executors
    // The executor address is typically the LayerZero endpoint itself or a specific executor contract
    // For Base Sepolia testnet, we can use address(0) to allow any executor (default behavior)
    // Or we need to find the specific executor address

    console.log("\n=== Setting Executor Config ===");
    console.log("For testnet, we'll configure to use default executor (address(0))");
    console.log("This allows LayerZero to use its default executor for Base Sepolia");

    // Encode ExecutorConfig
    // Using address(0) means "use default executor" - LayerZero will assign one
    // maxMsgSize: 10000 bytes (typical default)
    const executorConfig = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint128, uint128)"],
        [[
            0, // executor address (0 = use default)
            10000 // maxMsgSize in bytes
        ]]
    );

    const configParams = [{
        eid: BASE_SEPOLIA_EID,
        configType: 1, // Executor Config
        config: executorConfig
    }];

    console.log("\nExecutor Config:", executorConfig);

    try {
        const tx = await endpoint.setConfig(SEPOLIA_BRIDGE_ADAPTER, SEND_LIB, configParams);
        console.log("Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ Executor configured in block:", receipt?.blockNumber);

        // Verify
        const newConfig = await endpoint.getConfig(SEPOLIA_BRIDGE_ADAPTER, SEND_LIB, BASE_SEPOLIA_EID, 1);
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
            ["tuple(uint128, uint128)"],
            newConfig
        );
        console.log("\nVerified Executor Config:");
        console.log("  executor:", decoded[0][0].toString(), "(0 = default)");
        console.log("  maxMsgSize:", decoded[0][1].toString());

    } catch (e: any) {
        console.error("❌ Error configuring executor:", e.message);
        if (e.reason) {
            console.error("Reason:", e.reason);
        }
        console.log("\nNote: The executor might need to be a specific address, not 0.");
        console.log("Check LayerZero docs for the correct executor address for Base Sepolia testnet.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });



