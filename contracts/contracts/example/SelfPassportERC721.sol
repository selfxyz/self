// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {ISelfVerificationRoot} from "../interfaces/ISelfVerificationRoot.sol";

import {SelfCircuitLibrary} from "../libraries/SelfCircuitLibrary.sol";
import {SelfVerificationRoot} from "../abstract/SelfVerificationRoot.sol";

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
    mapping(uint256 tokenId => SelfCircuitLibrary.PassportData passportAttributes) private _passportAttributes;

    /// @notice Mapping to track minted user identifiers to prevent double minting
    mapping(uint256 userIdentifier => bool minted) private _mintedUserIdentifiers;

    // ====================================================
    // Events
    // ====================================================

    event PassportNFTMinted(uint256 indexed tokenId, address indexed owner, SelfCircuitLibrary.PassportData attributes);

    // ====================================================
    // Errors
    // ====================================================

    error UserIdentifierAlreadyMinted();
    error InvalidUserIdentifier();

    // ====================================================
    // Constructor
    // ====================================================

    /**
     * @notice Constructor for the SelfPassportERC721 contract
     * @param _identityVerificationHubAddress The address of the Identity Verification Hub
     * @param _scopeValue The expected proof scope for user registration
     * @param _attestationIdsList The expected attestation identifiers required in proofs
     * @param _name The name of the NFT collection
     * @param _symbol The symbol of the NFT collection
     */
    constructor(
        address _identityVerificationHubAddress,
        uint256 _scopeValue,
        uint256[] memory _attestationIdsList,
        string memory _name,
        string memory _symbol
    )
        SelfVerificationRoot(_identityVerificationHubAddress, _scopeValue, _attestationIdsList)
        ERC721(_name, _symbol)
        Ownable(_msgSender())
    {}

    // ====================================================
    // External/Public Functions
    // ====================================================

    /**
     * @notice Updates the scope used for verification
     * @dev Only callable by the contract owner
     * @param _newScope The new scope to set
     */
    function setScope(uint256 _newScope) external onlyOwner {
        _setScope(_newScope);
    }

    /**
     * @notice Adds a new attestation ID to the allowed list
     * @dev Only callable by the contract owner
     * @param _attestationId The attestation ID to add
     */
    function addAttestationId(uint256 _attestationId) external onlyOwner {
        _addAttestationId(_attestationId);
    }

    /**
     * @notice Removes an attestation ID from the allowed list
     * @dev Only callable by the contract owner
     * @param _attestationId The attestation ID to remove
     */
    function removeAttestationId(uint256 _attestationId) external onlyOwner {
        _removeAttestationId(_attestationId);
    }

    /**
     * @notice Updates the verification configuration
     * @dev Only callable by the contract owner
     * @param _newVerificationConfig The new verification configuration
     */
    function setVerificationConfig(
        ISelfVerificationRoot.VerificationConfig memory _newVerificationConfig
    ) external onlyOwner {
        _setVerificationConfig(_newVerificationConfig);
    }

    /**
     * @notice Get passport attributes for a specific token ID
     * @param _tokenId The token ID to query
     * @return The passport attributes associated with the token
     */
    function getPassportAttributes(uint256 _tokenId) external view returns (SelfCircuitLibrary.PassportData memory) {
        require(_exists(_tokenId), "Token does not exist");
        return _passportAttributes[_tokenId];
    }

    /**
     * @notice Check if a user identifier has already minted an NFT
     * @param _userIdentifier The user identifier to check
     * @return True if the user identifier has already minted, false otherwise
     */
    function isUserIdentifierMinted(uint256 _userIdentifier) external view returns (bool) {
        return _mintedUserIdentifiers[_userIdentifier];
    }

    /**
     * @notice Check if the specified attestation ID is allowed
     * @param _attestationId The attestation ID to check
     * @return True if the attestation ID is allowed, false otherwise
     */
    function isAttestationIdAllowed(uint256 _attestationId) external view returns (bool) {
        return _attestationIdToEnabled[_attestationId];
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
    // Override Functions from SelfVerificationRoot
    // ====================================================

    /**
     * @notice Hook called after successful verification - handles NFT minting
     * @dev Validates user identifier and mints passport NFT with extracted attributes
     * @param _revealedDataPacked The packed revealed data from the proof
     * @param _userIdentifier The user identifier from the proof
     * @param _nullifier The nullifier from the proof (unused in this implementation)
     */
    function onBasicVerificationSuccess(
        uint256[3] memory _revealedDataPacked,
        uint256 _userIdentifier,
        uint256 _nullifier
    ) internal override {
        // Check if user identifier is valid
        if (_userIdentifier == 0) {
            revert InvalidUserIdentifier();
        }

        // Check if user identifier has already minted an NFT
        if (_mintedUserIdentifiers[_userIdentifier]) {
            revert UserIdentifierAlreadyMinted();
        }

        // Extract passport data using SelfCircuitLibrary
        SelfCircuitLibrary.PassportData memory attributes = SelfCircuitLibrary.extractPassportData(_revealedDataPacked);

        // Mint NFT
        uint256 tokenId = _tokenIdCounter++;
        _mint(msg.sender, tokenId);
        _passportAttributes[tokenId] = attributes;
        _mintedUserIdentifiers[_userIdentifier] = true;

        emit PassportNFTMinted(tokenId, msg.sender, attributes);
    }

    // ====================================================
    // Internal Functions
    // ====================================================

    /**
     * @notice Check if a token exists
     * @param _tokenId The token ID to check
     * @return True if the token exists, false otherwise
     */
    function _exists(uint256 _tokenId) internal view returns (bool) {
        return _ownerOf(_tokenId) != address(0);
    }
}
