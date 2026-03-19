// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {InternalLeanIMT, LeanIMTData} from "@zk-kit/imt.sol/internal/InternalLeanIMT.sol";
import {IIdentityRegistryKycV1} from "../interfaces/IIdentityRegistryKycV1.sol";
import {AttestationId} from "../constants/AttestationId.sol";
import {ImplRoot} from "../upgradeable/ImplRoot.sol";
import {GCPJWTHelper} from "../libraries/GCPJWTHelper.sol";
import {Formatter} from "../libraries/Formatter.sol";

/**
 * @notice ⚠️ CRITICAL STORAGE LAYOUT WARNING ⚠️
 * =============================================
 *
 * This contract uses the UUPS upgradeable pattern which makes storage layout EXTREMELY SENSITIVE.
 *
 * 🚫 NEVER MODIFY OR REORDER existing storage variables
 * 🚫 NEVER INSERT new variables between existing ones
 * 🚫 NEVER CHANGE THE TYPE of existing variables
 *
 * ✅ New storage variables MUST be added in one of these two ways ONLY:
 *    1. At the END of the storage layout
 *    2. In a new V2 contract that inherits from this V1
 * ✅ It is safe to rename variables (e.g., changing 'variable' to 'oldVariable')
 *    as long as the type and order remain the same
 *
 * For more detailed information about forbidden changes, please refer to:
 * https://docs.openzeppelin.com/upgrades-plugins/writing-upgradeable#modifying-your-contracts
 *
 * ⚠️ VIOLATION OF THESE RULES WILL CAUSE CATASTROPHIC STORAGE COLLISIONS IN FUTURE UPGRADES ⚠️
 * =============================================
 */

/**
 * @title IdentityRegistryKycStorageV1
 * @dev Abstract contract for storage layout of IdentityRegistryKycImplV1.
 * Inherits from ImplRoot to provide upgradeable functionality.
 */
abstract contract IdentityRegistryKycStorageV1 is ImplRoot {
    // =============================================
    // Storage Variables
    // =============================================

    /// @notice Address of the identity verification hub.
    address internal _hub;

    /// @notice Address of the PCR0Manager.
    address internal _PCR0Manager;

    /// @notice Merkle tree data structure for identity commitments.
    LeanIMTData internal _identityCommitmentIMT;

    /// @notice Mapping from public key commitment to its creation timestamp.
    mapping(uint256 => uint256) internal _rootTimestamps;

    /// @notice Mapping from nullifier to a boolean indicating registration.
    mapping(uint256 => bool) internal _nullifiers;

    /// @notice Pubkey commitments registered for KYC.
    mapping(uint256 => bool) internal _isRegisteredPubkeyCommitment;

    /// @notice Current name and date of birth OFAC root.
    uint256 internal _nameAndDobOfacRoot;

    /// @notice Current name and year of birth OFAC root.
    uint256 internal _nameAndYobOfacRoot;

    /// @notice Address of the GCP JWT verifier contract.
    address internal _gcpJwtVerifier;

    /// @notice Address of the TEE authorized to register pubkey commitments.
    address internal _tee;

    /// @notice The expected hash of the GCP root CA public key for JWT verification.
    uint256 internal _gcpRootCAPubkeyHash;

    /// @notice Previous name and date of birth OFAC root (rolling window).
    uint256 internal _prevNameAndDobOfacRoot;

    /// @notice Previous name and year of birth OFAC root (rolling window).
    uint256 internal _prevNameAndYobOfacRoot;
}

/**
 * @title IGCPJWTVerifier
 * @notice Interface for the GCP JWT verifier contract.
 */
interface IGCPJWTVerifier {
    /**
     * @notice Verifies a Groth16 proof for GCP JWT attestation.
     * @param pA Proof element A.
     * @param pB Proof element B.
     * @param pC Proof element C.
     * @param pubSignals Public signals from the circuit.
     * @return True if the proof is valid, false otherwise.
     */
    function verifyProof(
        uint256[2] calldata pA,
        uint256[2][2] calldata pB,
        uint256[2] calldata pC,
        uint256[20] calldata pubSignals
    ) external view returns (bool);
}

