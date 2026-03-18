// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {InternalLeanIMT, LeanIMTData} from "@zk-kit/imt.sol/internal/InternalLeanIMT.sol";
import {IIdentityRegistryAadhaarV1} from "../interfaces/IIdentityRegistryAadhaarV1.sol";
import {ImplRoot} from "../upgradeable/ImplRoot.sol";
import {AttestationId} from "../constants/AttestationId.sol";
import {GCPJWTHelper} from "../libraries/GCPJWTHelper.sol";
import {Formatter} from "../libraries/Formatter.sol";

/**
 * @title IGCPJWTVerifier
 * @notice Interface for the GCP JWT verifier contract.
 */
interface IGCPJWTVerifier {
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
    function isPCR0Set(bytes calldata pcr0) external view returns (bool);
}

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
 * Examples of forbidden changes:
 * - Changing uint256 to uint128
 * - Changing bytes32 to bytes
 * - Changing array type to mapping
 *
 * For more detailed information about forbidden changes, please refer to:
 * https://docs.openzeppelin.com/upgrades-plugins/writing-upgradeable#modifying-your-contracts
 *
 * ⚠️ VIOLATION OF THESE RULES WILL CAUSE CATASTROPHIC STORAGE COLLISIONS IN FUTURE UPGRADES ⚠️
 * =============================================
 */

/**
 * @title IdentityRegistryAadhaarStorageV1
 * @dev Abstract contract for storage layout of IdentityRegistryAadhaarImplV1.
 * Inherits from ImplRoot to provide upgradeable functionality.
 */
abstract contract IdentityRegistryAadhaarStorageV1 is ImplRoot {
    // ====================================================
    // Storage Variables

    /// @notice Address of the identity verification hub.
    address internal _hub;

    /// @notice Merkle tree data structure for identity commitments.
    LeanIMTData internal _identityCommitmentIMT;

    /// @notice Mapping from Merkle tree root to its creation timestamp.
    mapping(uint256 => uint256) internal _rootTimestamps;

    /// @notice Mapping from nullifier to a boolean indicating registration.
    mapping(uint256 => bool) internal _nullifiers;

    /// @notice Mapping from UIDAI pubkey to a boolean indicating registration.
    mapping(uint256 => bool) internal _uidaiPubkeyCommitments;

    /// @notice Current name and date of birth OFAC root.
    uint256 internal _nameAndDobOfacRoot;

    /// @notice Current name and year of birth OFAC root.
    uint256 internal _nameAndYobOfacRoot;

    /// @notice Previous name and date of birth OFAC root (rolling window).
    uint256 internal _prevNameAndDobOfacRoot;

    /// @notice Previous name and year of birth OFAC root (rolling window).
    uint256 internal _prevNameAndYobOfacRoot;

    /// @notice Address of the GCP JWT verifier contract for OFAC proof updates.
    address internal _gcpJwtVerifier;

    /// @notice Address of the PCR0Manager for OFAC proof updates.
    address internal _pcr0Manager;

    /// @notice Expected hash of the GCP root CA public key for OFAC proof verification.
    uint256 internal _gcpRootCAPubkeyHash;

    /// @notice Address of the TEE authorized to call updateOfacRootsWithProof.
    address internal _tee;
}

/**
 * @title IdentityRegistryAadhaarImplV1
 * @notice Provides functions to register and manage identity commitments using a Merkle tree structure.
 * @dev Inherits from IdentityRegistryAadhaarStorageV1 and implements IIdentityRegistryAadhaarV1.
 *
 * @custom:version 1.3.0
 */
