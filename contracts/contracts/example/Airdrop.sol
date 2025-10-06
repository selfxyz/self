// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {ISelfVerificationRoot} from "../interfaces/ISelfVerificationRoot.sol";
import {CircuitAttributeHandlerV2} from "../libraries/CircuitAttributeHandlerV2.sol";

import {SelfVerificationRoot} from "../abstract/SelfVerificationRoot.sol";

/**
 * @title Airdrop V2 (Experimental)
 * @notice This contract manages an airdrop campaign by verifying user registrations with zero‐knowledge proofs
 *         supporting both E-Passport and EU ID Card attestations, and distributing ERC20 tokens.
 *         It is provided for testing and demonstration purposes only.
 *         **WARNING:** This contract has not been audited and is NOT intended for production use.
 * @dev Inherits from SelfVerificationRoot V2 for registration logic and Ownable for administrative control.
 */
contract Airdrop is SelfVerificationRoot, Ownable {
    using SafeERC20 for IERC20;

    // ====================================================
    // Storage Variables
    // ====================================================

    /// @notice ERC20 token to be airdropped.
    IERC20 public immutable token;

    /// @notice Merkle root used to validate airdrop claims.
    bytes32 public merkleRoot;

    /// @notice Tracks addresses that have claimed tokens.
    mapping(address => bool) public claimed;

    /// @notice Indicates whether the registration phase is active.
    bool public isRegistrationOpen;

    /// @notice Indicates whether the claim phase is active.
    bool public isClaimOpen;

    /// @notice Maps nullifiers to user identifiers for registration tracking
    mapping(uint256 nullifier => uint256 userIdentifier) internal _nullifierToUserIdentifier;

    /// @notice Maps user identifiers to registration status
    mapping(uint256 userIdentifier => bool registered) internal _registeredUserIdentifiers;

    /// @notice Verification config ID for identity verification
    bytes32 public verificationConfigId;

    // ====================================================
    // Errors
    // ====================================================

    /// @notice Reverts when an invalid Merkle proof is provided.
    error InvalidProof();

    /// @notice Reverts when a user attempts to claim tokens more than once.
    error AlreadyClaimed();

    /// @notice Reverts when an unregistered address attempts to claim tokens.
    error NotRegistered(address nonRegisteredAddress);

    /// @notice Reverts when registration is attempted while the registration phase is closed.
    error RegistrationNotOpen();

    /// @notice Reverts when a claim attempt is made while registration is still open.
    error RegistrationNotClosed();

    /// @notice Reverts when a claim is attempted while claiming is not enabled.
    error ClaimNotOpen();

    /// @notice Reverts when an invalid user identifier is provided.
    error InvalidUserIdentifier();

    /// @notice Reverts when a user identifier has already been registered
    error UserIdentifierAlreadyRegistered();

    /// @notice Reverts when a nullifier has already been registered
    error RegisteredNullifier();

    // ====================================================
    // Events
    // ====================================================

    /// @notice Emitted when a user successfully claims tokens.
    /// @param index The index of the claim in the Merkle tree.
    /// @param account The address that claimed tokens.
    /// @param amount The amount of tokens claimed.
    event Claimed(uint256 index, address account, uint256 amount);

    /// @notice Emitted when the registration phase is opened.
    event RegistrationOpen();

    /// @notice Emitted when the registration phase is closed.
    event RegistrationClose();

    /// @notice Emitted when the claim phase is opened.
    event ClaimOpen();

    /// @notice Emitted when the claim phase is closed.
    event ClaimClose();

    /// @notice Emitted when a user identifier is registered.
    event UserIdentifierRegistered(uint256 indexed registeredUserIdentifier, uint256 indexed nullifier);

    /// @notice Emitted when the Merkle root is updated.
    event MerkleRootUpdated(bytes32 newMerkleRoot);

    // ====================================================
    // Constructor
    // ====================================================

    /**
     * @notice Constructor for the experimental Airdrop V2 contract.
     * @dev Initializes the airdrop parameters, zero-knowledge verification configuration,
     *      and sets the ERC20 token to be distributed. Supports both E-Passport and EUID attestations.
     * @param identityVerificationHubAddress The address of the Identity Verification Hub V2.
     * @param scopeSeed The scope seed string to be hashed with contract address.
     * @param tokenAddress The address of the ERC20 token for airdrop.
     */
    constructor(
        address identityVerificationHubAddress,
        string memory scopeSeed,
        address tokenAddress
    ) SelfVerificationRoot(identityVerificationHubAddress, scopeSeed) Ownable(_msgSender()) {
        token = IERC20(tokenAddress);
    }

    // ====================================================
    // External/Public Functions
    // ====================================================

    /**
     * @notice Sets the Merkle root for claim validation.
     * @dev Only callable by the contract owner.
     * @param newMerkleRoot The new Merkle root.
     */
    function setMerkleRoot(bytes32 newMerkleRoot) external onlyOwner {
        merkleRoot = newMerkleRoot;
        emit MerkleRootUpdated(newMerkleRoot);
    }

    /**
     * @notice Opens the registration phase for users.
     * @dev Only callable by the contract owner.
     */
    function openRegistration() external onlyOwner {
        isRegistrationOpen = true;
        emit RegistrationOpen();
    }

    /**
     * @notice Closes the registration phase.
     * @dev Only callable by the contract owner.
     */
    function closeRegistration() external onlyOwner {
        isRegistrationOpen = false;
        emit RegistrationClose();
    }

    /**
     * @notice Opens the claim phase, allowing registered users to claim tokens.
     * @dev Only callable by the contract owner.
     */
    function openClaim() external onlyOwner {
        isClaimOpen = true;
        emit ClaimOpen();
    }

    /**
     * @notice Closes the claim phase.
     * @dev Only callable by the contract owner.
     */
    function closeClaim() external onlyOwner {
        isClaimOpen = false;
        emit ClaimClose();
    }

    /**
     * @notice Retrieves the expected proof scope.
     * @return The scope value used for registration verification.
     */
    function getScope() external view returns (uint256) {
        return _scope;
    }

    /**
     * @notice Sets the verification config ID
     * @dev Only callable by the contract owner
     * @param configId The verification config ID to set
     */
    function setConfigId(bytes32 configId) external onlyOwner {
        verificationConfigId = configId;
    }

    /**
     * @notice Generates a configId for the user
     * @dev Override of the SelfVerificationRoot virtual function
     * @param destinationChainId The destination chain ID
     * @param userIdentifier The user identifier
     * @param userDefinedData The user defined data
     * @return The stored verification config ID
     */
    function getConfigId(
        bytes32 destinationChainId,
        bytes32 userIdentifier,
        bytes memory userDefinedData
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    /**
     * @notice Checks if a given address is registered.
     * @param registeredAddress The address to check.
     * @return True if the address is registered, false otherwise.
     */
    function isRegistered(address registeredAddress) external view returns (bool) {
        return _registeredUserIdentifiers[uint256(uint160(registeredAddress))];
    }

    /**
     * @notice Allows a registered user to claim their tokens.
     * @dev Reverts if registration is still open, if claiming is disabled, if already claimed,
     *      or if the sender is not registered. Also validates the claim using a Merkle proof.
     * @param index The index of the claim in the Merkle tree.
     * @param amount The amount of tokens to be claimed.
     * @param merkleProof The Merkle proof verifying the claim.
     */
    function claim(uint256 index, uint256 amount, bytes32[] memory merkleProof) external {
        if (isRegistrationOpen) {
            revert RegistrationNotClosed();
        }
        if (!isClaimOpen) {
            revert ClaimNotOpen();
        }
        if (claimed[msg.sender]) {
            revert AlreadyClaimed();
        }
        if (!_registeredUserIdentifiers[uint256(uint160(msg.sender))]) {
            revert NotRegistered(msg.sender);
        }

        // Verify the Merkle proof.
        bytes32 node = keccak256(abi.encodePacked(index, msg.sender, amount));
        if (!MerkleProof.verify(merkleProof, merkleRoot, node)) revert InvalidProof();

        // Mark as claimed and transfer tokens.
        _setClaimed();
        token.safeTransfer(msg.sender, amount);

        emit Claimed(index, msg.sender, amount);
    }

    // ====================================================
    // Override Functions from SelfVerificationRoot
    // ====================================================

    /**
     * @notice Hook called after successful verification - handles user registration
     * @dev Validates registration conditions and registers the user for both E-Passport and EUID attestations
     * @param output The verification output containing user data
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory /* userData */
    ) internal override {
        // Check if registration is open
        if (!isRegistrationOpen) {
            revert RegistrationNotOpen();
        }

        // Check if nullifier has already been registered
        if (_nullifierToUserIdentifier[output.nullifier] != 0) {
            revert RegisteredNullifier();
        }

        // Check if user identifier is valid
        if (output.userIdentifier == 0) {
            revert InvalidUserIdentifier();
        }

        // Check if user identifier has already been registered
        if (_registeredUserIdentifiers[output.userIdentifier]) {
            revert UserIdentifierAlreadyRegistered();
        }

        _nullifierToUserIdentifier[output.nullifier] = output.userIdentifier;
        _registeredUserIdentifiers[output.userIdentifier] = true;

        // Emit registration event
        emit UserIdentifierRegistered(output.userIdentifier, output.nullifier);
    }

    // ====================================================
    // Internal Functions
    // ====================================================

    /**
     * @notice Internal function to mark the caller as having claimed their tokens.
     * @dev Updates the claimed mapping.
     */
    function _setClaimed() internal {
        claimed[msg.sender] = true;
    }
}
