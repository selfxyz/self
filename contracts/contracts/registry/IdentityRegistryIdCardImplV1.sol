// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {InternalLeanIMT, LeanIMTData} from "@zk-kit/imt.sol/internal/InternalLeanIMT.sol";
import {IIdentityRegistryIdCardV1} from "../interfaces/IIdentityRegistryIdCardV1.sol";
import {ImplRoot} from "../upgradeable/ImplRoot.sol";

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
 * @title IdentityRegistryStorageV1
 * @dev Abstract contract for storage layout of IdentityRegistryImplV1.
 * Inherits from ImplRoot to provide upgradeable functionality.
 */
abstract contract IdentityRegistryIdCardStorageV1 is ImplRoot {
    // ====================================================
    // Storage Variables
    // ====================================================

    /// @notice Address of the identity verification hub.
    address internal _hub;

    /// @notice Merkle tree data structure for identity commitments.
    LeanIMTData internal _identityCommitmentIMT;

    /// @notice Mapping from Merkle tree root to its creation timestamp.
    mapping(uint256 => uint256) internal _rootTimestamps;

    /// @notice Mapping from attestation ID and nullifier to a boolean indicating registration.
    /// @dev Example: For passport, the attestation id is 1.
    mapping(bytes32 => mapping(uint256 => bool)) internal _nullifiers;

    /// @notice Merkle tree data structure for DSC key commitments.
    LeanIMTData internal _dscKeyCommitmentIMT;

    /// @notice Mapping to determine if a DSC key commitment is registered.
    mapping(uint256 => bool) internal _isRegisteredDscKeyCommitment;

    /// @notice Current name and date of birth OFAC root.
    uint256 internal _nameAndDobOfacRoot;

    /// @notice Current name and year of birth OFAC root.
    uint256 internal _nameAndYobOfacRoot;

    /// @notice Current CSCA root.
    uint256 internal _cscaRoot;
}

/**
 * @title IdentityRegistryImplV1
 * @notice Provides functions to register and manage identity commitments using a Merkle tree structure.
 * @dev Inherits from IdentityRegistryStorageV1 and implements IIdentityRegistryV1.
 *
 * @custom:version 1.2.0
 */
