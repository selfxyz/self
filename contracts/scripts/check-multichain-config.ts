/**
 * Read-only check of multichain config between Sepolia and Base Sepolia.
 * - Verifies BridgeAdapter peers/chainEid and HUB_ROLE assignment
 * - Verifies MultichainHub peers/source hub mapping on Base Sepolia
 */
import { ethers } from "hardhat";

const SEPOLIA_HUB = "0x10889E87186B35166254e6a19B6452F5CF1A9Be7";
const SEPOLIA_BRIDGE_ADAPTER = "0x1640B2E95909328c83d1987A8902EB8c7a766e97";
const BASE_SEPOLIA_MULTICHAIN_HUB = "0x924000D6b92955197631632e312D5E9032597535";

const SEPOLIA_CHAIN_ID = 11155111;
const BASE_SEPOLIA_CHAIN_ID = 84532;
const SEPOLIA_EID = 40161;
const BASE_SEPOLIA_EID = 40245;

function b32(addr: string): string {
    return ethers.zeroPadValue(addr, 32).toLowerCase();
}

async function main() {
    console.log("\n=== Sepolia: BridgeAdapter checks ===");
    const [deployer] = await ethers.getSigners();
    const BridgeAdapter = await ethers.getContractFactory("BridgeAdapter");
    const bridgeAdapter = BridgeAdapter.attach(SEPOLIA_BRIDGE_ADAPTER);

    const hubRole = await bridgeAdapter.HUB_ROLE();
    const hasHubRole = await bridgeAdapter.hasRole(hubRole, SEPOLIA_HUB);
    const hasDeployerRole = await bridgeAdapter.hasRole(hubRole, deployer.address);
    const peer = (await bridgeAdapter.peers(BASE_SEPOLIA_EID)).toLowerCase();
    const chainEid = await bridgeAdapter.chainEids(BASE_SEPOLIA_CHAIN_ID);
    const lzReceiveGas = await bridgeAdapter.lzReceiveGasLimit();

    console.log("  BridgeAdapter:", SEPOLIA_BRIDGE_ADAPTER);
    console.log("  HUB_ROLE -> Hub:", hasHubRole ? "✅" : "❌", SEPOLIA_HUB);
    console.log("  HUB_ROLE -> Deployer:", hasDeployerRole ? "✅" : "❌", deployer.address);
    console.log("  Peer for Base EID", BASE_SEPOLIA_EID + ":", peer);
    console.log("  Expected peer:", b32(BASE_SEPOLIA_MULTICHAIN_HUB));
    console.log("  chainEids[Base Sepolia]:", chainEid.toString(), "(expected " + BASE_SEPOLIA_EID + ")");
    console.log("  lzReceiveGasLimit:", lzReceiveGas.toString());

    console.log("\n=== Base Sepolia: MultichainHub checks ===");
    const baseRpc = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
    const baseProvider = new ethers.JsonRpcProvider(baseRpc);
    const MultichainHub = await ethers.getContractFactory("IdentityVerificationHubMultichain");
    const multichainHub = MultichainHub.attach(BASE_SEPOLIA_MULTICHAIN_HUB).connect(baseProvider);

    const basePeer = (await multichainHub.peers(SEPOLIA_EID)).toLowerCase();
    const sourceHub = (await multichainHub.getSourceHub(SEPOLIA_CHAIN_ID)).toLowerCase();

    console.log("  MultichainHub:", BASE_SEPOLIA_MULTICHAIN_HUB);
    console.log("  Peer for Sepolia EID", SEPOLIA_EID + ":", basePeer);
    console.log("  Expected peer:", b32(SEPOLIA_BRIDGE_ADAPTER));
    console.log("  getSourceHub(Sepolia chainId):", sourceHub);
    console.log("  Expected source hub:", b32(SEPOLIA_BRIDGE_ADAPTER));

    console.log("\n✅ Read-only checks complete");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
