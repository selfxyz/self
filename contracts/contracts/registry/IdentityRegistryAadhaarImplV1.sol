// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {InternalLeanIMT, LeanIMTData} from "@zk-kit/imt.sol/internal/InternalLeanIMT.sol";
import {IIdentityRegistryAadhaarV1} from "../interfaces/IIdentityRegistryAadhaarV1.sol";
import {ImplRoot} from "../upgradeable/ImplRoot.sol";
import {AttestationId} from "../constants/AttestationId.sol";

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
}

/**
 * @title IdentityRegistryAadhaarImplV1
 * @notice Provides functions to register and manage identity commitments using a Merkle tree structure.
 * @dev Inherits from IdentityRegistryAadhaarStorageV1 and implements IIdentityRegistryAadhaarV1.
 *
 * @custom:version 1.2.0
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

    // ====================================================
    // Modifiers
    // ====================================================

    /// @notice Modifier to restrict access to functions to only the hub.
    modifier onlyHub() {
        if (address(_hub) == address(0)) revert HUB_NOT_SET();
        if (msg.sender != address(_hub)) revert ONLY_HUB_CAN_ACCESS();
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

    // ====================================================
    // External Functions - View & Checks
    // ====================================================

    /// @notice Retrieves the hub address.
    /// @return The current identity verification hub address.
    function hub() external view virtual onlyProxy returns (address) {
        return _hub;
    }

    /// @notice Checks if a specific nullifier is registered for a given attestation.
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

    /// @notice Validates whether the provided OFAC roots match the stored values.
    /// @param nameAndDobRoot The name and date of birth OFAC root to validate.
    /// @param nameAndYobRoot The name and year of birth OFAC root to validate.
    /// @return True if all provided roots match the stored values, false otherwise.
    function checkOfacRoots(
        uint256 nameAndDobRoot,
        uint256 nameAndYobRoot
    ) external view virtual onlyProxy returns (bool) {
        return _nameAndDobOfacRoot == nameAndDobRoot && _nameAndYobOfacRoot == nameAndYobRoot;
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
    // External Functions - Only Owner
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
        _nameAndDobOfacRoot = newNameAndDobOfacRoot;
        emit NameAndDobOfacRootUpdated(newNameAndDobOfacRoot);
    }

    /// @notice Updates the name and year of birth OFAC root.
    /// @dev Callable only via a proxy and restricted to the contract owner.
    /// @param newNameAndYobOfacRoot The new name and year of birth OFAC root value.
    function updateNameAndYobOfacRoot(uint256 newNameAndYobOfacRoot) external onlyProxy onlyRole(OPERATIONS_ROLE) {
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
