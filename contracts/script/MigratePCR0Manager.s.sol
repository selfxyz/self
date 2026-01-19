// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {PCR0Manager} from "../contracts/utils/PCR0Manager.sol";

/**
 * @title MigratePCR0Manager
 * @notice Foundry script to deploy and initialize new PCR0Manager with AccessControl governance
 *
 * This script:
 * 1. Deploys new PCR0Manager (V2 with AccessControl)
 * 2. Adds all 7 finalized PCR0 values
 * 3. Transfers roles to multisigs
 * 4. Deployer renounces all roles
 * 5. Verifies final state
 *
 * Usage:
 * - Set in .env file:
 *   SECURITY_GOVERNANCE_ADDRESS=0x...
 *   OPERATIONS_GOVERNANCE_ADDRESS=0x...
 * - Dry run: forge script script/MigratePCR0Manager.s.sol --fork-url $CELO_RPC_URL -vvv
 * - Execute: forge script script/MigratePCR0Manager.s.sol --rpc-url https://forno.celo.org --broadcast --verify -vvv
 */
contract MigratePCR0Manager is Script {
    // Governance roles
    bytes32 public constant SECURITY_ROLE = keccak256("SECURITY_ROLE");
    bytes32 public constant OPERATIONS_ROLE = keccak256("OPERATIONS_ROLE");

    // Multisig addresses (from environment)
    address securityMultisig;
    address operationsMultisig;

    function run() external returns (address newPCR0Manager) {
        console2.log("================================================================================");
        console2.log("PCR0MANAGER DEPLOYMENT: Fresh deployment with AccessControl");
        console2.log("================================================================================");

        console2.log("\nDeployer:", msg.sender);
        console2.log("Chain ID:", block.chainid);

        // Get multisig addresses from .env
        securityMultisig = vm.envAddress("SECURITY_GOVERNANCE_ADDRESS");
        operationsMultisig = vm.envAddress("OPERATIONS_GOVERNANCE_ADDRESS");

        require(securityMultisig != address(0), "SECURITY_GOVERNANCE_ADDRESS not set in .env");
        require(operationsMultisig != address(0), "OPERATIONS_GOVERNANCE_ADDRESS not set in .env");

        console2.log("\nGovernance addresses:");
        console2.log("  Critical Multisig:", securityMultisig);
        console2.log("  Standard Multisig:", operationsMultisig);

        // Get finalized PCR0 values
        bytes[] memory pcr0Values = getFinalizedPCR0Values();

        console2.log("\nPCR0 values to add:", pcr0Values.length);

        vm.startBroadcast();

        // Step 1: Deploy PCR0Manager
        console2.log("\n=== Step 1: Deploy PCR0Manager ===");
        PCR0Manager pcr0Manager = new PCR0Manager();
        newPCR0Manager = address(pcr0Manager);
        console2.log("Deployed at:", newPCR0Manager);

        // Step 2: Add PCR0 values
        console2.log("\n=== Step 2: Add PCR0 Values ===");
        for (uint256 i = 0; i < pcr0Values.length; i++) {
            pcr0Manager.addPCR0(pcr0Values[i]);
            console2.log("  Added PCR0", i + 1, "of", pcr0Values.length);
        }

        // Step 3: Transfer roles to multisigs
        console2.log("\n=== Step 3: Transfer Roles to Multisigs ===");
        pcr0Manager.grantRole(SECURITY_ROLE, securityMultisig);
        pcr0Manager.grantRole(OPERATIONS_ROLE, operationsMultisig);
        console2.log("  Granted SECURITY_ROLE to:", securityMultisig);
        console2.log("  Granted OPERATIONS_ROLE to:", operationsMultisig);

        // Step 4: Deployer renounces roles
        console2.log("\n=== Step 4: Deployer Renounces All Roles ===");
        pcr0Manager.renounceRole(SECURITY_ROLE, msg.sender);
        pcr0Manager.renounceRole(OPERATIONS_ROLE, msg.sender);
        console2.log("  Deployer renounced SECURITY_ROLE");
        console2.log("  Deployer renounced OPERATIONS_ROLE");

        vm.stopBroadcast();

        // Step 5: Verify final state
        console2.log("\n=== Step 5: Verify Final State ===");
        verifyFinalState(pcr0Manager, pcr0Values);

        console2.log("\n================================================================================");
        console2.log("DEPLOYMENT COMPLETE!");
        console2.log("================================================================================");
        console2.log("\nNew PCR0Manager:", newPCR0Manager);
        console2.log("Total PCR0 values:", pcr0Values.length);
        console2.log("Governance:");
        console2.log("  Critical Multisig:", securityMultisig);
        console2.log("  Standard Multisig:", operationsMultisig);
        console2.log("\nNext steps:");
        console2.log("1. Update Hub to point to new PCR0Manager");
        console2.log("2. Update documentation with new address");
        console2.log("3. Verify contract on Celoscan");

        return newPCR0Manager;
    }

    /**
     * @notice Returns finalized PCR0 values (32-byte format)
     * @dev These will be padded to 48 bytes by PCR0Manager (prefixed with 16 zero bytes)
     */
    function getFinalizedPCR0Values() internal pure returns (bytes[] memory) {
        bytes[] memory pcr0s = new bytes[](7);

        pcr0s[0] = hex"eb71776987d5f057030823f591d160c9d5d5e0a96c9a2a826778be1da2b8302a";
        pcr0s[1] = hex"d2221a0ee83901980c607ceff2edbedf3f6ce5f437eafa5d89be39e9e7487c04";
        pcr0s[2] = hex"4458aeb87796e92700be2d9c2984e376bce42bd80a4bf679e060d3bdaa6de119";
        pcr0s[3] = hex"aa3deefa408710420e8b4ffe5b95f1dafeb4f06cb16ea44ec7353944671c660a";
        pcr0s[4] = hex"b31e0df12cd52b961590796511d91a26364dd963c4aa727246b40513e470c232";
        pcr0s[5] = hex"26bc53c698f78016ad7c326198d25d309d1487098af3f28fc55e951f903e9596";
        pcr0s[6] = hex"b62720bdb510c2830cf9d58caa23912d0b214d6c278bf22e90942a6b69d272af";

        return pcr0s;
    }

    /**
     * @notice Verifies the final state of the deployed PCR0Manager
     */
    function verifyFinalState(PCR0Manager pcr0Manager, bytes[] memory pcr0Values) internal view {
        // Verify all PCR0 values are set (need 48-byte format for checking)
        for (uint256 i = 0; i < pcr0Values.length; i++) {
            // Pad to 48 bytes
            bytes memory padded = abi.encodePacked(new bytes(16), pcr0Values[i]);
            bool isSet = pcr0Manager.isPCR0Set(padded);
            require(isSet, "PCR0 value not set");
        }
        console2.log("  [PASS] All", pcr0Values.length, "PCR0 values verified");

        // Verify deployer has no roles
        bool deployerHasCritical = pcr0Manager.hasRole(SECURITY_ROLE, msg.sender);
        bool deployerHasStandard = pcr0Manager.hasRole(OPERATIONS_ROLE, msg.sender);
        require(!deployerHasCritical, "Deployer still has SECURITY_ROLE");
        require(!deployerHasStandard, "Deployer still has OPERATIONS_ROLE");
        console2.log("  [PASS] Deployer has no roles");

        // Verify multisigs have roles
        bool criticalHasRole = pcr0Manager.hasRole(SECURITY_ROLE, securityMultisig);
        bool standardHasRole = pcr0Manager.hasRole(OPERATIONS_ROLE, operationsMultisig);
        require(criticalHasRole, "Critical multisig missing SECURITY_ROLE");
        require(standardHasRole, "Standard multisig missing OPERATIONS_ROLE");
        console2.log("  [PASS] Multisigs have correct roles");

        console2.log("\n  [SUCCESS] All verifications passed!");
    }
}
