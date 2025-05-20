// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {SelfVerificationRoot} from "../abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "../interfaces/ISelfVerificationRoot.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SelfCircuitLibrary} from "../libraries/SelfCircuitLibrary.sol";

/**
 * @title SelfPassportERC721
 * @notice This contract issues ERC721 tokens based on verified passport credentials using self's verification infrastructure
 * @dev Inherits from SelfVerificationRoot for verification logic and ERC721 for NFT functionality
 */
contract SelfPassportERC721 is SelfVerificationRoot, ERC721, Ownable {
    using SelfCircuitLibrary for uint256[3];

    // ====================================================
    // Storage Variables
    // ====================================================

    /// @notice Counter for token IDs
    uint256 private _tokenIdCounter;

    /// @notice Mapping from token ID to passport attributes
    mapping(uint256 => SelfCircuitLibrary.PassportData) private _passportAttributes;

    /// @notice Mapping to track used nullifiers
    mapping(uint256 => bool) private _usedNullifiers;

    // ====================================================
    // Events
    // ====================================================

    event PassportNFTMinted(uint256 indexed tokenId, address indexed owner, SelfCircuitLibrary.PassportData attributes);

    /// @notice Emitted when the scope is updated
    event ScopeUpdated(uint256 newScope);

    /// @notice Emitted when a new attestation ID is added
    event AttestationIdAdded(uint256 attestationId);

    /// @notice Emitted when an attestation ID is removed
    event AttestationIdRemoved(uint256 attestationId);

    // ====================================================
    // Errors
    // ====================================================

    error NullifierAlreadyUsed();
    error RegistrationNotOpen();
    error InvalidUserIdentifier();

    // ====================================================
    // Constructor
    // ====================================================

    /**
     * @notice Constructor for the SelfPassportERC721 contract
     * @param identityVerificationHub The address of the Identity Verification Hub
     * @param scope The expected proof scope for user registration
     * @param attestationIds The expected attestation identifiers required in proofs
     * @param name The name of the NFT collection
     * @param symbol The symbol of the NFT collection
     */
    constructor(
        address identityVerificationHub,
        uint256 scope,
        uint256[] memory attestationIds,
        string memory name,
        string memory symbol
    ) SelfVerificationRoot(identityVerificationHub, scope, attestationIds) ERC721(name, symbol) Ownable(_msgSender()) {}

    // ====================================================
    // External/Public Functions
    // ====================================================

    /**
     * @notice Updates the scope used for verification
     * @dev Only callable by the contract owner
     * @param newScope The new scope to set
     */
    function setScope(uint256 newScope) external onlyOwner {
        _setScope(newScope);
        emit ScopeUpdated(newScope);
    }

    /**
     * @notice Adds a new attestation ID to the allowed list
     * @dev Only callable by the contract owner
     * @param attestationId The attestation ID to add
     */
    function addAttestationId(uint256 attestationId) external onlyOwner {
        _addAttestationId(attestationId);
        emit AttestationIdAdded(attestationId);
    }

    /**
     * @notice Removes an attestation ID from the allowed list
     * @dev Only callable by the contract owner
     * @param attestationId The attestation ID to remove
     */
    function removeAttestationId(uint256 attestationId) external onlyOwner {
        _removeAttestationId(attestationId);
        emit AttestationIdRemoved(attestationId);
    }

    /**
     * @notice Updates the verification configuration
     * @dev Only callable by the contract owner
     * @param verificationConfig The new verification configuration
     */
    function setVerificationConfig(
        ISelfVerificationRoot.VerificationConfig memory verificationConfig
    ) external onlyOwner {
        _setVerificationConfig(verificationConfig);
    }

    /**
     * @notice Verifies a self-proof and mints an NFT with passport attributes
     * @param proof The VC and Disclose proof data used to verify and register the user
     */
    function verifySelfProof(ISelfVerificationRoot.DiscloseCircuitProof memory proof) public override {
        if (_usedNullifiers[proof.pubSignals[NULLIFIER_INDEX]]) {
            revert NullifierAlreadyUsed();
        }

        if (proof.pubSignals[USER_IDENTIFIER_INDEX] == 0) {
            revert InvalidUserIdentifier();
        }

        // Verify the proof using the parent contract's logic
        super.verifySelfProof(proof);

        // Extract passport attributes from the revealed data using the utility function
        uint256[3] memory revealedDataPacked = getRevealedDataPacked(proof.pubSignals);

        // Extract passport data using SelfCircuitLibrary
        SelfCircuitLibrary.PassportData memory attributes = SelfCircuitLibrary.extractPassportData(revealedDataPacked);

        // Mint NFT
        uint256 tokenId = _tokenIdCounter++;
        _mint(msg.sender, tokenId);
        _passportAttributes[tokenId] = attributes;
        _usedNullifiers[proof.pubSignals[NULLIFIER_INDEX]] = true;

        emit PassportNFTMinted(tokenId, msg.sender, attributes);
    }

    /**
     * @notice Get passport attributes for a specific token ID
     * @param tokenId The token ID to query
     * @return The passport attributes associated with the token
     */
    function getPassportAttributes(uint256 tokenId) external view returns (SelfCircuitLibrary.PassportData memory) {
        require(_exists(tokenId), "Token does not exist");
        return _passportAttributes[tokenId];
    }

    /**
     * @notice Check if a nullifier has been used
     * @param nullifier The nullifier to check
     * @return True if the nullifier has been used, false otherwise
     */
    function isNullifierUsed(uint256 nullifier) external view returns (bool) {
        return _usedNullifiers[nullifier];
    }

    /**
     * @notice Check if the specified attestation ID is allowed
     * @param attestationId The attestation ID to check
     * @return True if the attestation ID is allowed, false otherwise
     */
    function isAttestationIdAllowed(uint256 attestationId) external view returns (bool) {
        return _attestationIds[attestationId];
    }

    /**
     * @notice Get the current scope value
     * @return The current scope value
     */
    function getScope() external view returns (uint256) {
        return _scope;
    }

    /**
     * @notice Get the current verification configuration
     * @return The current verification configuration
     */
    function getVerificationConfig() external view returns (ISelfVerificationRoot.VerificationConfig memory) {
        return _getVerificationConfig();
    }

    // ====================================================
    // Internal Functions
    // ====================================================

    /**
     * @notice Check if a token exists
     * @param tokenId The token ID to check
     * @return True if the token exists, false otherwise
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}
