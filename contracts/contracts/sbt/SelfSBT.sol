// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

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

    /// @dev Static config; userDefinedData carries off-chain correlation JSON, not routing data — ignore it
    function getConfigId(bytes32, bytes32, bytes memory) public view override returns (bytes32) {
        return verificationConfigId;
    }

    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory /* userData */
    ) internal override {
        require(!usedNullifier[output.nullifier], "already minted");
        address to = address(uint160(output.userIdentifier));
        require(to != address(0), "bad recipient");
        require(balanceOf(to) == 0, "already holds SBT");
        usedNullifier[output.nullifier] = true;
        _mint(to, ++_nextId);
    }

    /// @dev Soulbound: only mints (previous owner == 0) pass; transfers and burns revert
    function _update(address to, uint256 id, address auth) internal override returns (address) {
        require(_ownerOf(id) == address(0), "soulbound: non-transferable");
        return super._update(to, id, auth);
    }
}