contract IdentityRegistryIdCardImplV1 is IdentityRegistryIdCardStorageV1, IIdentityRegistryIdCardV1 {
    using InternalLeanIMT for LeanIMTData;

    // ====================================================
    // Events
    // ====================================================

    /// @notice Emitted when the registry is initialized.
    event RegistryInitialized(address hub);
    /// @notice Emitted when the hub address is updated.
    event HubUpdated(address hub);
    /// @notice Emitted when the CSCA root is updated.
    event CscaRootUpdated(uint256 cscaRoot);
    /// @notice Emitted when the name and date of birth OFAC root is updated.
    event NameAndDobOfacRootUpdated(uint256 nameAndDobOfacRoot);
    /// @notice Emitted when the name and year of birth OFAC root is updated.
    event NameAndYobOfacRootUpdated(uint256 nameAndYobOfacRoot);
    /// @notice Emitted when an identity commitment is successfully registered.
    event CommitmentRegistered(
        bytes32 indexed attestationId,
        uint256 indexed nullifier,
        uint256 indexed commitment,
        uint256 timestamp,
        uint256 imtRoot,
        uint256 imtIndex
    );
    /// @notice Emitted when a DSC key commitment is successfully registered.
    event DscKeyCommitmentRegistered(uint256 indexed commitment, uint256 timestamp, uint256 imtRoot, uint256 imtIndex);
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
    /// @notice Emitted when a DSC key commitment is added by dev team.
    event DevDscKeyCommitmentRegistered(uint256 indexed commitment, uint256 imtRoot, uint256 imtIndex);
    /// @notice Emitted when a DSC key commitment is updated by dev team.
    event DevDscKeyCommitmentUpdated(uint256 indexed oldLeaf, uint256 indexed newLeaf, uint256 imtRoot);
    /// @notice Emitted when a DSC key commitment is removed by dev team.
    event DevDscKeyCommitmentRemoved(uint256 indexed oldLeaf, uint256 imtRoot);
    /// @notice Emitted when the state of a nullifier is changed by dev team.
    event DevNullifierStateChanged(bytes32 indexed attestationId, uint256 indexed nullifier, bool state);
    /// @notice Emitted when the state of a DSC key commitment is changed by dev team.
    event DevDscKeyCommitmentStateChanged(uint256 indexed commitment, bool state);

    // ====================================================
    // Errors
    // ====================================================

    /// @notice Thrown when the hub is not set.
    error HUB_NOT_SET();
    /// @notice Thrown when a function is accessed by an address other than the designated hub.
    error ONLY_HUB_CAN_ACCESS();
    /// @notice Thrown when attempting to register a commitment that has already been registered.
    error REGISTERED_COMMITMENT();

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

    // ====================================================
    // Constructor
    // ====================================================

    /**
     * @notice Constructor that disables initializers.
     * @dev Prevents direct initialization of the implementation contract.
     * @custom:oz-upgrades-unsafe-allow constructor
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
     * @param _hub The address of the identity verification hub.
     */
    function initialize(address _hub) external initializer {
        __ImplRoot_init();
        _hub = _hub;
        emit RegistryInitialized(_hub);
    }

    /**
     * @notice Initializes governance for upgraded contracts.
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

    /**
     * @notice Retrieves the hub address.
     * @return The current identity verification hub address.
     */
    function hub() external view virtual onlyProxy returns (address) {
        return _hub;
    }

    /**
     * @notice Checks if a specific nullifier is registered for a given attestation.
     * @param attestationId The attestation identifier.
     * @param nullifier The nullifier to be checked.
     * @return True if the nullifier has been registered, false otherwise.
     */
    function nullifiers(bytes32 attestationId, uint256 nullifier) external view virtual onlyProxy returns (bool) {
        return _nullifiers[attestationId][nullifier];
    }

    /**
     * @notice Checks if a DSC key commitment is registered.
     * @param commitment The DSC key commitment.
     * @return True if the DSC key commitment is registered, false otherwise.
     */
    function isRegisteredDscKeyCommitment(uint256 commitment) external view virtual onlyProxy returns (bool) {
        return _isRegisteredDscKeyCommitment[commitment];
    }

    /**
     * @notice Retrieves the timestamp when a specific Merkle root was created.
     * @param root The Merkle tree root.
     * @return The timestamp corresponding to the given root.
     */
    function rootTimestamps(uint256 root) external view virtual onlyProxy returns (uint256) {
        return _rootTimestamps[root];
    }

    /**
     * @notice Checks if the identity commitment Merkle tree contains the provided root.
     * @param root The Merkle tree root.
     * @return True if the root exists, false otherwise.
     */
    function checkIdentityCommitmentRoot(uint256 root) external view onlyProxy returns (bool) {
        return _rootTimestamps[root] != 0;
    }

    /**
     * @notice Retrieves the number of identity commitments in the Merkle tree.
     * @return The size of the identity commitment Merkle tree.
     */
    function getIdentityCommitmentMerkleTreeSize() external view onlyProxy returns (uint256) {
        return _identityCommitmentIMT.size;
    }

    /**
     * @notice Retrieves the current Merkle root of the identity commitments.
     * @return The current identity commitment Merkle root.
     */
    function getIdentityCommitmentMerkleRoot() external view onlyProxy returns (uint256) {
        return _identityCommitmentIMT._root();
    }

    /**
     * @notice Retrieves the index of a specific identity commitment in the Merkle tree.
     * @param commitment The identity commitment to locate.
     * @return The index of the provided commitment within the Merkle tree.
     */
    function getIdentityCommitmentIndex(uint256 commitment) external view onlyProxy returns (uint256) {
        return _identityCommitmentIMT._indexOf(commitment);
    }

    /**
     * @notice Retrieves the current name and date of birth OFAC root.
     * @return The stored name and date of birth OFAC root.
     */
    function getNameAndDobOfacRoot() external view onlyProxy returns (uint256) {
        return _nameAndDobOfacRoot;
    }

    /**
     * @notice Retrieves the current name and year of birth OFAC root.
     * @return The stored name and year of birth OFAC root.
     */
    function getNameAndYobOfacRoot() external view onlyProxy returns (uint256) {
        return _nameAndYobOfacRoot;
    }

    /**
     * @notice Validates whether the provided OFAC roots match the stored values.
     * @param nameAndDobRoot The name and date of birth OFAC root to validate.
     * @param nameAndYobRoot The name and year of birth OFAC root to validate.
     * @return True if all provided roots match the stored values, false otherwise.
     */
    function checkOfacRoots(uint256 nameAndDobRoot, uint256 nameAndYobRoot) external view onlyProxy returns (bool) {
        return _nameAndDobOfacRoot == nameAndDobRoot && _nameAndYobOfacRoot == nameAndYobRoot;
    }

    /**
     * @notice Retrieves the current CSCA root.
     * @return The stored CSCA root.
     */
    function getCscaRoot() external view onlyProxy returns (uint256) {
        return _cscaRoot;
    }

    /**
     * @notice Validates whether the provided CSCA root matches the stored value.
     * @param root The CSCA root to validate.
     * @return True if the provided root is equal to the stored CSCA root, false otherwise.
     */
    function checkCscaRoot(uint256 root) external view onlyProxy returns (bool) {
        return _cscaRoot == root;
    }

    /**
     * @notice Retrieves the current Merkle root of the DSC key commitments.
     * @return The current DSC key commitment Merkle root.
     */
    function getDscKeyCommitmentMerkleRoot() external view onlyProxy returns (uint256) {
        return _dscKeyCommitmentIMT._root();
    }

    /**
     * @notice Validates whether the provided root matches the DSC key commitment Merkle root.
     * @param root The root to validate.
     * @return True if the roots match, false otherwise.
     */
    function checkDscKeyCommitmentMerkleRoot(uint256 root) external view onlyProxy returns (bool) {
        return _dscKeyCommitmentIMT._root() == root;
    }

    /**
     * @notice Retrieves the number of DSC key commitments in the Merkle tree.
     * @return The DSC key commitment Merkle tree size.
     */
    function getDscKeyCommitmentTreeSize() external view onlyProxy returns (uint256) {
        return _dscKeyCommitmentIMT.size;
    }

    /**
     * @notice Retrieves the index of a specific DSC key commitment in the Merkle tree.
     * @param commitment The DSC key commitment to locate.
     * @return The index of the provided commitment within the DSC key commitment Merkle tree.
     */
    function getDscKeyCommitmentIndex(uint256 commitment) external view onlyProxy returns (uint256) {
        return _dscKeyCommitmentIMT._indexOf(commitment);
    }

    // ====================================================
    // External Functions - Registration
    // ====================================================

    /**
     * @notice Registers a new identity commitment.
     * @dev Caller must be the hub. Reverts if the nullifier is already registered.
     * @param attestationId The identifier for the attestation.
     * @param nullifier The nullifier associated with the identity commitment.
     * @param commitment The identity commitment to register.
     */
    function registerCommitment(
        bytes32 attestationId,
        uint256 nullifier,
        uint256 commitment
    ) external onlyProxy onlyHub {
        if (_nullifiers[attestationId][nullifier]) revert REGISTERED_COMMITMENT();

        _nullifiers[attestationId][nullifier] = true;
        uint256 index = _identityCommitmentIMT.size;
        uint256 imt_root = _addCommitment(_identityCommitmentIMT, commitment);
        _rootTimestamps[imt_root] = block.timestamp;
        emit CommitmentRegistered(attestationId, nullifier, commitment, block.timestamp, imt_root, index);
    }

    /**
     * @notice Registers a new DSC key commitment.
     * @dev Caller must be the hub. Reverts if the commitment has already been registered.
     * @param dscCommitment The DSC key commitment to register.
     */
    function registerDscKeyCommitment(uint256 dscCommitment) external onlyProxy onlyHub {
        if (_isRegisteredDscKeyCommitment[dscCommitment]) revert REGISTERED_COMMITMENT();

        _isRegisteredDscKeyCommitment[dscCommitment] = true;
        uint256 index = _dscKeyCommitmentIMT.size;
        uint256 imt_root = _addCommitment(_dscKeyCommitmentIMT, dscCommitment);
        emit DscKeyCommitmentRegistered(dscCommitment, block.timestamp, imt_root, index);
    }

    // ====================================================
    // External Functions - Only Owner
    // ====================================================

    /**
     * @notice Updates the hub address.
     * @dev Callable only via a proxy and restricted to the contract owner.
     * @param newHubAddress The new address of the hub.
     */
    function updateHub(address newHubAddress) external onlyProxy onlyRole(SECURITY_ROLE) {
        _hub = newHubAddress;
        emit HubUpdated(newHubAddress);
    }

    /**
     * @notice Updates the name and date of birth OFAC root.
     * @dev Callable only via a proxy and restricted to the contract owner.
     * @param newNameAndDobOfacRoot The new name and date of birth OFAC root value.
     */
    function updateNameAndDobOfacRoot(uint256 newNameAndDobOfacRoot) external onlyProxy onlyRole(OPERATIONS_ROLE) {
        _nameAndDobOfacRoot = newNameAndDobOfacRoot;
        emit NameAndDobOfacRootUpdated(newNameAndDobOfacRoot);
    }

    /**
     * @notice Updates the name and year of birth OFAC root.
     * @dev Callable only via a proxy and restricted to the contract owner.
     * @param newNameAndYobOfacRoot The new name and year of birth OFAC root value.
     */
    function updateNameAndYobOfacRoot(uint256 newNameAndYobOfacRoot) external onlyProxy onlyRole(OPERATIONS_ROLE) {
        _nameAndYobOfacRoot = newNameAndYobOfacRoot;
        emit NameAndYobOfacRootUpdated(newNameAndYobOfacRoot);
    }

    /**
     * @notice Updates the CSCA root.
     * @dev Callable only via a proxy and restricted to the contract owner.
     * @param newCscaRoot The new CSCA root value.
     */
    function updateCscaRoot(uint256 newCscaRoot) external onlyProxy onlyRole(OPERATIONS_ROLE) {
        _cscaRoot = newCscaRoot;
        emit CscaRootUpdated(newCscaRoot);
    }

    /**
     * @notice (DEV) Force-adds an identity commitment.
     * @dev Callable only by the owner for testing or administration.
     * @param attestationId The identifier for the attestation.
     * @param nullifier The nullifier associated with the identity commitment.
     * @param commitment The identity commitment to add.
     */
    function devAddIdentityCommitment(
        bytes32 attestationId,
        uint256 nullifier,
        uint256 commitment
    ) external onlyProxy onlyRole(SECURITY_ROLE) {
        _nullifiers[attestationId][nullifier] = true;
        uint256 imt_root = _addCommitment(_identityCommitmentIMT, commitment);
        _rootTimestamps[imt_root] = block.timestamp;
        uint256 index = _identityCommitmentIMT._indexOf(commitment);
        emit DevCommitmentRegistered(attestationId, nullifier, commitment, block.timestamp, imt_root, index);
    }

    /**
     * @notice (DEV) Updates an existing identity commitment.
     * @dev Caller must be the owner. Provides sibling nodes for proof of position.
     * @param oldLeaf The current identity commitment to update.
     * @param newLeaf The new identity commitment.
     * @param siblingNodes An array of sibling nodes for Merkle proof generation.
     */
    function devUpdateCommitment(
        uint256 oldLeaf,
        uint256 newLeaf,
        uint256[] calldata siblingNodes
    ) external onlyProxy onlyRole(SECURITY_ROLE) {
        uint256 imt_root = _updateCommitment(_identityCommitmentIMT, oldLeaf, newLeaf, siblingNodes);
        _rootTimestamps[imt_root] = block.timestamp;
        emit DevCommitmentUpdated(oldLeaf, newLeaf, imt_root, block.timestamp);
    }

    /**
     * @notice (DEV) Removes an existing identity commitment.
     * @dev Caller must be the owner. Provides sibling nodes for proof of position.
     * @param oldLeaf The identity commitment to remove.
     * @param siblingNodes An array of sibling nodes for Merkle proof generation.
     */
    function devRemoveCommitment(
        uint256 oldLeaf,
        uint256[] calldata siblingNodes
    ) external onlyProxy onlyRole(SECURITY_ROLE) {
        uint256 imt_root = _removeCommitment(_identityCommitmentIMT, oldLeaf, siblingNodes);
        _rootTimestamps[imt_root] = block.timestamp;
        emit DevCommitmentRemoved(oldLeaf, imt_root, block.timestamp);
    }

    /**
     * @notice (DEV) Force-adds a DSC key commitment.
     * @dev Callable only by the owner for testing or administration.
     * @param dscCommitment The DSC key commitment to add.
     */
    function devAddDscKeyCommitment(uint256 dscCommitment) external onlyProxy onlyRole(SECURITY_ROLE) {
        _isRegisteredDscKeyCommitment[dscCommitment] = true;
        uint256 imt_root = _addCommitment(_dscKeyCommitmentIMT, dscCommitment);
        uint256 index = _dscKeyCommitmentIMT._indexOf(dscCommitment);
        emit DevDscKeyCommitmentRegistered(dscCommitment, imt_root, index);
    }

    /**
     * @notice (DEV) Updates an existing DSC key commitment.
     * @dev Caller must be the owner. Provides sibling nodes for proof of position.
     * @param oldLeaf The current DSC key commitment to update.
     * @param newLeaf The new DSC key commitment.
     * @param siblingNodes An array of sibling nodes for Merkle proof generation.
     */
    function devUpdateDscKeyCommitment(
        uint256 oldLeaf,
        uint256 newLeaf,
        uint256[] calldata siblingNodes
    ) external onlyProxy onlyRole(SECURITY_ROLE) {
        uint256 imt_root = _updateCommitment(_dscKeyCommitmentIMT, oldLeaf, newLeaf, siblingNodes);
        emit DevDscKeyCommitmentUpdated(oldLeaf, newLeaf, imt_root);
    }

    /**
     * @notice (DEV) Removes an existing DSC key commitment.
     * @dev Caller must be the owner. Provides sibling nodes for proof of position.
     * @param oldLeaf The DSC key commitment to remove.
     * @param siblingNodes An array of sibling nodes for Merkle proof generation.
     */
    function devRemoveDscKeyCommitment(
        uint256 oldLeaf,
        uint256[] calldata siblingNodes
    ) external onlyProxy onlyRole(SECURITY_ROLE) {
        uint256 imt_root = _removeCommitment(_dscKeyCommitmentIMT, oldLeaf, siblingNodes);
        emit DevDscKeyCommitmentRemoved(oldLeaf, imt_root);
    }

    /**
     * @notice (DEV) Changes the state of a nullifier.
     * @dev Callable only by the owner.
     * @param attestationId The attestation identifier.
     * @param nullifier The nullifier whose state is to be updated.
     * @param state The new state of the nullifier (true for registered, false for not registered).
     */
    function devChangeNullifierState(
        bytes32 attestationId,
        uint256 nullifier,
        bool state
    ) external onlyProxy onlyRole(SECURITY_ROLE) {
        _nullifiers[attestationId][nullifier] = state;
        emit DevNullifierStateChanged(attestationId, nullifier, state);
    }

    /**
     * @notice (DEV) Changes the registration state of a DSC key commitment.
     * @dev Callable only by the owner.
     * @param dscCommitment The DSC key commitment.
     * @param state The new state of the DSC key commitment (true for registered, false for not registered).
     */
    function devChangeDscKeyCommitmentState(
        uint256 dscCommitment,
        bool state
    ) external onlyProxy onlyRole(SECURITY_ROLE) {
        _isRegisteredDscKeyCommitment[dscCommitment] = state;
        emit DevDscKeyCommitmentStateChanged(dscCommitment, state);
    }

    // ====================================================
    // Internal Functions
    // ====================================================

    /**
     * @notice Adds a commitment to the specified Merkle tree.
     * @dev Inserts the commitment using the provided Merkle tree structure.
     * @param imt The Merkle tree data structure.
     * @param commitment The commitment to add.
     * @return imt_root The new Merkle tree root after insertion.
     */
    function _addCommitment(LeanIMTData storage imt, uint256 commitment) internal returns (uint256 imt_root) {
        imt_root = imt._insert(commitment);
    }

    /**
     * @notice Updates an existing commitment in the specified Merkle tree.
     * @dev Uses sibling nodes to prove the commitment's position and update it.
     * @param imt The Merkle tree data structure.
     * @param oldLeaf The current commitment to update.
     * @param newLeaf The new commitment.
     * @param siblingNodes An array of sibling nodes for generating a valid proof.
     * @return imt_root The new Merkle tree root after update.
     */
    function _updateCommitment(
        LeanIMTData storage imt,
        uint256 oldLeaf,
        uint256 newLeaf,
        uint256[] calldata siblingNodes
    ) internal returns (uint256 imt_root) {
        imt_root = imt._update(oldLeaf, newLeaf, siblingNodes);
    }

    /**
     * @notice Removes a commitment from the specified Merkle tree.
     * @dev Uses sibling nodes to prove the commitment's position before removal.
     * @param imt The Merkle tree data structure.
     * @param oldLeaf The commitment to remove.
     * @param siblingNodes An array of sibling nodes for generating a valid proof.
     * @return imt_root The new Merkle tree root after removal.
     */
    function _removeCommitment(
        LeanIMTData storage imt,
        uint256 oldLeaf,
        uint256[] calldata siblingNodes
    ) internal returns (uint256 imt_root) {
        imt_root = imt._remove(oldLeaf, siblingNodes);
    }
}
