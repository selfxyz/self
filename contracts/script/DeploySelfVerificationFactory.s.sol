// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {SelfVerificationApp} from "../contracts/SelfVerificationApp.sol";
import {SelfVerificationFactory} from "../contracts/SelfVerificationFactory.sol";

/**
 * @title DeploySelfVerificationFactory
 * @notice Deploys the SelfVerificationFactory system:
 *         1. SelfVerificationApp (implementation for clones)
 *         2. SelfVerificationFactory (implementation)
 *         3. ERC1967Proxy wrapping the factory
 *
 * @dev Required environment variables:
 *      - HUB_V2_ADDRESS: Identity Verification Hub V2 address
 *      - RELAYER_ADDRESS: Initial authorized relayer
 *      - OWNER_ADDRESS: Factory owner (admin)
 *      - MAX_PROOF_AGE: Max proof validity in seconds (default: 365 days)
 *
 * Usage:
 *   forge script script/DeploySelfVerificationFactory.s.sol \
 *     --rpc-url $RPC_URL --broadcast --verify
 */
contract DeploySelfVerificationFactory is Script {
    function run() external {
        address hubV2 = vm.envAddress("HUB_V2_ADDRESS");
        address relayerAddr = vm.envAddress("RELAYER_ADDRESS");
        address ownerAddr = vm.envAddress("OWNER_ADDRESS");
        uint256 maxProofAge = vm.envOr("MAX_PROOF_AGE", uint256(365 days));

        vm.startBroadcast();

        // 1. Deploy app implementation (used as the template for all EIP-1167 clones)
        SelfVerificationApp appImpl = new SelfVerificationApp(hubV2);
        console.log("SelfVerificationApp implementation:", address(appImpl));

        // 2. Deploy factory implementation
        SelfVerificationFactory factoryImpl = new SelfVerificationFactory();
        console.log("SelfVerificationFactory implementation:", address(factoryImpl));

        // 3. Deploy ERC1967 proxy and initialize
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(factoryImpl),
            abi.encodeCall(
                SelfVerificationFactory.initialize,
                (ownerAddr, address(appImpl), relayerAddr, maxProofAge)
            )
        );
        console.log("SelfVerificationFactory proxy:", address(proxy));

        vm.stopBroadcast();

        // Verify initialization
        SelfVerificationFactory factory = SelfVerificationFactory(address(proxy));
        require(factory.owner() == ownerAddr, "Owner mismatch");
        require(factory.appImplementation() == address(appImpl), "App impl mismatch");
        require(factory.isAuthorizedRelayer(relayerAddr), "Relayer not authorized");
        require(factory.maxProofAge() == maxProofAge, "Max proof age mismatch");

        console.log("Deployment verified successfully");
    }
}
