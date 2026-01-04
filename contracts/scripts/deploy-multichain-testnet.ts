/**
 * Multichain E2E Deployment Script
 *
 * Deploys the following contracts for testnet E2E testing:
 * - Ethereum Sepolia (source chain): IdentityVerificationHubImplV2 + BridgeAdapter
 * - Base Sepolia (destination chain): IdentityVerificationHubMultichain + TestMultichainDApp
 *
 * Uses LayerZero's official OApp upgradeable contracts for cross-chain messaging.
 *
 * Usage:
 *   Deploy to Sepolia:
 *     npx hardhat run scripts/deploy-multichain-testnet.ts --network sepolia
 *
 *   Deploy to Base Sepolia:
 *     npx hardhat run scripts/deploy-multichain-testnet.ts --network base-sepolia
 */

import { ethers, network } from "hardhat";
import type { Signer } from "ethers";

// LayerZero V2 Testnet Endpoints (same address across chains)
const LZ_ENDPOINTS = {
    sepolia: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    "base-sepolia": "0x6EDCE65403992e310A62460808c4b910D972f10f",
};

// LayerZero V2 Endpoint IDs for testnets
const LZ_EIDS = {
    sepolia: 40161, // Ethereum Sepolia
    "base-sepolia": 40245, // Base Sepolia
};

// Chain IDs
const CHAIN_IDS = {
    sepolia: 11155111,
    "base-sepolia": 84532,
};

async function deploySourceChain(deployer: Signer) {
    const deployerAddress = await deployer.getAddress();
    console.log("\n=== Deploying Source Chain Contracts (Ethereum Sepolia) ===");
    console.log("Deployer:", deployerAddress);

    const lzEndpoint = LZ_ENDPOINTS.sepolia;

    // 1. Deploy CustomVerifierContract
    console.log("\n1. Deploying CustomVerifierContract...");
    const CustomVerifierContract = await ethers.getContractFactory("CustomVerifierContract");
    const customVerifierContract = await CustomVerifierContract.connect(deployer).deploy();
    await customVerifierContract.waitForDeployment();
    const customVerifierAddress = await customVerifierContract.getAddress();
    console.log("   ✅ CustomVerifierContract:", customVerifierAddress);

    // 2. Deploy BridgeAdapter (with endpoint in constructor)
    console.log("\n2. Deploying BridgeAdapter...");
    const BridgeAdapterImpl = await ethers.getContractFactory("BridgeAdapter");
    // Constructor now takes endpoint address (immutable)
    const bridgeAdapterImpl = await BridgeAdapterImpl.connect(deployer).deploy(lzEndpoint);
    await bridgeAdapterImpl.waitForDeployment();
    console.log("   ✅ BridgeAdapter Impl:", await bridgeAdapterImpl.getAddress());

    // Deploy BridgeAdapter Proxy
    // Initialize now only takes (admin, delegate)
    const bridgeAdapterInitData = bridgeAdapterImpl.interface.encodeFunctionData("initialize", [
        deployerAddress, // admin
        deployerAddress, // delegate
    ]);
    const BridgeAdapterProxy = await ethers.getContractFactory("ERC1967Proxy");
    const bridgeAdapterProxy = await BridgeAdapterProxy.connect(deployer).deploy(
        await bridgeAdapterImpl.getAddress(),
        bridgeAdapterInitData
    );
    await bridgeAdapterProxy.waitForDeployment();
    const bridgeAdapter = BridgeAdapterImpl.attach(await bridgeAdapterProxy.getAddress());
    console.log("   ✅ BridgeAdapter Proxy:", await bridgeAdapter.getAddress());

    // 3. Deploy IdentityVerificationHubImplV2
    console.log("\n3. Deploying IdentityVerificationHubImplV2...");
    const HubImpl = await ethers.getContractFactory("IdentityVerificationHubImplV2");
    const hubImpl = await HubImpl.connect(deployer).deploy();
    await hubImpl.waitForDeployment();
    console.log("   ✅ Hub Impl:", await hubImpl.getAddress());

    // Deploy Hub Proxy
    const hubInitData = hubImpl.interface.encodeFunctionData("initialize");
    const HubProxy = await ethers.getContractFactory("ERC1967Proxy");
    const hubProxy = await HubProxy.connect(deployer).deploy(await hubImpl.getAddress(), hubInitData);
    await hubProxy.waitForDeployment();
    const hub = HubImpl.attach(await hubProxy.getAddress());
    console.log("   ✅ Hub Proxy:", await hub.getAddress());

    // 4. Configure BridgeAdapter
    console.log("\n4. Configuring BridgeAdapter...");

    // Grant HUB_ROLE to the hub
    const hubRole = await bridgeAdapter.HUB_ROLE();
    await bridgeAdapter.connect(deployer).grantRole(hubRole, await hub.getAddress());
    console.log("   ✅ Granted HUB_ROLE to hub");

    // Set chain EID for Base Sepolia
    await bridgeAdapter.connect(deployer).setChainEid(CHAIN_IDS["base-sepolia"], LZ_EIDS["base-sepolia"]);
    console.log(`   ✅ Set chainEid: ${CHAIN_IDS["base-sepolia"]} -> ${LZ_EIDS["base-sepolia"]}`);

    // 5. Configure Hub
    console.log("\n5. Configuring Hub...");
    await hub.connect(deployer).setBridgeAdapter(await bridgeAdapter.getAddress());
    console.log("   ✅ Hub configured with BridgeAdapter:", await bridgeAdapter.getAddress());

    await hub.connect(deployer).setCustomVerifier(customVerifierAddress);
    console.log("   ✅ Hub configured with CustomVerifier:", customVerifierAddress);

    console.log("\n=== Source Chain Deployment Summary ===");
    console.log("CustomVerifierContract:", customVerifierAddress);
    console.log("BridgeAdapter Impl:", await bridgeAdapterImpl.getAddress());
    console.log("BridgeAdapter Proxy:", await bridgeAdapter.getAddress());
    console.log("IdentityVerificationHubImplV2 Proxy:", await hub.getAddress());
    console.log("Hub Implementation:", await hubImpl.getAddress());
    console.log("");

    return {
        customVerifier: customVerifierAddress,
        bridgeAdapterImpl: await bridgeAdapterImpl.getAddress(),
        bridgeAdapter: await bridgeAdapter.getAddress(),
        hub: await hub.getAddress(),
        hubImpl: await hubImpl.getAddress(),
    };
}

