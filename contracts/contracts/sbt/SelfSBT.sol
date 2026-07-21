// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import {SelfVerificationRoot} from "../abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "../interfaces/ISelfVerificationRoot.sol";
import {IIdentityVerificationHubV2} from "../interfaces/IIdentityVerificationHubV2.sol";
import {SelfUtils} from "../libraries/SelfUtils.sol";

/**
 * @title SelfSBT
 * @notice Soulbound ERC-721 minted through Self identity verification
 * @dev Extends SelfVerificationRoot; the hub V2 callback mints one non-transferable
 *      token per verified human (keyed on the proof nullifier) to the verified wallet
 */
contract SelfSBT is SelfVerificationRoot, ERC721 {
    /// @notice Verification config ID registered on the hub at deploy time
    bytes32 public verificationConfigId;

    uint256 private _nextId;

    /// @notice Nullifiers that have already minted — one mint per human
    mapping(uint256 nullifier => bool used) public usedNullifier;

    /**
     * @param hubV2 The Identity Verification Hub V2 address
     * @param scopeSeed The scope seed string hashed with this contract's address into the scope
     * @param name_ ERC-721 collection name
     * @param symbol_ ERC-721 collection symbol
     * @param cfg Unformatted verification config, registered on the hub at construction
     */
    constructor(
        address hubV2,
        string memory scopeSeed,
        string memory name_,
        string memory symbol_,
        SelfUtils.UnformattedVerificationConfigV2 memory cfg
    ) SelfVerificationRoot(hubV2, scopeSeed) ERC721(name_, symbol_) {
        verificationConfigId = IIdentityVerificationHubV2(hubV2).setVerificationConfigV2(
            SelfUtils.formatVerificationConfigV2(cfg)
        );
    }

    /// @dev Static config; userDefinedData carries the recipient sig + correlation payload
    ///      (validated in the hook), not config-routing data — ignore it here
    function getConfigId(bytes32, bytes32, bytes memory) public view override returns (bytes32) {
        return verificationConfigId;
    }

    /**
     * @dev userData layout: | 130 hex chars of a 65-byte ECDSA signature | correlation payload |.
     *      The sig travels hex-encoded because the Self SDK utf8-encodes userDefinedData —
     *      raw signature bytes cannot survive the string pipeline. It is an EIP-191
     *      personal_sign (EOA-only) by the recipient over
     *      keccak256(abi.encodePacked(address(this), correlationPayload)) — binding consent
     *      to this contract and this session, so a prover cannot mint to a wallet that
     *      never agreed to receive an SBT here
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) internal override {
        require(!usedNullifier[output.nullifier], "already minted");
        address to = address(uint160(output.userIdentifier));
        require(to != address(0), "bad recipient");
        require(balanceOf(to) == 0, "already holds SBT");
        require(_recoverRecipientSigner(userData) == to, "recipient sig mismatch");
        usedNullifier[output.nullifier] = true;
        _mint(to, ++_nextId);
    }

    uint256 private constant SIG_HEX_CHARS = 130;

    function _recoverRecipientSigner(bytes memory userData) private view returns (address) {
        require(userData.length >= SIG_HEX_CHARS, "missing recipient sig");
        bytes memory sig = new bytes(65);
        for (uint256 i = 0; i < 65; i++) {
            sig[i] = bytes1((_hexNibble(userData[2 * i]) << 4) | _hexNibble(userData[2 * i + 1]));
        }
        bytes memory payload = new bytes(userData.length - SIG_HEX_CHARS);
        for (uint256 i = 0; i < payload.length; i++) {
            payload[i] = userData[SIG_HEX_CHARS + i];
        }
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(keccak256(abi.encodePacked(address(this), payload)));
        (address signer, ECDSA.RecoverError err, ) = ECDSA.tryRecover(digest, sig);
        require(err == ECDSA.RecoverError.NoError, "invalid recipient sig");
        return signer;
    }

    function _hexNibble(bytes1 c) private pure returns (uint8) {
        uint8 b = uint8(c);
        if (b >= 0x30 && b <= 0x39) return b - 0x30;
        if (b >= 0x61 && b <= 0x66) return b - 0x57;
        if (b >= 0x41 && b <= 0x46) return b - 0x37;
        revert("invalid recipient sig");
    }

    /// @dev Soulbound: only mints (previous owner == 0) pass; transfers and burns revert
    function _update(address to, uint256 id, address auth) internal override returns (address) {
        require(_ownerOf(id) == address(0), "soulbound: non-transferable");
        return super._update(to, id, auth);
    }
}