contract IdentityRegistryAadhaarImplV1 is IdentityRegistryAadhaarStorageV1, IIdentityRegistryAadhaarV1 {
    using InternalLeanIMT for LeanIMTData;

    // ====================================================
    // Events
    // ====================================================

    /// @notice Emitted when the registry is initialized.
    event RegistryInitialized(address hub);
    /// @notice Emitted when the hub address is updated.
    event HubUpdated(address hub);
    /// @notice Emitted when the name and date of birth OFAC root is updated.
    event NameAndDobOfacRootUpdated(uint256 nameAndDobOfacRoot);
    /// @notice Emitted when the name and year of birth OFAC root is updated.
    event NameAndYobOfacRootUpdated(uint256 nameAndYobOfacRoot);
    /// @notice Emitted when the name and date of birth reverse OFAC root is updated.
    event NameAndDobReverseOfacRootUpdated(uint256 nameAndDobReverseOfacRoot);
    /// @notice Emitted when the name and year of birth reverse OFAC root is updated.
    event NameAndYobReverseOfacRootUpdated(uint256 nameAndYobReverseOfacRoot);
    /// @notice Emitted when an identity commitment is successfully registered.
    event CommitmentRegistered(
        bytes32 indexed attestationId,
        uint256 indexed nullifier,
        uint256 indexed commitment,
        uint256 timestamp,
        uint256 imtRoot,
        uint256 imtIndex
    );
    /// @notice Emitted when a UIDAI pubkey commitment is successfully registered.
    event UidaiPubkeyCommitmentRegistered(uint256 indexed commitment, uint256 timestamp);

    /// @notice Emitted when a UIDAI pubkey commitment is successfully updated.
    event UidaiPubkeyCommitmentUpdated(uint256 indexed commitment, uint256 timestamp);

    /// @notice Emitted when a UIDAI pubkey commitment is successfully removed.
    event UidaiPubkeyCommitmentRemoved(uint256 indexed commitment, uint256 timestamp);

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
    /// @notice Emitted when OFAC roots are updated via proof.
    event OfacRootsUpdatedWithProof(bytes32 rootsHash, uint256 timestamp);
    /// @notice Emitted when the GCP JWT verifier address is updated.
    event GCPJWTVerifierUpdated(address gcpJwtVerifier);
    /// @notice Emitted when the PCR0Manager address is updated.
    event PCR0ManagerUpdated(address pcr0Manager);
    /// @notice Emitted when the GCP root CA pubkey hash is updated.
    event GCPRootCAPubkeyHashUpdated(uint256 gcpRootCAPubkeyHash);
    /// @notice Emitted when the TEE address is updated.
    event TEEUpdated(address tee);

    // ====================================================
    // Errors
    // ====================================================

    /// @notice Thrown when the hub is not set.
    error HUB_NOT_SET();
    /// @notice Thrown when a function is accessed by an address other than the designated hub.
    error ONLY_HUB_CAN_ACCESS();
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
    /// @notice Thrown when the TEE address is not set.
    error TEE_NOT_SET();
    /// @notice Thrown when a function is accessed by an address other than the designated TEE.
    error ONLY_TEE_CAN_ACCESS();

    // ====================================================
    // Modifiers
    // ====================================================

    /// @notice Modifier to restrict access to functions to only the hub.
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

    /// @notice Constructor for the IdentityRegistryAadhaarImplV1 contract.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ====================================================
    // Initializer
    // ====================================================

    /// @notice Initializes the registry implementation.
    /// @dev Sets the hub address and initializes the UUPS upgradeable feature.
    /// @param _hub The address of the identity verification hub.
    function initialize(address _hub) external initializer {
        __ImplRoot_init();
        _hub = _hub;
        emit RegistryInitialized(_hub);
    }

    /**
     * @notice Initializes AccessControl governance.
     * @dev Used when upgrading from Ownable to AccessControl governance.
     * This function sets up AccessControl roles on an already-initialized contract.
     * It does NOT modify existing state (hub, roots, etc.).
     *
     * SECURITY: This function can only be called once - enforced by reinitializer(2).
     * The previous version used reinitializer(1), so this upgrade uses version 2.
     */
    function initializeGovernance() external reinitializer(2) {
        __ImplRoot_init();
    }

    /**
     * @notice Initializes OFAC proof verification infrastructure.
     * @dev Sets GCP JWT verifier, PCR0Manager, and root CA pubkey hash.
     * @param gcpJwtVerifier_ The GCP JWT Groth16 verifier address.
     * @param pcr0Manager_ The PCR0Manager address for TEE image validation.
     * @param gcpRootCAPubkeyHash_ The expected Poseidon hash of the GCP root CA public key.
     */
    function initializeOfacProof(
        address gcpJwtVerifier_,
        address pcr0Manager_,
        uint256 gcpRootCAPubkeyHash_,
        address teeAddress_
    ) external onlyProxy onlyRole(DEFAULT_ADMIN_ROLE) reinitializer(3) {
        _gcpJwtVerifier = gcpJwtVerifier_;
        _pcr0Manager = pcr0Manager_;
        _gcpRootCAPubkeyHash = gcpRootCAPubkeyHash_;
        _tee = teeAddress_;
    }

    // ====================================================
    // External Functions - View & Checks
    // ====================================================

    /// @notice Retrieves the hub address.
    /// @return The current identity verification hub address.
    function hub() external view virtual onlyProxy returns (address) {
        return _hub;
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

    /// @notice Checks if a UIDAI pubkey commitment is registered.
    /// @param commitment The UIDAI pubkey commitment to check.
    /// @return True if the commitment is registered, false otherwise.
    function isRegisteredUidaiPubkeyCommitment(uint256 commitment) external view virtual onlyProxy returns (bool) {
        return _uidaiPubkeyCommitments[commitment];
    }

    /// @notice Checks if the identity commitment Merkle tree contains the specified root.
    /// @param root The Merkle tree root to check.
    /// @return True if the root exists in the tree, false otherwise.
    function checkIdentityCommitmentRoot(uint256 root) external view virtual onlyProxy returns (bool) {
        return _rootTimestamps[root] > 0;
    }

    /// @notice Retrieves the total number of identity commitments in the Merkle tree.
    /// @return The size (i.e., count) of the identity commitment Merkle tree.
    function getIdentityCommitmentMerkleTreeSize() external view virtual onlyProxy returns (uint256) {
        return _identityCommitmentIMT.size;
    }

    /// @notice Retrieves the current Merkle root of the identity commitments.
    /// @return The current identity commitment Merkle root.
    function getIdentityCommitmentMerkleRoot() external view virtual onlyProxy returns (uint256) {
        return _identityCommitmentIMT._root();
    }

    /// @notice Retrieves the index of a specific identity commitment in the Merkle tree.
    /// @param commitment The identity commitment to locate.
    /// @return The index position of the provided commitment.
    function getIdentityCommitmentIndex(uint256 commitment) external view virtual onlyProxy returns (uint256) {
        return _identityCommitmentIMT._indexOf(commitment);
    }

    /// @notice Retrieves the current name and date of birth OFAC root.
    /// @return The current name and date of birth OFAC root value.
    function getNameAndDobOfacRoot() external view virtual onlyProxy returns (uint256) {
        return _nameAndDobOfacRoot;
    }

    /// @notice Retrieves the current name and year of birth OFAC root.
    /// @return The current name and year of birth OFAC root value.
    function getNameAndYobOfacRoot() external view virtual onlyProxy returns (uint256) {
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

    /// @notice Validates whether the provided OFAC roots match the stored values.
    /// @param nameAndDobRoot The name and date of birth OFAC root to validate.
    /// @param nameAndYobRoot The name and year of birth OFAC root to validate.
    /// @return True if all provided roots match the stored values, false otherwise.
    function checkOfacRoots(
        uint256 nameAndDobRoot,
        uint256 nameAndYobRoot
    ) external view virtual onlyProxy returns (bool) {
        bool currentMatch = (_nameAndDobOfacRoot == nameAndDobRoot) &&
            (_nameAndYobOfacRoot == nameAndYobRoot);
        bool prevMatch = (_prevNameAndDobOfacRoot != 0) &&
            (_prevNameAndDobOfacRoot == nameAndDobRoot) &&
            (_prevNameAndYobOfacRoot == nameAndYobRoot);
        return currentMatch || prevMatch;
    }

    /// @notice Checks if the provided UIDAI pubkey is stored in the registry and also if it's not expired.
    /// @param pubkey The UIDAI pubkey to verify.
    /// @return True if the given pubkey is stored in the registry and also if it's not expired, otherwise false.
    function checkUidaiPubkey(uint256 pubkey) external view virtual onlyProxy returns (bool) {
        return _uidaiPubkeyCommitments[pubkey];
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
        emit CommitmentRegistered(AttestationId.AADHAAR, nullifier, commitment, block.timestamp, imt_root, index);
    }

    // ====================================================
    // External Functions - Role-Based Access Control
    // ====================================================

    /// @notice Updates the hub address.
    /// @dev Callable only via a proxy and restricted to the contract owner.
    /// @param newHubAddress The new address of the hub.
    function updateHub(address newHubAddress) external onlyProxy onlyRole(SECURITY_ROLE) {
        if (newHubAddress == address(0)) revert HUB_ADDRESS_ZERO();
        _hub = newHubAddress;
        emit HubUpdated(newHubAddress);
    }

    /// @notice Updates the name and date of birth OFAC root.
    /// @dev Callable only via a proxy and restricted to the contract owner.
    /// @param newNameAndDobOfacRoot The new name and date of birth OFAC root value.
    function updateNameAndDobOfacRoot(uint256 newNameAndDobOfacRoot) external onlyProxy onlyRole(OPERATIONS_ROLE) {
        _prevNameAndDobOfacRoot = _nameAndDobOfacRoot;
        _nameAndDobOfacRoot = newNameAndDobOfacRoot;
        emit NameAndDobOfacRootUpdated(newNameAndDobOfacRoot);
    }

    /// @notice Updates the name and year of birth OFAC root.
    /// @dev Callable only via a proxy and restricted to the contract owner.
    /// @param newNameAndYobOfacRoot The new name and year of birth OFAC root value.
    function updateNameAndYobOfacRoot(uint256 newNameAndYobOfacRoot) external onlyProxy onlyRole(OPERATIONS_ROLE) {
        _prevNameAndYobOfacRoot = _nameAndYobOfacRoot;
        _nameAndYobOfacRoot = newNameAndYobOfacRoot;
        emit NameAndYobOfacRootUpdated(newNameAndYobOfacRoot);
    }

    /// @notice Registers a new UIDAI pubkey commitment.
    /// @dev Callable only via a proxy and restricted to the contract owner.
    /// @param commitment The UIDAI pubkey commitment to register.
    function registerUidaiPubkeyCommitment(uint256 commitment) external onlyProxy onlyRole(SECURITY_ROLE) {
        _uidaiPubkeyCommitments[commitment] = true;
        emit UidaiPubkeyCommitmentRegistered(commitment, block.timestamp);
    }

    /// @notice Removes a UIDAI pubkey commitment.
    /// @dev Callable only via a proxy and restricted to the contract owner.
    /// @param commitment The UIDAI pubkey commitment to remove.
    function removeUidaiPubkeyCommitment(uint256 commitment) external onlyProxy onlyRole(SECURITY_ROLE) {
        delete _uidaiPubkeyCommitments[commitment];
        emit UidaiPubkeyCommitmentRemoved(commitment, block.timestamp);
    }

    /// @notice Updates a UIDAI pubkey commitment.
    /// @dev Callable only via a proxy and restricted to the contract owner.
    /// @param commitment The UIDAI pubkey commitment to update.
    function updateUidaiPubkeyCommitment(uint256 commitment) external onlyProxy onlyRole(SECURITY_ROLE) {
        _uidaiPubkeyCommitments[commitment] = true;
        emit UidaiPubkeyCommitmentUpdated(commitment, block.timestamp);
    }

    /// @notice Updates the GCP JWT verifier contract address.
    /// @param verifier The new GCP JWT verifier address.
    function updateGCPJWTVerifier(address verifier) external onlyProxy onlyRole(SECURITY_ROLE) {
        _gcpJwtVerifier = verifier;
        emit GCPJWTVerifierUpdated(verifier);
    }

    /// @notice Updates the PCR0Manager address.
    /// @param newPCR0Manager The new PCR0Manager address.
    function updatePCR0Manager(address newPCR0Manager) external onlyProxy onlyRole(SECURITY_ROLE) {
        _pcr0Manager = newPCR0Manager;
        emit PCR0ManagerUpdated(newPCR0Manager);
    }

    /// @notice Updates the GCP root CA pubkey hash.
    /// @param newHash The new GCP root CA pubkey hash value.
    function updateGCPRootCAPubkeyHash(uint256 newHash) external onlyProxy onlyRole(SECURITY_ROLE) {
        _gcpRootCAPubkeyHash = newHash;
        emit GCPRootCAPubkeyHashUpdated(newHash);
    }

    /// @notice Updates the TEE address.
    /// @param teeAddress The new TEE address.
    function updateTEE(address teeAddress) external onlyProxy onlyRole(SECURITY_ROLE) {
        _tee = teeAddress;
        emit TEEUpdated(teeAddress);
    }

    /// @notice Retrieves the TEE address.
    /// @return The current TEE address.
    function tee() external view onlyProxy returns (address) {
        return _tee;
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
        if (!IPCR0Manager(_pcr0Manager).isPCR0Set(imageHash)) revert INVALID_IMAGE();

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
        uint256 rootsHashFromProof = GCPJWTHelper.unpackAndDecodeHexPubkey(
            pubSignals[1], pubSignals[2], pubSignals[3]
        );
        if (uint256(myHash) != rootsHashFromProof) revert InvalidRootsHash();

        // Update this registry's roots: [nameAndDob, nameAndYob] (with rolling window)
        _prevNameAndDobOfacRoot = _nameAndDobOfacRoot;
        _nameAndDobOfacRoot = roots[0];
        _prevNameAndYobOfacRoot = _nameAndYobOfacRoot;
        _nameAndYobOfacRoot = roots[1];

        emit NameAndDobOfacRootUpdated(roots[0]);
        emit NameAndYobOfacRootUpdated(roots[1]);
        emit OfacRootsUpdatedWithProof(myHash, block.timestamp);
    }

    /// @notice (DEV) Force-adds an identity commitment.
    /// @dev Callable only by the owner for testing or administration.
    /// @param attestationId The identifier for the attestation.
    /// @param nullifier The nullifier associated with the identity commitment.
    /// @param commitment The identity commitment to add.
    function devAddIdentityCommitment(
        bytes32 attestationId,
        uint256 nullifier,
        uint256 commitment
    ) external onlyProxy onlyRole(SECURITY_ROLE) {
        _nullifiers[nullifier] = true;
        uint256 imt_root = _identityCommitmentIMT._insert(commitment);
        _rootTimestamps[imt_root] = block.timestamp;
        uint256 index = _identityCommitmentIMT._indexOf(commitment);
        emit DevCommitmentRegistered(attestationId, nullifier, commitment, block.timestamp, imt_root, index);
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
