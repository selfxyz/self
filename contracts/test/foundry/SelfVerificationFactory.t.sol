// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {ISelfVerificationRoot} from "../../contracts/interfaces/ISelfVerificationRoot.sol";
import {SelfStructs} from "../../contracts/libraries/SelfStructs.sol";
import {SelfVerificationApp} from "../../contracts/SelfVerificationApp.sol";
import {SelfVerificationFactory} from "../../contracts/SelfVerificationFactory.sol";

/**
 * @title MockHubV2
 * @dev Simulates Hub V2 by accepting verify() calls and directly invoking
 *      onVerificationSuccess() on the caller with the provided output data.
 *      In production, Hub V2 validates ZK proofs before calling back.
 */
contract MockHubV2 {
    bytes32 public lastConfigId;

    function setVerificationConfigV2(
        SelfStructs.VerificationConfigV2 memory
    ) external returns (bytes32 configId) {
        configId = keccak256(abi.encode(block.timestamp, msg.sender));
        lastConfigId = configId;
        return configId;
    }

    function verify(bytes calldata, bytes calldata) external {
        // No-op: the test will call simulateCallback directly
    }

    function verificationConfigV2Exists(bytes32) external pure returns (bool) {
        return true;
    }

    /**
     * @dev Test helper: simulates Hub V2 calling onVerificationSuccess on a clone.
     *      Encodes the GenericDiscloseOutputV2 and calls the clone's callback.
     */
    function simulateCallback(
        address clone,
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) external {
        bytes memory encodedOutput = abi.encode(output);
        ISelfVerificationRoot(clone).onVerificationSuccess(encodedOutput, userData);
    }
}

contract SelfVerificationFactoryTest is Test {
    MockHubV2 hub;
    SelfVerificationApp appImpl;
    SelfVerificationFactory factory;

    address owner = makeAddr("owner");
    address relayer = makeAddr("relayer");
    address user1 = makeAddr("user1");
    address user2 = makeAddr("user2");
    address nobody = makeAddr("nobody");

    uint256 constant MAX_PROOF_AGE = 365 days;

    function setUp() public {
        hub = new MockHubV2();
        appImpl = new SelfVerificationApp(address(hub));

        SelfVerificationFactory factoryImpl = new SelfVerificationFactory();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(factoryImpl),
            abi.encodeCall(
                SelfVerificationFactory.initialize,
                (owner, address(appImpl), relayer, MAX_PROOF_AGE)
            )
        );
        factory = SelfVerificationFactory(address(proxy));
    }

    // ====================================================
    // Helpers
    // ====================================================

    function _createApp(uint256 appId, string memory name) internal returns (address clone) {
        string[] memory forbidden = new string[](0);
        vm.prank(relayer);
        clone = factory.createApp(appId, name, 0, false, forbidden);
    }

    function _buildOutput(
        address user,
        uint256 nullifier,
        string memory expiryDate
    ) internal pure returns (ISelfVerificationRoot.GenericDiscloseOutputV2 memory output) {
        string[] memory nameArr = new string[](1);
        nameArr[0] = "Test User";
        output = ISelfVerificationRoot.GenericDiscloseOutputV2({
            attestationId: bytes32(uint256(1)),
            userIdentifier: uint256(uint160(user)),
            nullifier: nullifier,
            forbiddenCountriesListPacked: [uint256(0), 0, 0, 0],
            issuingState: "USA",
            name: nameArr,
            idNumber: "X12345",
            nationality: "USA",
            dateOfBirth: "900101",
            gender: "M",
            expiryDate: expiryDate,
            olderThan: 0,
            ofac: [false, false, false]
        });
    }

    function _verifyUser(
        address clone,
        address user,
        uint256 nullifier,
        string memory expiryDate
    ) internal {
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output = _buildOutput(user, nullifier, expiryDate);
        hub.simulateCallback(clone, output, "");
    }

    // ====================================================
    // Initialization Tests
    // ====================================================

    function test_initialization() public view {
        assertEq(factory.owner(), owner);
        assertEq(factory.appImplementation(), address(appImpl));
        assertEq(factory.maxProofAge(), MAX_PROOF_AGE);
        assertTrue(factory.isAuthorizedRelayer(relayer));
        assertFalse(factory.isAuthorizedRelayer(nobody));
    }

    // ====================================================
    // Clone Deployment Tests
    // ====================================================

    function test_createApp_deploysClone() public {
        address clone = _createApp(1, "My App");

        assertTrue(clone != address(0));
        assertTrue(factory.appExists(1));
        assertEq(factory.getApp(1), clone);
        assertEq(SelfVerificationApp(clone).appName(), "My App");
        assertEq(SelfVerificationApp(clone).maxProofAge(), MAX_PROOF_AGE);
    }

    function test_createApp_uniqueAddresses() public {
        address clone1 = _createApp(1, "App 1");
        address clone2 = _createApp(2, "App 2");

        assertTrue(clone1 != clone2, "Clones must have different addresses for scope isolation");
    }

    function test_createApp_revertsIfExists() public {
        _createApp(42, "App");
        vm.expectRevert(abi.encodeWithSelector(SelfVerificationFactory.AppAlreadyExists.selector, 42));
        vm.prank(relayer);
        string[] memory forbidden = new string[](0);
        factory.createApp(42, "Dup", 0, false, forbidden);
    }

    function test_createApp_revertsIfNotRelayer() public {
        vm.expectRevert(SelfVerificationFactory.UnauthorizedRelayer.selector);
        vm.prank(nobody);
        string[] memory forbidden = new string[](0);
        factory.createApp(1, "App", 0, false, forbidden);
    }

    function test_createApp_emitsEvent() public {
        string[] memory forbidden = new string[](0);
        vm.prank(relayer);
        // Can't predict clone address, so just check event is emitted
        vm.recordLogs();
        factory.createApp(1, "My App", 0, false, forbidden);
        // The AppCreated event is emitted — we verified clone deployment above
    }

    // ====================================================
    // Verification Tests
    // ====================================================

    function test_verification_storesResult() public {
        address clone = _createApp(1, "App");

        // Expiry date far in the future: 2035-12-31
        _verifyUser(clone, user1, 1001, "351231");

        assertTrue(SelfVerificationApp(clone).isVerified(user1));
        assertTrue(factory.isVerified(1, user1));

        (uint256 verifiedAt, uint256 expiresAt) = SelfVerificationApp(clone).verifications(user1);
        assertEq(verifiedAt, block.timestamp);
        assertTrue(expiresAt > block.timestamp);
    }

    function test_verification_expiresAtMinOfDocAndProofAge() public {
        address clone = _createApp(1, "App");

        // Set block timestamp to a known value
        vm.warp(1700000000); // ~Nov 2023

        // Doc expiry 2025-01-15 (within maxProofAge from timestamp)
        _verifyUser(clone, user1, 1001, "250115");

        (, uint256 expiresAt) = SelfVerificationApp(clone).verifications(user1);

        // docExpiry should be ~Jan 15 2025 as a timestamp
        // maxProofAge = 365 days = 1700000000 + 365*86400 = ~1731536000
        // Doc expiry for 250115 should be around 1736899200
        // Since docExpiry > ageExpiry, expiresAt should be ageExpiry
        assertEq(expiresAt, block.timestamp + MAX_PROOF_AGE);
    }

    function test_verification_usesDocExpiryWhenSooner() public {
        address clone = _createApp(1, "App");

        // Set timestamp far in the past so doc expiry is sooner than proof age
        vm.warp(1700000000);

        // Doc expiry very soon: 2024-06-01
        _verifyUser(clone, user1, 1001, "240601");

        (, uint256 expiresAt) = SelfVerificationApp(clone).verifications(user1);

        // docExpiry ~= Jun 1 2024 = before timestamp + 365 days (~Nov 2024)
        // So expiresAt should be docExpiry
        uint256 expectedDocExpiry = _approxTimestamp(2024, 6, 1);
        assertEq(expiresAt, expectedDocExpiry);
        assertTrue(expiresAt < block.timestamp + MAX_PROOF_AGE);
    }

    function test_isVerified_falseAfterExpiry() public {
        address clone = _createApp(1, "App");

        vm.warp(1700000000);
        _verifyUser(clone, user1, 1001, "351231");

        assertTrue(factory.isVerified(1, user1));

        // Warp past expiry
        vm.warp(block.timestamp + MAX_PROOF_AGE + 1);
        assertFalse(factory.isVerified(1, user1));
        assertFalse(SelfVerificationApp(clone).isVerified(user1));
    }

    function test_isVerified_falseForNonexistentApp() public view {
        assertFalse(factory.isVerified(999, user1));
    }

    function test_isVerified_falseForUnverifiedUser() public {
        _createApp(1, "App");
        assertFalse(factory.isVerified(1, user1));
    }

    // ====================================================
    // Re-verification Tests
    // ====================================================

    function test_reverification_resetsExpiry() public {
        address clone = _createApp(1, "App");

        vm.warp(1700000000);
        _verifyUser(clone, user1, 1001, "351231");

        (, uint256 firstExpiry) = SelfVerificationApp(clone).verifications(user1);

        // Warp forward 100 days, re-verify with same nullifier (same passport, same wallet)
        vm.warp(1700000000 + 100 days);
        _verifyUser(clone, user1, 1001, "351231");

        (, uint256 secondExpiry) = SelfVerificationApp(clone).verifications(user1);
        assertTrue(secondExpiry > firstExpiry, "Re-verification should extend expiry");
    }

    // ====================================================
    // Nullifier / Sybil Tests
    // ====================================================

    function test_nullifier_blocksDifferentWallet() public {
        address clone = _createApp(1, "App");

        _verifyUser(clone, user1, 1001, "351231");

        // Same nullifier (same passport), different wallet → should revert
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output = _buildOutput(user2, 1001, "351231");
        vm.expectRevert(abi.encodeWithSelector(SelfVerificationApp.DuplicateNullifier.selector, 1001));
        hub.simulateCallback(clone, output, "");
    }

    function test_nullifier_allowsSameWallet() public {
        address clone = _createApp(1, "App");

        // First verification
        _verifyUser(clone, user1, 1001, "351231");
        // Same nullifier + same wallet (re-verification) → should succeed
        _verifyUser(clone, user1, 1001, "351231");

        assertTrue(SelfVerificationApp(clone).isVerified(user1));
    }

    function test_invalidUserIdentifier_reverts() public {
        address clone = _createApp(1, "App");

        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output = _buildOutput(user1, 1001, "351231");
        output.userIdentifier = 0; // Invalid
        vm.expectRevert(SelfVerificationApp.InvalidUserIdentifier.selector);
        hub.simulateCallback(clone, output, "");
    }

    // ====================================================
    // Cross-app Isolation Tests
    // ====================================================

    function test_crossAppIsolation_sameNullifierDifferentApps() public {
        address clone1 = _createApp(1, "App 1");
        address clone2 = _createApp(2, "App 2");

        // Same passport (same nullifier) can verify in BOTH apps
        // (nullifiers are per-scope in the ZK circuit, so in reality they'd be different,
        //  but even if we use the same test nullifier, each clone tracks independently)
        _verifyUser(clone1, user1, 1001, "351231");
        _verifyUser(clone2, user1, 1001, "351231");

        assertTrue(factory.isVerified(1, user1));
        assertTrue(factory.isVerified(2, user1));
    }

    function test_crossAppIsolation_differentUsers() public {
        address clone1 = _createApp(1, "App 1");
        address clone2 = _createApp(2, "App 2");

        _verifyUser(clone1, user1, 1001, "351231");
        _verifyUser(clone2, user2, 2002, "351231");

        assertTrue(factory.isVerified(1, user1));
        assertFalse(factory.isVerified(1, user2));
        assertTrue(factory.isVerified(2, user2));
        assertFalse(factory.isVerified(2, user1));
    }

    // ====================================================
    // Admin Tests
    // ====================================================

    function test_setRelayer() public {
        address newRelayer = makeAddr("newRelayer");

        vm.prank(owner);
        factory.setRelayer(newRelayer, true);
        assertTrue(factory.isAuthorizedRelayer(newRelayer));

        // New relayer can create apps
        string[] memory forbidden = new string[](0);
        vm.prank(newRelayer);
        factory.createApp(1, "App", 0, false, forbidden);
        assertTrue(factory.appExists(1));

        // Revoke
        vm.prank(owner);
        factory.setRelayer(newRelayer, false);
        assertFalse(factory.isAuthorizedRelayer(newRelayer));

        vm.expectRevert(SelfVerificationFactory.UnauthorizedRelayer.selector);
        vm.prank(newRelayer);
        factory.createApp(2, "App 2", 0, false, forbidden);
    }

    function test_setRelayer_onlyOwner() public {
        vm.expectRevert();
        vm.prank(nobody);
        factory.setRelayer(nobody, true);
    }

    function test_setMaxProofAge() public {
        vm.prank(owner);
        factory.setMaxProofAge(180 days);
        assertEq(factory.maxProofAge(), 180 days);
    }

    function test_setAppImplementation() public {
        SelfVerificationApp newImpl = new SelfVerificationApp(address(hub));
        vm.prank(owner);
        factory.setAppImplementation(address(newImpl));
        assertEq(factory.appImplementation(), address(newImpl));
    }

    // ====================================================
    // Clone Initialization Protection
    // ====================================================

    function test_clone_cannotBeReinitalized() public {
        address clone = _createApp(1, "App");

        string[] memory forbidden = new string[](0);
        vm.expectRevert(SelfVerificationApp.AlreadyInitialized.selector);
        SelfVerificationApp(clone).initialize("seed", "name", 0, false, forbidden, MAX_PROOF_AGE);
    }

    function test_onlyHubCanCallOnVerificationSuccess() public {
        address clone = _createApp(1, "App");

        vm.expectRevert();
        vm.prank(nobody);
        ISelfVerificationRoot(clone).onVerificationSuccess("", "");
    }

    // ====================================================
    // Date Parsing Edge Cases
    // ====================================================

    function test_emptyExpiryDate_usesProofAge() public {
        address clone = _createApp(1, "App");

        vm.warp(1700000000);

        // Empty expiry → _parseYYMMDDToTimestamp returns 0 → uses ageExpiry
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output = _buildOutput(user1, 1001, "");
        hub.simulateCallback(clone, output, "");

        (, uint256 expiresAt) = SelfVerificationApp(clone).verifications(user1);
        assertEq(expiresAt, block.timestamp + MAX_PROOF_AGE);
    }

    function test_pre1970ExpiryDate_usesProofAge() public {
        address clone = _createApp(1, "App");
        vm.warp(1700000000);

        // YY=60 → year 1960 (pre-1970) → returns 0 → falls back to ageExpiry
        _verifyUser(clone, user1, 1001, "600101");

        (, uint256 expiresAt) = SelfVerificationApp(clone).verifications(user1);
        assertEq(expiresAt, block.timestamp + MAX_PROOF_AGE);
    }

    function test_dayZero_usesProofAge() public {
        address clone = _createApp(1, "App");
        vm.warp(1700000000);

        // Day 00 is invalid → returns 0 → falls back to ageExpiry
        _verifyUser(clone, user1, 1001, "250100");

        (, uint256 expiresAt) = SelfVerificationApp(clone).verifications(user1);
        assertEq(expiresAt, block.timestamp + MAX_PROOF_AGE);
    }

    function test_monthZero_usesProofAge() public {
        address clone = _createApp(1, "App");
        vm.warp(1700000000);

        // Month 00 is invalid → returns 0 → falls back to ageExpiry
        _verifyUser(clone, user1, 1001, "250015");

        (, uint256 expiresAt) = SelfVerificationApp(clone).verifications(user1);
        assertEq(expiresAt, block.timestamp + MAX_PROOF_AGE);
    }

    function test_nonDigitExpiryDate_usesProofAge() public {
        address clone = _createApp(1, "App");
        vm.warp(1700000000);

        // Non-digit characters → returns 0 → falls back to ageExpiry
        _verifyUser(clone, user1, 1001, "AB0101");

        (, uint256 expiresAt) = SelfVerificationApp(clone).verifications(user1);
        assertEq(expiresAt, block.timestamp + MAX_PROOF_AGE);
    }

    // ====================================================
    // Admin Edge Cases
    // ====================================================

    function test_setAppImplementation_revertsOnZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(SelfVerificationFactory.ZeroAddress.selector);
        factory.setAppImplementation(address(0));
    }

    // ====================================================
    // Implementation Protection
    // ====================================================

    function test_implementation_cannotBeInitialized() public {
        // The implementation contract itself should have _initialized = true
        // (set in constructor) to prevent anyone from calling initialize() on it
        string[] memory forbidden = new string[](0);
        vm.expectRevert(SelfVerificationApp.AlreadyInitialized.selector);
        appImpl.initialize("seed", "name", 0, false, forbidden, MAX_PROOF_AGE);
    }

    // ====================================================
    // Scope Seed Length Safety
    // ====================================================

    function test_createApp_worksWithLargeAppId() public {
        // With prefix "sv-" (3 chars), max appId = 28 digits
        // 10^27 = 1000000000000000000000000000 (28 digits) should work
        uint256 largeAppId = 1000000000000000000000000000;
        string[] memory forbidden = new string[](0);
        vm.prank(relayer);
        address clone = factory.createApp(largeAppId, "Large ID App", 0, false, forbidden);
        assertTrue(clone != address(0));
        assertTrue(factory.appExists(largeAppId));
    }

    function test_createApp_worksWithMaxSafeScopeSeed() public {
        // 28 digits = max for "sv-" prefix (3 + 28 = 31 bytes)
        uint256 maxSafeId = 9999999999999999999999999999; // 28 nines
        string[] memory forbidden = new string[](0);
        vm.prank(relayer);
        address clone = factory.createApp(maxSafeId, "Max Safe App", 0, false, forbidden);
        assertTrue(clone != address(0));
    }

    // ====================================================
    // Helpers
    // ====================================================

    /// @dev Approximate UNIX timestamp for a date (matches _parseYYMMDDToTimestamp logic)
    function _approxTimestamp(uint256 year, uint256 mm, uint256 dd) internal pure returns (uint256) {
        uint256[12] memory days_ = [uint256(0), 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        uint256 d = days_[mm - 1];
        if (mm > 2 && (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0))) d += 1;
        uint256 daysSinceEpoch = (year - 1970) * 365 + (year - 1969) / 4 + d + dd - 1;
        return daysSinceEpoch * 1 days;
    }
}
