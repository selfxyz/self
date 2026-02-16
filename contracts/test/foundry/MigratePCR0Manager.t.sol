// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {console2} from "forge-std/console2.sol";
import {PCR0Manager} from "../../contracts/utils/PCR0Manager.sol";

/**
 * @title MigratePCR0ManagerTest
 * @notice Test for deploying PCR0Manager V2 with AccessControl governance
 *
 * This test:
 * 1. Deploys new PCR0Manager with AccessControl
 * 2. Adds all 7 finalized PCR0 values
 * 3. Transfers roles to multisigs
 * 4. Verifies deployer has no control after transfer
 *
 * Run with:
 * forge test --match-contract MigratePCR0ManagerTest -vvv
 */
contract MigratePCR0ManagerTest is Test {
    // Test accounts
    address deployer;
    address securityMultisig;
    address operationsMultisig;
    address unauthorized;

    // Contracts
    PCR0Manager pcr0Manager;

    // Governance roles
    bytes32 public constant SECURITY_ROLE = keccak256("SECURITY_ROLE");
    bytes32 public constant OPERATIONS_ROLE = keccak256("OPERATIONS_ROLE");

    // Finalized PCR0 values (32-byte format)
    bytes[] pcr0Values;

    function setUp() public {
        console2.log("================================================================================");
        console2.log("PCR0Manager DEPLOYMENT TEST: AccessControl Governance");
        console2.log("================================================================================");

        // Set up test accounts
        deployer = makeAddr("deployer");
        securityMultisig = makeAddr("securityMultisig");
        operationsMultisig = makeAddr("operationsMultisig");
        unauthorized = makeAddr("unauthorized");

        vm.deal(deployer, 100 ether);

        console2.log("Deployer:", deployer);
        console2.log("Critical Multisig:", securityMultisig);
        console2.log("Standard Multisig:", operationsMultisig);

        // Populate finalized PCR0 values (32-byte format)
        pcr0Values.push(hex"eb71776987d5f057030823f591d160c9d5d5e0a96c9a2a826778be1da2b8302a");
        pcr0Values.push(hex"d2221a0ee83901980c607ceff2edbedf3f6ce5f437eafa5d89be39e9e7487c04");
        pcr0Values.push(hex"4458aeb87796e92700be2d9c2984e376bce42bd80a4bf679e060d3bdaa6de119");
        pcr0Values.push(hex"aa3deefa408710420e8b4ffe5b95f1dafeb4f06cb16ea44ec7353944671c660a");
        pcr0Values.push(hex"b31e0df12cd52b961590796511d91a26364dd963c4aa727246b40513e470c232");
        pcr0Values.push(hex"26bc53c698f78016ad7c326198d25d309d1487098af3f28fc55e951f903e9596");
        pcr0Values.push(hex"b62720bdb510c2830cf9d58caa23912d0b214d6c278bf22e90942a6b69d272af");
    }

    function testDeploymentWorkflow() public {
        console2.log("\n=== Step 1: Deploy PCR0Manager ===");

        vm.startPrank(deployer);
        pcr0Manager = new PCR0Manager();
        vm.stopPrank();

        console2.log("Deployed at:", address(pcr0Manager));
        assertTrue(pcr0Manager.hasRole(SECURITY_ROLE, deployer), "Deployer missing SECURITY_ROLE");
        assertTrue(pcr0Manager.hasRole(OPERATIONS_ROLE, deployer), "Deployer missing OPERATIONS_ROLE");

        console2.log("\n=== Step 2: Add PCR0 Values ===");

        // Add PCR0 values
        vm.startPrank(deployer);
        for (uint256 i = 0; i < pcr0Values.length; i++) {
            pcr0Manager.addPCR0(pcr0Values[i]);
        }
        vm.stopPrank();

        console2.log("Added", pcr0Values.length, "PCR0 values");

        // Verify all PCR0s are set (check with 48-byte format)
        for (uint256 i = 0; i < pcr0Values.length; i++) {
            bytes memory pcr0_48 = abi.encodePacked(new bytes(16), pcr0Values[i]);
            assertTrue(pcr0Manager.isPCR0Set(pcr0_48), "PCR0 not set");
        }

        console2.log("\n=== Step 3: Test Governance ===");

        // Test add/remove functionality
        vm.startPrank(deployer);
        bytes memory testPCR0_32 = hex"1111111111111111111111111111111111111111111111111111111111111111";
        bytes memory testPCR0_48 = abi.encodePacked(new bytes(16), testPCR0_32);
        pcr0Manager.addPCR0(testPCR0_32);
        assertTrue(pcr0Manager.isPCR0Set(testPCR0_48), "Test PCR0 not added");
        pcr0Manager.removePCR0(testPCR0_32);
        assertFalse(pcr0Manager.isPCR0Set(testPCR0_48), "Test PCR0 not removed");
        vm.stopPrank();

        // Unauthorized user blocked
        vm.startPrank(unauthorized);
        vm.expectRevert();
        pcr0Manager.addPCR0(testPCR0_32);
        vm.stopPrank();

        console2.log("Governance working correctly");

        console2.log("\n=== Step 4: Transfer Roles to Multisigs ===");

        vm.startPrank(deployer);
        pcr0Manager.grantRole(SECURITY_ROLE, securityMultisig);
        pcr0Manager.grantRole(OPERATIONS_ROLE, operationsMultisig);
        pcr0Manager.renounceRole(SECURITY_ROLE, deployer);
        pcr0Manager.renounceRole(OPERATIONS_ROLE, deployer);
        vm.stopPrank();

        console2.log("Roles transferred to multisigs");

        console2.log("\n=== Step 5: Verify Final State ===");

        // Deployer has no roles
        assertFalse(pcr0Manager.hasRole(SECURITY_ROLE, deployer), "Deployer still has SECURITY_ROLE");
        assertFalse(pcr0Manager.hasRole(OPERATIONS_ROLE, deployer), "Deployer still has OPERATIONS_ROLE");

        // Multisigs have roles
        assertTrue(pcr0Manager.hasRole(SECURITY_ROLE, securityMultisig), "Critical multisig missing SECURITY_ROLE");
        assertTrue(
            pcr0Manager.hasRole(OPERATIONS_ROLE, operationsMultisig),
            "Standard multisig missing OPERATIONS_ROLE"
        );

        // Multisig can manage, deployer cannot
        vm.startPrank(securityMultisig);
        bytes memory testPCR0_32_v2 = hex"2222222222222222222222222222222222222222222222222222222222222222";
        bytes memory testPCR0_48_v2 = abi.encodePacked(new bytes(16), testPCR0_32_v2);
        pcr0Manager.addPCR0(testPCR0_32_v2);
        assertTrue(pcr0Manager.isPCR0Set(testPCR0_48_v2), "Multisig cannot add PCR0");
        pcr0Manager.removePCR0(testPCR0_32_v2);
        vm.stopPrank();

        vm.startPrank(deployer);
        vm.expectRevert();
        pcr0Manager.addPCR0(testPCR0_32_v2);
        vm.stopPrank();

        console2.log("Multisigs have full control");
        console2.log("Deployer has ZERO control");

        console2.log("\n================================================================================");
        console2.log("DEPLOYMENT TEST PASSED - Ready for production");
        console2.log("================================================================================");
    }
}
