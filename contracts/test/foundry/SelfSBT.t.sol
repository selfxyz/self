// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";

import {SelfSBT} from "../../contracts/sbt/SelfSBT.sol";
import {SelfVerificationRoot} from "../../contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "../../contracts/interfaces/ISelfVerificationRoot.sol";
import {SelfStructs} from "../../contracts/libraries/SelfStructs.sol";
import {SelfUtils} from "../../contracts/libraries/SelfUtils.sol";

/// @dev Mirrors the real hub's setVerificationConfigV2: configId = sha256(abi.encode(config))
contract MockIdentityVerificationHubV2 {
    bytes public lastConfigEncoded;
    uint256 public setConfigCalls;

    function setVerificationConfigV2(SelfStructs.VerificationConfigV2 memory config) external returns (bytes32) {
        lastConfigEncoded = abi.encode(config);
        setConfigCalls++;
        return sha256(lastConfigEncoded);
    }
}

contract SelfSBTTest is Test {
    MockIdentityVerificationHubV2 hub;
    SelfSBT sbt;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    uint256 constant NULLIFIER_1 = 111;
    uint256 constant NULLIFIER_2 = 222;

    function setUp() public {
        hub = new MockIdentityVerificationHubV2();
        sbt = new SelfSBT(address(hub), "test-scope-seed", "Self SBT", "SSBT", _cfg());
    }

    function _cfg() internal pure returns (SelfUtils.UnformattedVerificationConfigV2 memory cfg) {
        string[] memory forbidden = new string[](2);
        forbidden[0] = "IRN";
        forbidden[1] = "PRK";
        cfg = SelfUtils.UnformattedVerificationConfigV2({
            olderThan: 18,
            forbiddenCountries: forbidden,
            ofacEnabled: true
        });
    }

    function _output(
        uint256 nullifier,
        address recipient
    ) internal pure returns (ISelfVerificationRoot.GenericDiscloseOutputV2 memory output) {
        output = ISelfVerificationRoot.GenericDiscloseOutputV2({
            attestationId: bytes32(uint256(1)),
            userIdentifier: uint256(uint160(recipient)),
            nullifier: nullifier,
            forbiddenCountriesListPacked: [uint256(0), uint256(0), uint256(0), uint256(0)],
            issuingState: "",
            name: new string[](3),
            idNumber: "",
            nationality: "",
            dateOfBirth: "",
            gender: "",
            expiryDate: "",
            olderThan: 18,
            ofac: [true, true, true]
        });
    }

    function _verify(uint256 nullifier, address recipient) internal {
        vm.prank(address(hub));
        sbt.onVerificationSuccess(abi.encode(_output(nullifier, recipient)), "");
    }

    // ── Constructor / config registration ──────────────────────────────

    function testConstructorRegistersConfigOnHub() public view {
        assertEq(hub.setConfigCalls(), 1);
        assertEq(hub.lastConfigEncoded(), abi.encode(SelfUtils.formatVerificationConfigV2(_cfg())));
    }

    function testConstructorStoresReturnedConfigId() public view {
        bytes32 expected = sha256(abi.encode(SelfUtils.formatVerificationConfigV2(_cfg())));
        assertEq(sbt.verificationConfigId(), expected);
    }

    function testGetConfigIdIgnoresAllParams() public view {
        bytes32 expected = sbt.verificationConfigId();
        assertEq(sbt.getConfigId(bytes32(0), bytes32(0), ""), expected);
        assertEq(sbt.getConfigId(bytes32(uint256(42)), bytes32(uint256(7)), "user defined data"), expected);
    }

    // ── Minting via the verification hook ───────────────────────────────

    function testHookMintsToUserIdentifier() public {
        _verify(NULLIFIER_1, alice);
        assertEq(sbt.balanceOf(alice), 1);
        assertEq(sbt.ownerOf(1), alice);
        assertTrue(sbt.usedNullifier(NULLIFIER_1));
    }

    function testTokenIdsIncrement() public {
        _verify(NULLIFIER_1, alice);
        _verify(NULLIFIER_2, bob);
        assertEq(sbt.ownerOf(1), alice);
        assertEq(sbt.ownerOf(2), bob);
    }

    function testZeroAddressRecipientReverts() public {
        vm.prank(address(hub));
        vm.expectRevert(bytes("bad recipient"));
        sbt.onVerificationSuccess(abi.encode(_output(NULLIFIER_1, address(0))), "");
    }

    function testNullifierReplayReverts() public {
        _verify(NULLIFIER_1, alice);
        vm.prank(address(hub));
        vm.expectRevert(bytes("already minted"));
        sbt.onVerificationSuccess(abi.encode(_output(NULLIFIER_1, bob)), "");
    }

    function testOneSbtPerWallet() public {
        _verify(NULLIFIER_1, alice);
        vm.prank(address(hub));
        vm.expectRevert(bytes("already holds SBT"));
        sbt.onVerificationSuccess(abi.encode(_output(NULLIFIER_2, alice)), "");
    }

    function testHookRejectsNonHubCaller() public {
        vm.prank(alice);
        vm.expectRevert(SelfVerificationRoot.UnauthorizedCaller.selector);
        sbt.onVerificationSuccess(abi.encode(_output(NULLIFIER_1, alice)), "");
    }

    // ── Soulbound enforcement ────────────────────────────────────────────

    function testTransferFromReverts() public {
        _verify(NULLIFIER_1, alice);
        vm.prank(alice);
        vm.expectRevert(bytes("soulbound: non-transferable"));
        sbt.transferFrom(alice, bob, 1);
    }

    function testSafeTransferFromReverts() public {
        _verify(NULLIFIER_1, alice);
        vm.prank(alice);
        vm.expectRevert(bytes("soulbound: non-transferable"));
        sbt.safeTransferFrom(alice, bob, 1);
    }

    function testApprovedTransferStillReverts() public {
        _verify(NULLIFIER_1, alice);
        vm.prank(alice);
        sbt.approve(bob, 1);
        vm.prank(bob);
        vm.expectRevert(bytes("soulbound: non-transferable"));
        sbt.transferFrom(alice, bob, 1);
    }
}
