/**
 * Test LayerZero endpoint directly from EOA
 * This helps isolate if the issue is with the BridgeAdapter or LayerZero itself
 */

import { ethers } from "hardhat";

const SEPOLIA_LZ_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";
const BASE_SEPOLIA_MULTICHAIN_HUB = "0x7f134978E051C313EaAc344372C0D8e75d15aAcF";
const BASE_SEPOLIA_EID = 40245;

async function main() {
    console.log("\n=== Testing LayerZero Endpoint Directly ===\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const ILayerZeroEndpointV2 = new ethers.Interface([
        "function send(tuple(uint32 dstEid, bytes32 receiver, bytes message, bytes options, bool payInLzToken) params, address refundAddress) external payable returns (tuple(bytes32 guid, uint64 nonce, tuple(uint256 nativeFee, uint256 lzTokenFee) fee))",
        "function quote(tuple(uint32 dstEid, bytes32 receiver, bytes message, bytes options, bool payInLzToken) params, address sender) external view returns (tuple(uint256 nativeFee, uint256 lzTokenFee))"
    ]);

    const endpoint = new ethers.Contract(SEPOLIA_LZ_ENDPOINT, ILayerZeroEndpointV2, deployer);

    const receiver = ethers.zeroPadValue(BASE_SEPOLIA_MULTICHAIN_HUB, 32);
    const message = ethers.toUtf8Bytes("Hello from Sepolia!");
    const options = "0x00030100110100000000000000000000000000030d40"; // Basic options with 200k gas

    const params = {
        dstEid: BASE_SEPOLIA_EID,
        receiver: receiver,
        message: ethers.hexlify(message),
        options: options,
        payInLzToken: false
    };

    console.log("Params:");
    console.log("  dstEid:", params.dstEid);
    console.log("  receiver:", params.receiver);
    console.log("  message length:", message.length);
    console.log("  options:", params.options);

    try {
        console.log("\n1. Quoting fee from EOA...");
        const fee = await endpoint.quote(params, deployer.address);
        console.log("   Native Fee:", ethers.formatEther(fee.nativeFee), "ETH");

        console.log("\n2. Attempting to send from EOA...");
        const tx = await endpoint.send(params, deployer.address, { value: fee.nativeFee, gasLimit: 500000 });
        console.log("   Transaction sent:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("   ✅ Transaction confirmed!");
        console.log("   Block:", receipt?.blockNumber);
        console.log("   Gas used:", receipt?.gasUsed.toString());
        
        console.log("\n✅ EOA can send via LayerZero!");
        console.log("This means the issue is specific to the BridgeAdapter contract.");
        
    } catch (error: any) {
        console.error("\n  ❌ Error:", error.message);
        
        if (error.message.includes("revert")) {
            console.log("\n  ⚠️  EOA also cannot send!");
            console.log("  This suggests a LayerZero configuration or network issue.");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });




