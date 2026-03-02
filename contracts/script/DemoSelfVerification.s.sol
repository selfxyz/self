// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {ISelfVerificationRoot} from "../contracts/interfaces/ISelfVerificationRoot.sol";
import {SelfVerificationApp} from "../contracts/SelfVerificationApp.sol";
import {SelfVerificationFactory} from "../contracts/SelfVerificationFactory.sol";
import {MockIdentityVerificationHubV2} from "../contracts/tests/MockIdentityVerificationHubV2.sol";

/**
 * @title DemoSelfVerification
 * @notice Deploys the full SelfVerification system to local anvil with a mock Hub V2,
 *         then demonstrates the complete verification flow end-to-end.
 *
 * Usage:
 *   anvil &
 *   forge script script/DemoSelfVerification.s.sol --rpc-url http://localhost:8545 --broadcast
 */
contract DemoSelfVerification is Script {
    // Anvil default accounts
    uint256 constant DEPLOYER_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 constant RELAYER_KEY = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;

    address constant DEPLOYER = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address constant RELAYER = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    address constant USER_ALICE = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
    address constant USER_BOB = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;

    // Deployed addresses (set in phase1)
    MockIdentityVerificationHubV2 hub;
    SelfVerificationFactory factory;
    address clone1;
    address clone2;

    function run() external {
        _phase1_deploy();
        _phase2_createApps();
        _phase3_verifyAlice();
        _phase4_crossAppIsolation();
        _phase5_verifyBob();
        _phase6_sybilResistance();
        _summary();
    }

    function _phase1_deploy() internal {
        console.log("=== PHASE 1: Deploying infrastructure ===");

        vm.startBroadcast(DEPLOYER_KEY);

        hub = new MockIdentityVerificationHubV2();
        console.log("  MockHubV2:  ", address(hub));

        SelfVerificationApp appImpl = new SelfVerificationApp(address(hub));
        console.log("  AppImpl:    ", address(appImpl));

        SelfVerificationFactory factoryImpl = new SelfVerificationFactory();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(factoryImpl),
            abi.encodeCall(
                SelfVerificationFactory.initialize,
                (DEPLOYER, address(appImpl), RELAYER, 365 days)
            )
        );
        factory = SelfVerificationFactory(address(proxy));
        console.log("  Factory:    ", address(factory));
        console.log("  Relayer:    ", RELAYER);
        console.log("");

        vm.stopBroadcast();
    }

    function _phase2_createApps() internal {
        console.log("=== PHASE 2: Creating app clones ===");

        vm.startBroadcast(RELAYER_KEY);

        string[] memory noCountries = new string[](0);
        clone1 = factory.createApp(1, "DemoApp Simple", 0, false, noCountries);
        console.log("  App 1 clone:", clone1);

        clone2 = factory.createApp(2, "DemoApp Age-Gated", 18, true, noCountries);
        console.log("  App 2 clone:", clone2);

        vm.stopBroadcast();

        require(clone1 != clone2, "Clones must have different addresses");
        console.log("  [OK] Different addresses = unlinkable scopes");
        console.log("");
    }

    function _phase3_verifyAlice() internal {
        console.log("=== PHASE 3: Verify Alice via full verifySelfProof() flow ===");

        vm.startBroadcast(RELAYER_KEY);

        // Configure mock hub with Alice's passport data
        hub.setNextVerificationOutput(_buildOutput(USER_ALICE, 42001, "311231"));

        // Call verifySelfProof — the REAL entry point
        // Mock hub skips ZK proof validation, calls back onVerificationSuccess
        SelfVerificationApp(clone1).verifySelfProof(
            abi.encodePacked(bytes32(uint256(1)), bytes32(0)),
            abi.encodePacked(bytes32(uint256(block.chainid)), bytes32(uint256(uint160(USER_ALICE))), bytes32(0))
        );

        vm.stopBroadcast();

        require(factory.isVerified(1, USER_ALICE), "Alice should be verified");
        console.log("  factory.isVerified(1, Alice) = true");

        (uint256 verifiedAt, uint256 expiresAt) = SelfVerificationApp(clone1).verifications(USER_ALICE);
        console.log("  verifiedAt:", verifiedAt);
        console.log("  expiresAt: ", expiresAt);
        console.log("  [OK] Alice verified on App 1");
        console.log("");
    }

    function _phase4_crossAppIsolation() internal {
        console.log("=== PHASE 4: Cross-app isolation ===");

        require(!factory.isVerified(2, USER_ALICE), "Alice should NOT be on App 2");
        console.log("  factory.isVerified(2, Alice) = false");
        console.log("  [OK] Verification does NOT leak across apps");
        console.log("");
    }

    function _phase5_verifyBob() internal {
        console.log("=== PHASE 5: Verify Bob on App 2 ===");

        vm.startBroadcast(RELAYER_KEY);

        hub.setNextVerificationOutput(_buildOutput(USER_BOB, 42002, "280615"));
        SelfVerificationApp(clone2).verifySelfProof(
            abi.encodePacked(bytes32(uint256(1)), bytes32(0)),
            abi.encodePacked(bytes32(uint256(block.chainid)), bytes32(uint256(uint160(USER_BOB))), bytes32(0))
        );

        vm.stopBroadcast();

        require(factory.isVerified(2, USER_BOB), "Bob should be verified on App 2");
        require(!factory.isVerified(1, USER_BOB), "Bob should NOT be on App 1");
        console.log("  factory.isVerified(2, Bob) = true");
        console.log("  factory.isVerified(1, Bob) = false");
        console.log("  [OK] Bob verified on App 2 only");
        console.log("");
    }

    function _phase6_sybilResistance() internal {
        console.log("=== PHASE 6: Sybil resistance ===");

        // Use vm.prank (not broadcast) + direct callback to test sybil resistance
        // In broadcast mode, try/catch doesn't work well with forge's simulation
        vm.prank(address(hub));
        try ISelfVerificationRoot(clone1).onVerificationSuccess(
            abi.encode(_buildOutput(USER_BOB, 42001, "311231")),
            ""
        ) {
            revert("Should have reverted with DuplicateNullifier");
        } catch (bytes memory reason) {
            // Verify it's the DuplicateNullifier error
            bytes4 selector = bytes4(reason);
            require(selector == SelfVerificationApp.DuplicateNullifier.selector, "Wrong error");
            console.log("  [OK] DuplicateNullifier: same passport cannot verify as different wallet");
        }

        console.log("");
    }

    function _summary() internal view {
        console.log("========================================");
        console.log("  DEMO COMPLETE - ALL CHECKS PASSED");
        console.log("========================================");
        console.log("");
        console.log("Addresses for frontend demo (copy these):");
        console.log("  MOCK_HUB=%s", address(hub));
        console.log("  FACTORY=%s", address(factory));
        console.log("  APP_1_CLONE=%s", clone1);
        console.log("  APP_2_CLONE=%s", clone2);
    }

    function _buildOutput(
        address user,
        uint256 nullifier,
        string memory expiryDate
    ) internal pure returns (ISelfVerificationRoot.GenericDiscloseOutputV2 memory output) {
        string[] memory nameArr = new string[](1);
        nameArr[0] = "Demo User";
        output = ISelfVerificationRoot.GenericDiscloseOutputV2({
            attestationId: bytes32(uint256(1)),
            userIdentifier: uint256(uint160(user)),
            nullifier: nullifier,
            forbiddenCountriesListPacked: [uint256(0), 0, 0, 0],
            issuingState: "USA",
            name: nameArr,
            idNumber: "DEMO12345",
            nationality: "USA",
            dateOfBirth: "900101",
            gender: "M",
            expiryDate: expiryDate,
            olderThan: 0,
            ofac: [false, false, false]
        });
    }
}
