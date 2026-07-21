// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import {SelfSBT} from "../../contracts/sbt/SelfSBT.sol";
import {SelfVerificationRoot} from "../../contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "../../contracts/interfaces/ISelfVerificationRoot.sol";
import {SelfStructs} from "../../contracts/libraries/SelfStructs.sol";
import {SelfUtils} from "../../contracts/libraries/SelfUtils.sol";

/// @dev Mirrors the real hub's setVerificationConfigV2: configId = sha256(abi.encode(config))
contract MockIdentityVerificationHubV2 {
    bytes public lastConfigEncoded;
    address public lastConfigCaller;
    uint256 public setConfigCalls;

    function setVerificationConfigV2(SelfStructs.VerificationConfigV2 memory config) external returns (bytes32) {
        lastConfigEncoded = abi.encode(config);
        lastConfigCaller = msg.sender;
        setConfigCalls++;
        return sha256(lastConfigEncoded);
    }
}

contract SelfSBTTest is Test {
    MockIdentityVerificationHubV2 hub;
    SelfSBT sbt;

    address alice;
    uint256 aliceKey;
    address bob;
    uint256 bobKey;

    uint256 constant NULLIFIER_1 = 111;
    uint256 constant NULLIFIER_2 = 222;
    bytes constant PAYLOAD = bytes('{"verificationId":"00000000-0000-0000-0000-000000000001"}');

    function setUp() public {
        (alice, aliceKey) = makeAddrAndKey("alice");
        (bob, bobKey) = makeAddrAndKey("bob");
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

    /// @dev EIP-191 consent signature over (contract, payload), hex-encoded as hosted-page
    ///      will produce it — the SDK utf8-encodes userDefinedData, so the sig travels as text
    function _consentSig(
        uint256 signerKey,
        address targetContract,
        bytes memory payload
    ) internal pure returns (bytes memory) {
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(keccak256(abi.encodePacked(targetContract, payload)));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        return _hex(abi.encodePacked(r, s, v));
    }

    function _hex(bytes memory data) internal pure returns (bytes memory out) {
        bytes memory alphabet = "0123456789abcdef";
        out = new bytes(data.length * 2);
        for (uint256 i = 0; i < data.length; i++) {
            out[2 * i] = alphabet[uint8(data[i]) >> 4];
            out[2 * i + 1] = alphabet[uint8(data[i]) & 0x0f];
        }
    }

    function _signedUserData(uint256 signerKey) internal view returns (bytes memory) {
        return abi.encodePacked(_consentSig(signerKey, address(sbt), PAYLOAD), PAYLOAD);
    }

    function _verify(uint256 nullifier, address recipient, uint256 recipientKey) internal {
        vm.prank(address(hub));
        sbt.onVerificationSuccess(abi.encode(_output(nullifier, recipient)), _signedUserData(recipientKey));
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
        _verify(NULLIFIER_1, alice, aliceKey);
        assertEq(sbt.balanceOf(alice), 1);
        assertEq(sbt.ownerOf(1), alice);
        assertTrue(sbt.usedNullifier(NULLIFIER_1));
    }

    function testTokenIdsIncrement() public {
        _verify(NULLIFIER_1, alice, aliceKey);
        _verify(NULLIFIER_2, bob, bobKey);
        assertEq(sbt.ownerOf(1), alice);
        assertEq(sbt.ownerOf(2), bob);
    }

    function testZeroAddressRecipientReverts() public {
        vm.prank(address(hub));
        vm.expectRevert(bytes("bad recipient"));
        sbt.onVerificationSuccess(abi.encode(_output(NULLIFIER_1, address(0))), _signedUserData(aliceKey));
    }

    function testNullifierReplayReverts() public {
        _verify(NULLIFIER_1, alice, aliceKey);
        vm.prank(address(hub));
        vm.expectRevert(bytes("already minted"));
        sbt.onVerificationSuccess(abi.encode(_output(NULLIFIER_1, bob)), _signedUserData(bobKey));
    }

    function testOneSbtPerWallet() public {
        _verify(NULLIFIER_1, alice, aliceKey);
        vm.prank(address(hub));
        vm.expectRevert(bytes("already holds SBT"));
        sbt.onVerificationSuccess(abi.encode(_output(NULLIFIER_2, alice)), _signedUserData(aliceKey));
    }

    function testHookRejectsNonHubCaller() public {
        vm.prank(alice);
        vm.expectRevert(SelfVerificationRoot.UnauthorizedCaller.selector);
        sbt.onVerificationSuccess(abi.encode(_output(NULLIFIER_1, alice)), _signedUserData(aliceKey));
    }

    // ── Recipient consent signature ──────────────────────────────────────

    function testMissingSigReverts() public {
        vm.prank(address(hub));
        vm.expectRevert(bytes("missing recipient sig"));
        sbt.onVerificationSuccess(abi.encode(_output(NULLIFIER_1, alice)), "");
    }

    function testShortSigReverts() public {
        bytes memory userData = new bytes(129);
        vm.prank(address(hub));
        vm.expectRevert(bytes("missing recipient sig"));
        sbt.onVerificationSuccess(abi.encode(_output(NULLIFIER_1, alice)), userData);
    }

    function testNonHexSigReverts() public {
        bytes memory userData = abi.encodePacked(_repeat("z", 130), PAYLOAD);
        vm.prank(address(hub));
        vm.expectRevert(bytes("invalid recipient sig"));
        sbt.onVerificationSuccess(abi.encode(_output(NULLIFIER_1, alice)), userData);
    }

    function _repeat(bytes1 c, uint256 n) internal pure returns (bytes memory out) {
        out = new bytes(n);
        for (uint256 i = 0; i < n; i++) {
            out[i] = c;
        }
    }

    function testSigFromWrongWalletReverts() public {
        vm.prank(address(hub));
        vm.expectRevert(bytes("recipient sig mismatch"));
        sbt.onVerificationSuccess(abi.encode(_output(NULLIFIER_1, alice)), _signedUserData(bobKey));
    }

    function testSigForOtherContractReverts() public {
        bytes memory userData = abi.encodePacked(_consentSig(aliceKey, address(0xdead), PAYLOAD), PAYLOAD);
        vm.prank(address(hub));
        vm.expectRevert(bytes("recipient sig mismatch"));
        sbt.onVerificationSuccess(abi.encode(_output(NULLIFIER_1, alice)), userData);
    }

    function testSigOverTamperedPayloadReverts() public {
        bytes memory tampered = bytes('{"verificationId":"00000000-0000-0000-0000-000000000002"}');
        bytes memory userData = abi.encodePacked(_consentSig(aliceKey, address(sbt), PAYLOAD), tampered);
        vm.prank(address(hub));
        vm.expectRevert(bytes("recipient sig mismatch"));
        sbt.onVerificationSuccess(abi.encode(_output(NULLIFIER_1, alice)), userData);
    }

    function testGarbageSigReverts() public {
        bytes memory userData = abi.encodePacked(_hex(new bytes(65)), PAYLOAD);
        vm.prank(address(hub));
        vm.expectRevert(bytes("invalid recipient sig"));
        sbt.onVerificationSuccess(abi.encode(_output(NULLIFIER_1, alice)), userData);
    }

    // ── Soulbound enforcement ────────────────────────────────────────────

    function testTransferFromReverts() public {
        _verify(NULLIFIER_1, alice, aliceKey);
        vm.prank(alice);
        vm.expectRevert(bytes("soulbound: non-transferable"));
        sbt.transferFrom(alice, bob, 1);
    }

    function testSafeTransferFromReverts() public {
        _verify(NULLIFIER_1, alice, aliceKey);
        vm.prank(alice);
        vm.expectRevert(bytes("soulbound: non-transferable"));
        sbt.safeTransferFrom(alice, bob, 1);
    }

    function testApprovedTransferStillReverts() public {
        _verify(NULLIFIER_1, alice, aliceKey);
        vm.prank(alice);
        sbt.approve(bob, 1);
        vm.prank(bob);
        vm.expectRevert(bytes("soulbound: non-transferable"));
        sbt.transferFrom(alice, bob, 1);
    }
}
