 // // SPDX-License-Identifier: MIT
// pragma solidity 0.8.28;

// import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
// import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// import {ISelfVerificationRoot} from "../interfaces/ISelfVerificationRoot.sol";

// import {SelfCircuitLibrary} from "../libraries/SelfCircuitLibrary.sol";
// import {SelfVerificationRoot} from "../abstract/SelfVerificationRoot.sol";

// /**
//  * @title SelfPassportERC721
//  * @notice This contract issues ERC721 tokens based on verified passport credentials using self's verification infrastructure
//  * @dev Inherits from SelfVerificationRoot for verification logic and ERC721 for NFT functionality
//  */
// contract SelfPassportERC721 is SelfVerificationRoot, ERC721, Ownable {
//     using SelfCircuitLibrary for uint256[3];

//     // ====================================================
//     // Storage Variables
//     // ====================================================

//     /// @notice Counter for token IDs
//     uint256 private _tokenIdCounter;

//     /// @notice Mapping from token ID to passport attributes
//     mapping(uint256 tokenId => SelfCircuitLibrary.PassportData passportAttributes) private _passportAttributes;

//     /// @notice Mapping to track minted user identifiers to prevent double minting
//     mapping(uint256 userIdentifier => bool minted) private _mintedUserIdentifiers;

//     // ====================================================
//     // Events
//     // ====================================================

//     event PassportNFTMinted(uint256 indexed tokenId, address indexed owner, SelfCircuitLibrary.PassportData attributes);

//     // ====================================================
//     // Errors
//     // ====================================================

//     error UserIdentifierAlreadyMinted();
//     error InvalidUserIdentifier();

//     // ====================================================
//     // Constructor
//     // ====================================================

//     /**
//      * @notice Constructor for the SelfPassportERC721 contract
//      * @param identityVerificationHubAddress The address of the Identity Verification Hub
//      * @param scopeValue The expected proof scope for user registration
//      * @param contractVersion The contract version for validation
//      * @param attestationIdsList The expected attestation identifiers required in proofs
//      * @param name The name of the NFT collection
//      * @param symbol The symbol of the NFT collection
//      */
//     constructor(
//         address identityVerificationHubAddress,
//         uint256 scopeValue,
//         uint8 contractVersion,
//         bytes32[] memory attestationIdsList,
//         string memory name,
//         string memory symbol
//     )
//         SelfVerificationRoot(identityVerificationHubAddress, scopeValue, contractVersion, attestationIdsList)
//         ERC721(name, symbol)
//         Ownable(_msgSender())
//     {}

//     // ====================================================
//     // External/Public Functions
//     // ====================================================

//     /**
//      * @notice Updates the scope used for verification
//      * @dev Only callable by the contract owner
//      * @param newScope The new scope to set
//      */
//     function setScope(uint256 newScope) external onlyOwner {
//         _setScope(newScope);
//     }

//     /**
//      * @notice Adds a new attestation ID to the allowed list
//      * @dev Only callable by the contract owner
//      * @param attestationId The attestation ID to add
//      */
//     function addAttestationId(bytes32 attestationId) external onlyOwner {
//         _addAttestationId(attestationId);
//     }

//     /**
//      * @notice Removes an attestation ID from the allowed list
//      * @dev Only callable by the contract owner
//      * @param attestationId The attestation ID to remove
//      */
//     function removeAttestationId(bytes32 attestationId) external onlyOwner {
//         _removeAttestationId(attestationId);
//     }

//     /**
//      * @notice Updates the verification configuration
//      * @dev Only callable by the contract owner
//      * @param newVerificationConfig The new verification configuration
//      */
//     function setVerificationConfig(
//         ISelfVerificationRoot.VerificationConfig memory newVerificationConfig
//     ) external onlyOwner {
//         _setVerificationConfig(newVerificationConfig);
//     }

//     /**
//      * @notice Get passport attributes for a specific token ID
//      * @param tokenId The token ID to query
//      * @return The passport attributes associated with the token
//      */
//     function getPassportAttributes(uint256 tokenId) external view returns (SelfCircuitLibrary.PassportData memory) {
//         require(_exists(tokenId), "Token does not exist");
//         return _passportAttributes[tokenId];
//     }

//     /**
//      * @notice Check if a user identifier has already minted an NFT
//      * @param userIdentifier The user identifier to check
//      * @return True if the user identifier has already minted, false otherwise
//      */
//     function isUserIdentifierMinted(uint256 userIdentifier) external view returns (bool) {
//         return _mintedUserIdentifiers[userIdentifier];
//     }

//     /**
//      * @notice Check if the specified attestation ID is allowed
//      * @param attestationId The attestation ID to check
//      * @return True if the attestation ID is allowed, false otherwise
//      */
//     function isAttestationIdAllowed(bytes32 attestationId) external view returns (bool) {
//         return _attestationIdToEnabled[attestationId];
//     }

//     /**
//      * @notice Get the current scope value
//      * @return The current scope value
//      */
//     function getScope() external view returns (uint256) {
//         return _scope;
//     }

//     /**
//      * @notice Get the current verification configuration
//      * @return The current verification configuration
//      */
//     function getVerificationConfig() external view returns (ISelfVerificationRoot.VerificationConfig memory) {
//         return _getVerificationConfig();
//     }

//     // ====================================================
//     // Override Functions from SelfVerificationRoot
//     // ====================================================

//     /**
//      * @notice Hook called after successful verification - handles NFT minting
//      * @dev Validates user identifier and mints passport NFT with extracted attributes
//      * @param userIdentifier The user identifier from the proof
//      * @param revealedDataPacked The packed revealed data from the proof
//      */
//     function onBasicVerificationSuccess(
//         bytes32 /* attestationId */,
//         uint256 /* scope */,
//         uint256 userIdentifier,
//         uint256 /* nullifier */,
//         uint256 /* identityCommitmentRoot */,
//         uint256[] memory revealedDataPacked,
//         uint256[4] memory /* forbiddenCountriesListPacked */
//     ) internal override {
//         // Check if user identifier is valid
//         if (userIdentifier == 0) {
//             revert InvalidUserIdentifier();
//         }

//         // Check if user identifier has already minted an NFT
//         if (_mintedUserIdentifiers[userIdentifier]) {
//             revert UserIdentifierAlreadyMinted();
//         }

//         // Convert dynamic array to fixed-size array for passport data (first 3 elements)
//         uint256[3] memory passportRevealedData;
//         for (uint256 i = 0; i < 3 && i < revealedDataPacked.length; i++) {
//             passportRevealedData[i] = revealedDataPacked[i];
//         }

//         // Extract passport data using SelfCircuitLibrary
//         SelfCircuitLibrary.PassportData memory attributes = SelfCircuitLibrary.extractPassportData(
//             passportRevealedData
//         );

//         // Mint NFT
//         uint256 tokenId = _tokenIdCounter++;
//         _mint(msg.sender, tokenId);
//         _passportAttributes[tokenId] = attributes;
//         _mintedUserIdentifiers[userIdentifier] = true;

//         emit PassportNFTMinted(tokenId, msg.sender, attributes);
//     }

//     // ====================================================
//     // Internal Functions
//     // ====================================================

//     /**
//      * @notice Check if a token exists
//      * @param tokenId The token ID to check
//      * @return True if the token exists, false otherwise
//      */
//     function _exists(uint256 tokenId) internal view returns (bool) {
//         return _ownerOf(tokenId) != address(0);
//     }
// }