async function deployDestinationChain(deployer: Signer) {
    const deployerAddress = await deployer.getAddress();
    console.log("\n=== Deploying Destination Chain Contracts (Base Sepolia) ===");
    console.log("Deployer:", deployerAddress);

    const lzEndpoint = LZ_ENDPOINTS["base-sepolia"];

    // 1. Deploy IdentityVerificationHubMultichain (with endpoint in constructor)
    console.log("\n1. Deploying IdentityVerificationHubMultichain...");
    const MultichainHubImpl = await ethers.getContractFactory("IdentityVerificationHubMultichain");
    // Constructor now takes endpoint address (immutable)
    const multichainHubImpl = await MultichainHubImpl.connect(deployer).deploy(lzEndpoint);
    await multichainHubImpl.waitForDeployment();
    console.log("   ✅ MultichainHub Impl:", await multichainHubImpl.getAddress());

    // Deploy MultichainHub Proxy
    // Initialize now only takes (admin, delegate)
    const initData = multichainHubImpl.interface.encodeFunctionData("initialize", [
        deployerAddress, // admin
        deployerAddress, // delegate
    ]);
    const Proxy = await ethers.getContractFactory("ERC1967Proxy");
    const proxy = await Proxy.connect(deployer).deploy(await multichainHubImpl.getAddress(), initData);
    await proxy.waitForDeployment();
    const multichainHub = MultichainHubImpl.attach(await proxy.getAddress());
    console.log("   ✅ MultichainHub Proxy:", await multichainHub.getAddress());

    // 2. Deploy TestMultichainDApp
    console.log("\n2. Deploying TestMultichainDApp...");
    const TestDApp = await ethers.getContractFactory("TestMultichainDApp");
    const testDApp = await TestDApp.connect(deployer).deploy();
    await testDApp.waitForDeployment();
    console.log("   ✅ TestDApp:", await testDApp.getAddress());

    console.log("\n=== Destination Chain Deployment Summary ===");
    console.log("IdentityVerificationHubMultichain Impl:", await multichainHubImpl.getAddress());
    console.log("IdentityVerificationHubMultichain Proxy:", await multichainHub.getAddress());
    console.log("TestMultichainDApp:", await testDApp.getAddress());
    console.log("");

    return {
        multichainHubImpl: await multichainHubImpl.getAddress(),
        multichainHub: await multichainHub.getAddress(),
        testDApp: await testDApp.getAddress(),
    };
}

async function main() {
    const [deployer] = await ethers.getSigners();
    const networkName = network.name;

    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║   Multichain E2E Testnet Deployment                ║");
    console.log("║   Using LayerZero OApp Upgradeable Pattern         ║");
    console.log("╚════════════════════════════════════════════════════╝");
    console.log(`Network: ${networkName}`);

    if (networkName === "sepolia") {
        const result = await deploySourceChain(deployer);

        console.log("\n╔════════════════════════════════════════════════════╗");
        console.log("║   NEXT STEPS                                       ║");
        console.log("╚════════════════════════════════════════════════════╝");
        console.log("1. Deploy to Base Sepolia:");
        console.log("   npx hardhat run scripts/deploy-multichain-testnet.ts --network base-sepolia");
        console.log("");
        console.log("2. After deploying to Base Sepolia, configure peers:");
        console.log("   - On Sepolia BridgeAdapter, call:");
        console.log(`     setPeer(${LZ_EIDS["base-sepolia"]}, <multichainHub_as_bytes32>)`);
        console.log("");
        console.log("   - On Base Sepolia MultichainHub, call:");
        console.log(`     setPeer(${LZ_EIDS.sepolia}, <bridgeAdapter_as_bytes32>)`);

        return result;
    } else if (networkName === "base-sepolia") {
        const result = await deployDestinationChain(deployer);

        console.log("\n╔════════════════════════════════════════════════════╗");
        console.log("║   PEER CONFIGURATION                               ║");
        console.log("╚════════════════════════════════════════════════════╝");
        console.log("After both chains are deployed, configure peers:");
        console.log("");
        console.log("On Sepolia BridgeAdapter:");
        console.log(`  setPeer(${LZ_EIDS["base-sepolia"]}, ${ethers.zeroPadValue(result.multichainHub, 32)})`);
        console.log("");
        console.log("On Base Sepolia MultichainHub:");
        console.log(`  setPeer(${LZ_EIDS.sepolia}, <sepolia_bridgeAdapter_as_bytes32>)`);

        return result;
    } else {
        console.error(`Unsupported network: ${networkName}`);
        console.log("Supported networks: sepolia, base-sepolia");
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