/**
 * @title IPCR0Manager
 * @notice Interface for the PCR0 (TEE image hash) manager contract.
 */
interface IPCR0Manager {
    /**
     * @notice Checks if a PCR0 hash is registered as valid.
     * @param pcr0 The PCR0 hash to check.
     * @return True if the PCR0 hash is registered, false otherwise.
     */
    function isPCR0Set(bytes calldata pcr0) external view returns (bool);
}

/**
 * @title IdentityRegistryKycImplV1
 * @notice Provides functions to register and manage identity commitments using a Merkle tree structure.
 * @dev Inherits from IdentityRegistryKycStorageV1 and implements IIdentityRegistryKycV1.
 *
 * @custom:version 1.2.1
 */
contract IdentityRegistryKycImplV1 is IdentityRegistryKycStorageV1, IIdentityRegistryKycV1 {
    using InternalLeanIMT for LeanIMTData;

    // ====================================================
    // Events
    // ====================================================

    /// @notice Emitted when the registry is initialized.
    event RegistryInitialized(address hub, address PCR0Manager);
    /// @notice Emitted when the hub address is updated.
    event HubUpdated(address hub);
    /// @notice Emitted when the PCR0Manager address is updated.
    event PCR0ManagerUpdated(address PCR0Manager);
    /// @notice Emitted when the name and date of birth OFAC root is updated.
    event NameAndDobOfacRootUpdated(uint256 nameAndDobOfacRoot);
    /// @notice Emitted when the name and year of birth OFAC root is updated.
    event NameAndYobOfacRootUpdated(uint256 nameAndYobOfacRoot);
    /// @notice Emitted when the GCP root CA pubkey hash is updated.
    event GCPRootCAPubkeyHashUpdated(uint256 gcpRootCAPubkeyHash);
    /// @notice Emitted when the GCP JWT verifier address is updated.
    event GCPJWTVerifierUpdated(address gcpJwtVerifier);
    /// @notice Emitted when the TEE address is updated.
    event TEEUpdated(address tee);
    /// @notice Emitted when an identity commitment is successfully registered.
    event CommitmentRegistered(
        bytes32 indexed attestationId,
        uint256 indexed nullifier,
        uint256 indexed commitment,
        uint256 timestamp,
        uint256 imtRoot,
        uint256 imtIndex
    );
    /// @notice Emitted when a public key commitment is successfully registered.
    event PubkeyCommitmentRegistered(uint256 indexed commitment);
    /// @notice Emitted when OFAC roots are updated via proof.
    event OfacRootsUpdatedWithProof(bytes32 rootsHash, uint256 timestamp);

    /// @notice Emitted when a identity commitment is added by dev team.
    event DevCommitmentRegistered(
        bytes32 indexed attestationId,
        uint256 indexed nullifier,
        uint256 indexed commitment,
        uint256 timestamp,
        uint256 imtRoot,
        uint256 imtIndex
    );
    /// @notice Emitted when a identity commitment is updated by dev team.
    event DevCommitmentUpdated(uint256 indexed oldLeaf, uint256 indexed newLeaf, uint256 imtRoot, uint256 timestamp);
    /// @notice Emitted when a identity commitment is removed by dev team.
    event DevCommitmentRemoved(uint256 indexed oldLeaf, uint256 imtRoot, uint256 timestamp);

    // ====================================================
    // Errors
    // ====================================================

    /// @notice Thrown when the hub is not set.
    error HUB_NOT_SET();
    /// @notice Thrown when a function is accessed by an address other than the designated hub.
    error ONLY_HUB_CAN_ACCESS();
    /// @notice Thrown when the TEE is not set.
    error TEE_NOT_SET();
    /// @notice Thrown when a function is accessed by an address other than the designated TEE.
    error ONLY_TEE_CAN_ACCESS();
    /// @notice Thrown when attempting to register a commitment that has already been registered.
    error REGISTERED_COMMITMENT();
    /// @notice Thrown when the hub address is set to the zero address.
    error HUB_ADDRESS_ZERO();
    /// @notice Thrown when the GCP JWT proof verification fails.
    error INVALID_PROOF();
    /// @notice Thrown when the GCP root CA public key hash does not match the expected value.
    error INVALID_ROOT_CA();
    /// @notice Thrown when the TEE image hash is not registered in the PCR0Manager.
    error INVALID_IMAGE();
    /// @notice Thrown when the timestamp is invalid.
    error INVALID_TIMESTAMP();
    /// @notice Thrown when the roots hash does not match the proof.
    error InvalidRootsHash();
    /// @notice Thrown when the wrong number of roots is provided.
    error InvalidRootsCount();

    // ====================================================
    // Modifiers
    // ====================================================

    /**
     * @notice Modifier to restrict access to functions to only the hub.
     * @dev Reverts if the hub is not set or if the caller is not the hub.
     */
    modifier onlyHub() {
        if (address(_hub) == address(0)) revert HUB_NOT_SET();
        if (msg.sender != address(_hub)) revert ONLY_HUB_CAN_ACCESS();
        _;
    }

    /**
     * @notice Modifier to restrict access to functions to only the TEE.
     * @dev Reverts if the TEE is not set or if the caller is not the TEE.
     */
    modifier onlyTEE() {
        if (address(_tee) == address(0)) revert TEE_NOT_SET();
        if (msg.sender != address(_tee)) revert ONLY_TEE_CAN_ACCESS();
        _;
    }

    // ====================================================
    // Constructor
    // ====================================================

    /**
     * @notice Constructor that disables initializers.
     * @dev Prevents direct initialization of the implementation contract.
     */
    constructor() {
        _disableInitializers();
    }

    // ====================================================
    // Initializer
    // ====================================================

    /**
     * @notice Initializes the registry implementation.
     * @dev Sets the hub address and initializes the UUPS upgradeable feature.
     * @param hubAddress The address of the identity verification hub.
     * @param pcr0ManagerAddress The address of the PCR0Manager.
     */
    function initialize(address hubAddress, address pcr0ManagerAddress) external initializer {
        __ImplRoot_init();
        _hub = hubAddress;
        _PCR0Manager = pcr0ManagerAddress;
        emit RegistryInitialized(hubAddress, pcr0ManagerAddress);
    }

    // ====================================================
    // External Functions - View & Checks
    // ====================================================

    /**
     * @notice Retrieves the hub address.
     * @return The current identity verification hub address.
     */
    function hub() external view onlyProxy returns (address) {
        return _hub;
    }

    /**
     * @notice Retrieves the PCR0Manager address.
     * @return The current PCR0Manager address.
     */
    function PCR0Manager() external view onlyProxy returns (address) {
        return _PCR0Manager;
    }

    /**
     * @notice Retrieves the TEE address.
     * @return The current TEE address.
     */
    function tee() external view onlyProxy returns (address) {
        return _tee;
    }

    /**
     * @notice Retrieves the GCP root CA pubkey hash.
     * @return The current GCP root CA pubkey hash.
     */
    function gcpRootCAPubkeyHash() external view onlyProxy returns (uint256) {
        return _gcpRootCAPubkeyHash;
    }

    /// @notice Checks if a specific nullifier is registered.
    /// @param nullifier The nullifier to be checked.
    /// @return True if the nullifier has been registered, false otherwise.
    function nullifiers(uint256 nullifier) external view virtual onlyProxy returns (bool) {
        return _nullifiers[nullifier];
    }

    /// @notice Retrieves the timestamp of the identity commitment Merkle tree root.
    /// @param root The Merkle tree root to check.
    /// @return The timestamp of the root.
    function rootTimestamps(uint256 root) external view virtual onlyProxy returns (uint256) {
        return _rootTimestamps[root];
    }

    /// @notice Checks if the pubkey commitment is registered.
    /// @param pubkeyCommitment The pubkey commitment to check.
    /// @return True if the pubkey commitment is registered, false otherwise.
    function isRegisteredPubkeyCommitment(uint256 pubkeyCommitment) external view onlyProxy returns (bool) {
        return _isRegisteredPubkeyCommitment[pubkeyCommitment];
    }

    /// @notice Retrieves the total number of identity commitments in the Merkle tree.
    /// @return The size (i.e., count) of the identity commitment Merkle tree.
    function getIdentityCommitmentMerkleTreeSize() external view virtual onlyProxy returns (uint256) {
        return _identityCommitmentIMT.size;
    }

    /// @notice Checks if the identity commitment Merkle tree contains the specified root.
    /// @param root The Merkle tree root to check.
    /// @return True if the root exists in the tree, false otherwise.
    function checkIdentityCommitmentRoot(uint256 root) external view virtual onlyProxy returns (bool) {
        return _rootTimestamps[root] > 0;
    }

    /// @notice Retrieves the current Merkle root of the identity commitments.
    /// @return The current identity commitment Merkle root.
    function getIdentityCommitmentMerkleRoot() external view virtual onlyProxy returns (uint256) {
        return _identityCommitmentIMT._root();
    }

    /**
     * @notice Retrieves the name and date of birth OFAC root.
     * @return The current name and date of birth OFAC root.
     */
    function getNameAndDobOfacRoot() external view onlyProxy returns (uint256) {
        return _nameAndDobOfacRoot;
    }

    /**
     * @notice Retrieves the name and year of birth OFAC root.
     * @return The current name and year of birth OFAC root.
     */
    function getNameAndYobOfacRoot() external view onlyProxy returns (uint256) {
        return _nameAndYobOfacRoot;
    }

    /**
     * @notice Retrieves the previous name and date of birth OFAC root (rolling window).
     * @return The stored previous name and date of birth OFAC root.
     */
    function getPrevNameAndDobOfacRoot() external view onlyProxy returns (uint256) {
        return _prevNameAndDobOfacRoot;
    }

    /**
     * @notice Retrieves the previous name and year of birth OFAC root (rolling window).
     * @return The stored previous name and year of birth OFAC root.
     */
    function getPrevNameAndYobOfacRoot() external view onlyProxy returns (uint256) {
        return _prevNameAndYobOfacRoot;
    }

    /// @notice Returns the address of the GCP JWT verifier contract.
    function getGcpJwtVerifier() external view onlyProxy returns (address) {
        return _gcpJwtVerifier;
    }

    /// @notice Returns the address of the PCR0 Manager contract.
    function getPcr0Manager() external view onlyProxy returns (address) {
        return _PCR0Manager;
    }

    /**
     * @notice Checks if the provided OFAC roots match the stored OFAC roots.
     * @param nameAndDobRoot The name and date of birth OFAC root to verify.
     * @param nameAndYobRoot The name and year of birth OFAC root to verify.
     * @return True if both provided roots match the stored values, false otherwise.
     */
    function checkOfacRoots(uint256 nameAndDobRoot, uint256 nameAndYobRoot) external view onlyProxy returns (bool) {
        bool currentMatch = (_nameAndDobOfacRoot == nameAndDobRoot) &&
            (_nameAndYobOfacRoot == nameAndYobRoot);
        bool prevMatch = (_prevNameAndDobOfacRoot != 0) &&
            (_prevNameAndDobOfacRoot == nameAndDobRoot) &&
            (_prevNameAndYobOfacRoot == nameAndYobRoot);
        return currentMatch || prevMatch;
    }

    /**
     * @notice Checks if the provided pubkey commitment is stored in the registry.
     * @param pubkeyCommitment The pubkey commitment to verify.
     * @return True if the pubkey commitment is stored in the registry, false otherwise.
     */
    function checkPubkeyCommitment(uint256 pubkeyCommitment) external view onlyProxy returns (bool) {
        return _isRegisteredPubkeyCommitment[pubkeyCommitment];
    }

    // ====================================================
    // External Functions - Registration
    // ====================================================

    /// @notice Registers a new identity commitment.
    /// @dev Caller must be the hub. Reverts if the nullifier is already registered.
    /// @param nullifier The nullifier associated with the identity commitment.
    /// @param commitment The identity commitment to register.
    function registerCommitment(uint256 nullifier, uint256 commitment) external onlyProxy onlyHub {
        if (_nullifiers[nullifier]) revert REGISTERED_COMMITMENT();
        _nullifiers[nullifier] = true;
        uint256 index = _identityCommitmentIMT.size;
        uint256 imt_root = _identityCommitmentIMT._insert(commitment);
        _rootTimestamps[imt_root] = block.timestamp;
        emit CommitmentRegistered(AttestationId.KYC, nullifier, commitment, block.timestamp, imt_root, index);
    }

    // ====================================================
    // External Functions - Role-Based Access Control
    // ====================================================

    /**
     * @notice Updates the hub address.
     * @dev Callable only via a proxy and restricted to the contract owner.
     * @param newHubAddress The new address of the hub.
     */
    function updateHub(address newHubAddress) external onlyProxy onlyRole(SECURITY_ROLE) {
        if (newHubAddress == address(0)) revert HUB_ADDRESS_ZERO();
        _hub = newHubAddress;
        emit HubUpdated(newHubAddress);
    }

    /**
     * @notice Updates the PCR0Manager address.
     * @dev Callable only via a proxy and restricted to the contract owner.
     * @param newPCR0ManagerAddress The new address of the PCR0Manager.
     */
    function updatePCR0Manager(address newPCR0ManagerAddress) external virtual onlyProxy onlyRole(SECURITY_ROLE) {
        _PCR0Manager = newPCR0ManagerAddress;
        emit PCR0ManagerUpdated(newPCR0ManagerAddress);
    }

    /**
     * @notice Updates the name and date of birth OFAC root.
     * @dev Callable only via a proxy and restricted to the contract owner.
     * @param nameAndDobOfacRoot The new name and date of birth OFAC root value.
     */
    function updateNameAndDobOfacRoot(uint256 nameAndDobOfacRoot) external virtual onlyProxy onlyRole(OPERATIONS_ROLE) {
        _prevNameAndDobOfacRoot = _nameAndDobOfacRoot;
        _nameAndDobOfacRoot = nameAndDobOfacRoot;
        emit NameAndDobOfacRootUpdated(nameAndDobOfacRoot);
    }

    /**
     * @notice Updates the name and year of birth OFAC root.
     * @dev Callable only via a proxy and restricted to the contract owner.
     * @param nameAndYobOfacRoot The new name and year of birth OFAC root value.
     */
    function updateNameAndYobOfacRoot(uint256 nameAndYobOfacRoot) external virtual onlyProxy onlyRole(OPERATIONS_ROLE) {
        _prevNameAndYobOfacRoot = _nameAndYobOfacRoot;
        _nameAndYobOfacRoot = nameAndYobOfacRoot;
        emit NameAndYobOfacRootUpdated(nameAndYobOfacRoot);
    }

    /**
     * @notice Updates the GCP root CA pubkey hash.
     * @dev Callable only via a proxy and restricted to the contract owner.
     * @param gcpRootCAPubkeyHash The new GCP root CA pubkey hash value.
     */
    function updateGCPRootCAPubkeyHash(uint256 gcpRootCAPubkeyHash) external virtual onlyProxy onlyRole(SECURITY_ROLE) {
        _gcpRootCAPubkeyHash = gcpRootCAPubkeyHash;
        emit GCPRootCAPubkeyHashUpdated(gcpRootCAPubkeyHash);
    }

    /// @notice Updates the GCP JWT verifier contract address.
    /// @dev Callable only by the contract owner.
    /// @param verifier The new GCP JWT verifier address.
    function updateGCPJWTVerifier(address verifier) external onlyProxy onlyRole(SECURITY_ROLE) {
        _gcpJwtVerifier = verifier;
        emit GCPJWTVerifierUpdated(verifier);
    }

    /// @notice Updates the TEE address.
    /// @dev Callable only by the contract owner.
    /// @param teeAddress The new TEE address.
    function updateTEE(address teeAddress) external onlyProxy onlyRole(SECURITY_ROLE) {
        _tee = teeAddress;
        emit TEEUpdated(teeAddress);
    }

    /// @notice Registers a pubkey via GCP JWT proof.
    /// @dev Verifies the proof, checks root CA hash matches stored value, validates image hash against PCR0Manager.
    /// @param pA Groth16 proof element A.
    /// @param pB Groth16 proof element B.
    /// @param pC Groth16 proof element C.
    /// @param pubSignals Circuit public signals: [rootCAHash, eatNonce[0-2], imageHash[0-2]].
    function registerPubkeyCommitment(
        uint256[2] calldata pA,
        uint256[2][2] calldata pB,
        uint256[2] calldata pC,
        uint256[20] calldata pubSignals
    ) external onlyProxy onlyTEE {
        // Check if the proof is valid
        if (!IGCPJWTVerifier(_gcpJwtVerifier).verifyProof(pA, pB, pC, pubSignals)) revert INVALID_PROOF();

        // Check if the root CA pubkey hash is valid
        if (pubSignals[0] != _gcpRootCAPubkeyHash) revert INVALID_ROOT_CA();

        // Check if the TEE image hash is valid
        bytes memory imageHash = GCPJWTHelper.unpackAndConvertImageHash(pubSignals[5], pubSignals[6], pubSignals[7]);
        if (!IPCR0Manager(_PCR0Manager).isPCR0Set(imageHash)) revert INVALID_IMAGE();

        // Unpack the pubkey and register it
        uint256 pubkeyCommitment = GCPJWTHelper.unpackAndDecodeHexPubkey(pubSignals[1], pubSignals[2], pubSignals[3]);
        _isRegisteredPubkeyCommitment[pubkeyCommitment] = true;

        uint256 currentYear = 2000 + pubSignals[8] * 10 + pubSignals[9];
        uint256 currentMonth = pubSignals[10] * 10 + pubSignals[11];
        uint256 currentDay = pubSignals[12] * 10 + pubSignals[13];
        uint256 currentHour = pubSignals[14] * 10 + pubSignals[15];
        uint256 currentMinute = pubSignals[16] * 10 + pubSignals[17];
        uint256 currentSecond = pubSignals[18] * 10 + pubSignals[19];
        uint256 currentTimestamp = Formatter.toTimeStampWithSeconds(
            currentYear,
            currentMonth,
            currentDay,
            currentHour,
            currentMinute,
            currentSecond
        );

        if (currentTimestamp + 1 hours < block.timestamp) revert INVALID_TIMESTAMP(); //1 hour in the past
        if (currentTimestamp > block.timestamp + 1 hours) revert INVALID_TIMESTAMP(); //1 hour in the future

        emit PubkeyCommitmentRegistered(pubkeyCommitment);
    }

    /// @notice Updates OFAC roots via proof-verified TEE attestation.
    /// @dev Verifies the Groth16 proof, validates TEE attestation claims, checks
    /// this registry's roots hash against the eat_nonce from the proof. Restricted to the TEE address. The proof provides
    /// cryptographic verification, and onlyTEE provides access control.
    /// @param pA Groth16 proof element A.
    /// @param pB Groth16 proof element B.
    /// @param pC Groth16 proof element C.
    /// @param pubSignals Circuit public signals [rootCA, eatNonce[0-2], unused, imageHash[0-2], date[0-11]].
    /// @param roots This registry's roots: [nameAndDob, nameAndYob].
    function updateOfacRootsWithProof(
        uint256[2] calldata pA,
        uint256[2][2] calldata pB,
        uint256[2] calldata pC,
        uint256[20] calldata pubSignals,
        uint256[] calldata roots
    ) external onlyProxy onlyTEE {
        if (roots.length != 2) revert InvalidRootsCount();

        // Verify Groth16 proof
        if (!IGCPJWTVerifier(_gcpJwtVerifier).verifyProof(pA, pB, pC, pubSignals)) revert INVALID_PROOF();

        // Verify root CA pubkey hash
        if (pubSignals[0] != _gcpRootCAPubkeyHash) revert INVALID_ROOT_CA();

        // Verify TEE image hash
        bytes memory imageHash = GCPJWTHelper.unpackAndConvertImageHash(pubSignals[5], pubSignals[6], pubSignals[7]);
        if (!IPCR0Manager(_PCR0Manager).isPCR0Set(imageHash)) revert INVALID_IMAGE();

        // Verify timestamp (±1 hour)
        uint256 currentTimestamp = Formatter.toTimeStampWithSeconds(
            2000 + pubSignals[8] * 10 + pubSignals[9],
            pubSignals[10] * 10 + pubSignals[11],
            pubSignals[12] * 10 + pubSignals[13],
            pubSignals[14] * 10 + pubSignals[15],
            pubSignals[16] * 10 + pubSignals[17],
            pubSignals[18] * 10 + pubSignals[19]
        );
        if (currentTimestamp + 1 hours < block.timestamp) revert INVALID_TIMESTAMP();
        if (currentTimestamp > block.timestamp + 1 hours) revert INVALID_TIMESTAMP();

        // Verify roots hash matches eat_nonce from proof
        bytes32 myHash = sha256(abi.encodePacked(roots[0], roots[1]));
        uint256 rootsHashFromProof = GCPJWTHelper.unpackAndDecodeHexPubkey(pubSignals[1], pubSignals[2], pubSignals[3]);
        if (uint256(myHash) != rootsHashFromProof) revert InvalidRootsHash();

        // Update this registry's roots: [nameAndDob, nameAndYob]
        _prevNameAndDobOfacRoot = _nameAndDobOfacRoot;
        _prevNameAndYobOfacRoot = _nameAndYobOfacRoot;
        _nameAndDobOfacRoot = roots[0];
        _nameAndYobOfacRoot = roots[1];

        emit NameAndDobOfacRootUpdated(roots[0]);
        emit NameAndYobOfacRootUpdated(roots[1]);
        emit OfacRootsUpdatedWithProof(myHash, block.timestamp);
    }

    /// @notice (DEV) Force-adds an identity commitment.
    /// @dev Callable only by the owner for testing or administration.
    /// @param nullifier The nullifier associated with the identity commitment.
    /// @param commitment The identity commitment to add.
    function devAddIdentityCommitment(
        uint256 nullifier,
        uint256 commitment
    ) external onlyProxy onlyRole(SECURITY_ROLE) {
        _nullifiers[nullifier] = true;
        uint256 imt_root = _identityCommitmentIMT._insert(commitment);
        _rootTimestamps[imt_root] = block.timestamp;
        uint256 index = _identityCommitmentIMT._indexOf(commitment);
        emit DevCommitmentRegistered(AttestationId.KYC, nullifier, commitment, block.timestamp, imt_root, index);
    }

    /// @notice (DEV) Updates an existing identity commitment.
    /// @dev Caller must be the owner. Provides sibling nodes for proof of position.
    /// @param oldLeaf The current identity commitment to update.
    /// @param newLeaf The new identity commitment.
    /// @param siblingNodes An array of sibling nodes for Merkle proof generation.
    function devUpdateCommitment(
        uint256 oldLeaf,
        uint256 newLeaf,
        uint256[] calldata siblingNodes
    ) external onlyProxy onlyRole(SECURITY_ROLE) {
        uint256 imt_root = _identityCommitmentIMT._update(oldLeaf, newLeaf, siblingNodes);
        _rootTimestamps[imt_root] = block.timestamp;
        emit DevCommitmentUpdated(oldLeaf, newLeaf, imt_root, block.timestamp);
    }

    /// @notice (DEV) Removes an existing identity commitment.
    /// @dev Caller must be the owner. Provides sibling nodes for proof of position.
    /// @param oldLeaf The identity commitment to remove.
    /// @param siblingNodes An array of sibling nodes for Merkle proof generation.
    function devRemoveCommitment(
        uint256 oldLeaf,
        uint256[] calldata siblingNodes
    ) external onlyProxy onlyRole(SECURITY_ROLE) {
        uint256 imt_root = _identityCommitmentIMT._remove(oldLeaf, siblingNodes);
        _rootTimestamps[imt_root] = block.timestamp;
        emit DevCommitmentRemoved(oldLeaf, imt_root, block.timestamp);
    }
}
