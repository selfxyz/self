// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {SelfVerificationConsumer} from "../abstract/SelfVerificationConsumer.sol";
import {ISelfVerificationRoot} from "../interfaces/ISelfVerificationRoot.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SelfCircuitLibrary} from "../libraries/SelfCircuitLibrary.sol";

/**
 * @title SelfPassportERC721
 * @notice This contract issues ERC721 tokens based on verified passport credentials using self's verification infrastructure
 * @dev Inherits from SelfVerificationConsumer for verification logic and ERC721 for NFT functionality
 */
contract SelfPassportERC721 is SelfVerificationConsumer, ERC721, Ownable {
    using SelfCircuitLibrary for uint256[3];

    // ====================================================
    // Storage Variables
    // ====================================================

    /// @notice Counter for token IDs
    uint256 private _tokenIdCounter;

    /// @notice Mapping from token ID to passport attributes
    mapping(uint256 => SelfCircuitLibrary.PassportData) private _passportAttributes;

    // ====================================================
    // Events
    // ====================================================

    event PassportNFTMinted(uint256 indexed tokenId, address indexed owner, SelfCircuitLibrary.PassportData attributes);

    // ====================================================
    // Errors
    // ====================================================

    error InvalidUserIdentifier();
    error TokenDoesNotExist(uint256 tokenId);

    // ====================================================
    // Constructor
    // ====================================================

    /**
     * @notice Constructor for the SelfPassportERC721 contract
     * @param _identityVerificationHub The address of the Identity Verification Hub
     * @param _scope The expected proof scope for user registration
     * @param _attestationIds The expected attestation identifiers required in proofs
     * @param _name The name of the NFT collection
     * @param _symbol The symbol of the NFT collection
     */
    constructor(
        address _identityVerificationHub,
        uint256 _scope,
        uint256[] memory _attestationIds,
        string memory _name,
        string memory _symbol
    )
        SelfVerificationConsumer(_identityVerificationHub, _scope, _attestationIds)
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
     * @param _verificationConfig The new verification configuration
     */
    function setVerificationConfig(
        ISelfVerificationRoot.VerificationConfig memory _verificationConfig
    ) external onlyOwner {
        _setVerificationConfig(_verificationConfig);
    }

    /**
     * @notice Get passport attributes for a specific token ID
     * @param _tokenId The token ID to query
     * @return The passport attributes associated with the token
     */
    function getPassportAttributes(uint256 _tokenId) external view returns (SelfCircuitLibrary.PassportData memory) {
        if (!_exists(_tokenId)) {
            revert TokenDoesNotExist(_tokenId);
        }
        return _passportAttributes[_tokenId];
    }

    /**
     * @notice Check if a nullifier has been used
     * @param _nullifier The nullifier to check
     * @return True if the nullifier has been used, false otherwise
     */
    function isNullifierUsed(uint256 _nullifier) external view returns (bool) {
        return _nullifiers[_nullifier];
    }

    /**
     * @notice Check if the specified attestation ID is allowed
     * @param _attestationId The attestation ID to check
     * @return True if the attestation ID is allowed, false otherwise
     */
    function isAttestationIdAllowed(uint256 _attestationId) external view returns (bool) {
        return _attestationIds[_attestationId];
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
    // Override Functions from SelfVerificationConsumer
    // ====================================================

    /**
     * @notice Validates if a nullifier can be used and checks for valid user identifier
     * @param _nullifier The nullifier to validate
     * @param _proof The complete proof data
     * @return valid True if the nullifier is valid to use, false otherwise
     */
    function validateNullifier(
        uint256 _nullifier,
        ISelfVerificationRoot.DiscloseCircuitProof memory _proof
    ) internal override returns (bool) {
        // Check user identifier is valid
        if (_proof.pubSignals[USER_IDENTIFIER_INDEX] == 0) {
            revert InvalidUserIdentifier();
        }

        // Default validation from parent (checks if nullifier is unused)
        return super.validateNullifier(_nullifier, _proof);
    }

    /**
     * @notice Hook called after successful verification - mints NFT with passport attributes
     * @param _revealedDataPacked The packed revealed data from the proof
     * @param _userIdentifier The user identifier from the proof
     */
    function onVerificationSuccess(uint256[3] memory _revealedDataPacked, uint256 _userIdentifier) internal override {
        // Extract passport data using SelfCircuitLibrary
        SelfCircuitLibrary.PassportData memory _attributes = SelfCircuitLibrary.extractPassportData(
            _revealedDataPacked
        );

        // Mint NFT
        uint256 _tokenId = _tokenIdCounter++;
        _mint(msg.sender, _tokenId);
        _passportAttributes[_tokenId] = _attributes;

        emit PassportNFTMinted(_tokenId, msg.sender, _attributes);
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
