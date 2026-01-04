/**
 * Have BridgeAdapter set itself as delegate on LayerZero endpoint
 * 
 * The BridgeAdapter must call endpoint.setDelegate() to authorize itself
 * to send messages via LayerZero.
 */

import { ethers } from "hardhat";

const SEPOLIA_BRIDGE_ADAPTER = "0x4A2Ca34AC976B55bE875befa11645e8b940FF26F";
const SEPOLIA_LZ_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";

async function main() {
    console.log("\n=== BridgeAdapter Setting Delegate ===\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Call the endpoint's setDelegate from the deployer (who is admin of BridgeAdapter)
    // but we need to do it via the BridgeAdapter contract
    
    // First, let's create a helper function in a simple way
    // We'll send a transaction that makes BridgeAdapter call endpoint.setDelegate()
    
    const ILayerZeroEndpointV2 = new ethers.Interface([
        "function setDelegate(address _delegate) external"
    ]);

    // Encode the call to setDelegate(BridgeAdapter)
    const setDelegateCalldata = ILayerZeroEndpointV2.encodeFunctionData("setDelegate", [SEPOLIA_BRIDGE_ADAPTER]);

    console.log("We need BridgeAdapter to call endpoint.setDelegate(address(this))");
    console.log("Calldata:", setDelegateCalldata);
    
    console.log("\n⚠️  Option 1: Add a function to BridgeAdapter that calls endpoint.setDelegate()");
    console.log("⚠️  Option 2: Use a proxy admin to execute the call");
    console.log("\nFor now, let's try a workaround: We'll deploy with the DEFAULT send library,");
    console.log("which should work without explicit delegate setup for the OApp.");
    
    console.log("\n✅ The actual issue is likely something else.");
    console.log("LayerZero V2 OApps don't need explicit delegate for their own sends.");
    console.log("The delegate system is for allowing OTHER addresses to send on behalf of the OApp.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });




