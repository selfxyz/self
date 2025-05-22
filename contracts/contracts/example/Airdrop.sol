// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {ISelfVerificationRoot} from "../interfaces/ISelfVerificationRoot.sol";

import {SelfVerificationConsumer} from "../abstract/SelfVerificationConsumer.sol";

/**
 * @title Airdrop (Experimental)
 * @notice This contract manages an airdrop campaign by verifying user registrations with zero‐knowledge proofs
 *         and distributing ERC20 tokens. It is provided for testing and demonstration purposes only.
 *         **WARNING:** This contract has not been audited and is NOT intended for production use.
 * @dev Inherits from SelfVerificationConsumer for registration logic and Ownable for administrative control.
 */
contract Airdrop is SelfVerificationConsumer, Ownable {
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

    /// @notice Maps nullifiers to user identifiers (extends the base _nullifiers mapping)
    mapping(uint256 nullifier => uint256 userIdentifier) internal _userIdentifiers;

    /// @notice Maps user identifiers to registration status
    mapping(uint256 userIdentifier => bool registered) internal _registeredUserIdentifiers;

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
    /// @notice Reverts when a nullifier has already been used
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
     * @notice Constructor for the experimental Airdrop contract.
     * @dev Initializes the airdrop parameters, zero-knowledge verification configuration,
     *      and sets the ERC20 token to be distributed.
     * @param _identityVerificationHub The address of the Identity Verification Hub.
     * @param _scope The expected proof scope for user registration.
     * @param _attestationIds The expected attestation identifiers required in proofs.
     * @param _token The address of the ERC20 token for airdrop.
     */
    constructor(
        address _identityVerificationHub,
        uint256 _scope,
        uint256[] memory _attestationIds,
        address _token
    ) SelfVerificationConsumer(_identityVerificationHub, _scope, _attestationIds) Ownable(_msgSender()) {
        token = IERC20(_token);
    }

    // ====================================================
    // External/Public Functions
    // ====================================================

    /**
     * @notice Sets the Merkle root for claim validation.
     * @dev Only callable by the contract owner.
     * @param _merkleRoot The new Merkle root.
     */
    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
        emit MerkleRootUpdated(_merkleRoot);
    }

    /**
     * @notice Updates the verification configuration for address registration.
     * @dev Only callable by the contract owner.
     * @param _newVerificationConfig The new verification configuration.
     */
    function setVerificationConfig(
        ISelfVerificationRoot.VerificationConfig memory _newVerificationConfig
    ) external onlyOwner {
        _setVerificationConfig(_newVerificationConfig);
    }

    /**
     * @notice Updates the scope used for verification.
     * @dev Only callable by the contract owner.
     * @param _newScope The new scope to set.
     */
    function setScope(uint256 _newScope) external onlyOwner {
        _setScope(_newScope);
        emit ScopeUpdated(_newScope);
    }

    /**
     * @notice Adds a new attestation ID to the allowed list.
     * @dev Only callable by the contract owner.
     * @param _attestationId The attestation ID to add.
     */
    function addAttestationId(uint256 _attestationId) external onlyOwner {
        _addAttestationId(_attestationId);
        emit AttestationIdAdded(_attestationId);
    }

    /**
     * @notice Removes an attestation ID from the allowed list.
     * @dev Only callable by the contract owner.
     * @param _attestationId The attestation ID to remove.
     */
    function removeAttestationId(uint256 _attestationId) external onlyOwner {
        _removeAttestationId(_attestationId);
        emit AttestationIdRemoved(_attestationId);
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
     * @notice Checks if the specified attestation ID is allowed.
     * @param _attestationId The attestation ID to check.
     * @return True if the attestation ID is allowed, false otherwise.
     */
    function isAttestationIdAllowed(uint256 _attestationId) external view returns (bool) {
        return _attestationIds[_attestationId];
    }

    /**
     * @notice Retrieves the stored user identifier for a given nullifier.
     * @param _nullifier The nullifier to query.
     * @return The user identifier associated with the nullifier.
     */
    function getNullifier(uint256 _nullifier) external view returns (uint256) {
        return _userIdentifiers[_nullifier];
    }

    /**
     * @notice Retrieves the current verification configuration.
     * @return The verification configuration used for registration.
     */
    function getVerificationConfig() external view returns (ISelfVerificationRoot.VerificationConfig memory) {
        return _getVerificationConfig();
    }

    /**
     * @notice Checks if a given address is registered.
     * @param _registeredAddress The address to check.
     * @return True if the address is registered, false otherwise.
     */
    function isRegistered(address _registeredAddress) external view returns (bool) {
        return _registeredUserIdentifiers[uint256(uint160(_registeredAddress))];
    }

    /**
     * @notice Allows a registered user to claim their tokens.
     * @dev Reverts if registration is still open, if claiming is disabled, if already claimed,
     *      or if the sender is not registered. Also validates the claim using a Merkle proof.
     * @param _index The index of the claim in the Merkle tree.
     * @param _amount The amount of tokens to be claimed.
     * @param _merkleProof The Merkle proof verifying the claim.
     */
    function claim(uint256 _index, uint256 _amount, bytes32[] memory _merkleProof) external {
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
        bytes32 node = keccak256(abi.encodePacked(_index, msg.sender, _amount));
        if (!MerkleProof.verify(_merkleProof, merkleRoot, node)) revert InvalidProof();

        // Mark as claimed and transfer tokens.
        _setClaimed();
        token.safeTransfer(msg.sender, _amount);

        emit Claimed(_index, msg.sender, _amount);
    }

    // ====================================================
    // Override Functions from SelfVerificationConsumer
    // ====================================================

    /**
     * @notice Validates if a nullifier can be used
     * @dev Overrides the base implementation to check registration phase and previous use
     * @param _nullifier The nullifier to validate
     * @param _proof The complete proof data
     * @return valid True if the nullifier is valid to use, false otherwise
     */
    function validateNullifier(
        uint256 _nullifier,
        ISelfVerificationRoot.DiscloseCircuitProof memory _proof
    ) internal override returns (bool) {
        // Check if registration is open
        if (!isRegistrationOpen) {
            revert RegistrationNotOpen();
        }

        // Check if nullifier has been used
        if (_nullifiers[_nullifier]) {
            revert RegisteredNullifier();
        }

        // Check if user identifier is valid
        if (_proof.pubSignals[USER_IDENTIFIER_INDEX] == 0) {
            revert InvalidUserIdentifier();
        }

        return true;
    }

    /**
     * @notice Updates the state for a nullifier after successful verification
     * @dev Overrides the base implementation to store the user identifier and emit event
     * @param _nullifier The nullifier to update
     * @param _proof The complete proof data
     */
    function updateNullifier(
        uint256 _nullifier,
        ISelfVerificationRoot.DiscloseCircuitProof memory _proof
    ) internal override {
        // Get user identifier from proof
        uint256 _userIdentifier = _proof.pubSignals[USER_IDENTIFIER_INDEX];

        // Mark nullifier as used (parent functionality)
        _nullifiers[_nullifier] = true;

        // Store user identifier mapping (extended functionality)
        _userIdentifiers[_nullifier] = _userIdentifier;
        _registeredUserIdentifiers[_userIdentifier] = true;

        // Emit registration event directly from here instead of onVerificationSuccess
        emit UserIdentifierRegistered(_userIdentifier, _nullifier);
    }

    /**
     * @notice Hook called after successful verification
     * @dev No additional logic needed as everything is handled in updateNullifier
     * @param _revealedDataPacked The packed revealed data from the proof
     * @param _userIdentifier The user identifier from the proof
     */
    function onVerificationSuccess(uint256[3] memory _revealedDataPacked, uint256 _userIdentifier) internal override {
        // No additional logic needed - event is emitted in updateNullifier
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
