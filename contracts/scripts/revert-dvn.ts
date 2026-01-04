/**
 * Revert DVN configuration back to the original/default
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

// Original DVN (Sepolia LayerZero Labs DVN)
const ORIGINAL_DVN = "0x8eebf8b423b73bfca51a1db4b7354aa0bfca9193";

async function main() {
    console.log("\n=== Reverting DVN Configuration ===\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const endpoint = new ethers.Contract(LZ_ENDPOINT_V2, ENDPOINT_ABI, deployer);

    // Encode the original ULN config
    const originalUlnConfig = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint64, uint8, uint8, uint8, address[], address[])"],
        [[
            2, // confirmations
            1, // requiredDVNCount
            0, // optionalDVNCount
            0, // optionalDVNThreshold
            [ORIGINAL_DVN], // requiredDVNs
            [] // optionalDVNs
        ]]
    );

    const configParams = [{
        eid: BASE_SEPOLIA_EID,
        configType: 2, // ULN Send Config
        config: originalUlnConfig
    }];

    console.log("Reverting to original DVN:", ORIGINAL_DVN);

    const tx = await endpoint.setConfig(SEPOLIA_BRIDGE_ADAPTER, SEND_LIB, configParams);
    console.log("Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Reverted in block:", receipt?.blockNumber);

    // Verify
    const ulnConfig = await endpoint.getConfig(SEPOLIA_BRIDGE_ADAPTER, SEND_LIB, BASE_SEPOLIA_EID, 2);
    const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
        ["tuple(uint64, uint8, uint8, uint8, address[], address[])"],
        ulnConfig
    );
    console.log("\nVerified DVN:", decoded[0][4][0]);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });



