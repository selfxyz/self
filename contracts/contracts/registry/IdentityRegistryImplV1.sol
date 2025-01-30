// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import { InternalLeanIMT, LeanIMTData } from "@zk-kit/imt.sol/internal/InternalLeanIMT.sol";
import { InternalBinaryIMT, BinaryIMTData } from "@zk-kit/imt.sol/internal/InternalBinaryIMT.sol";
import "../interfaces/IIdentityRegistryV1.sol";
import "../interfaces/IIdentityVerificationHubV1.sol";
import "../upgradeable/ImplRoot.sol";
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
abstract contract IdentityRegistryStorageV1 is
    ImplRoot
{

    address internal _hub;

    // commitment registry
    LeanIMTData internal _identityCommitmentIMT;

    // timestamp of when the root was created
    mapping(uint256 => uint256) internal _rootTimestamps;
    // attestation id => nullifier => bool
    // attestation id for each identity type
    // passport: 0x12d57183e0a41615471a14e5a93c87b9db757118c1d7a6a9f73106819d656f24
    // poseidon("E-PASSPORT")
    mapping(bytes32 => mapping(uint256 => bool)) internal _nullifiers;

    // dsc key registry
    LeanIMTData internal _dscKeyCommitmentIMT;

    mapping(uint256 => bool) internal _isRegisteredDscKeyCommitment;

    // ofac smt root
    uint256 internal _ofacRoot;
    // csca root
    uint256 internal _cscaRoot;
}

contract IdentityRegistryImplV1 is 
    IdentityRegistryStorageV1,  
    IIdentityRegistryV1 
{
    using InternalLeanIMT for LeanIMTData;

    // Events
    event RegistryInitialized(address hub);
    event HubUpdated(address hub);
    event CscaRootUpdated(uint256 cscaRoot);
    event OfacRootUpdated(uint256 ofacRoot);
    event CommitmentRegistered(bytes32 indexed attestationId, uint256 indexed nullifier, uint256 indexed commitment, uint256 timestamp, uint256 imtRoot, uint256 imtIndex);
    event DscKeyCommitmentRegistered(uint256 indexed commitment, uint256 timestamp, uint256 imtRoot, uint256 imtIndex);
    event DevCommitmentRegistered(bytes32 indexed attestationId, uint256 indexed nullifier, uint256 indexed commitment, uint256 timestamp, uint256 imtRoot, uint256 imtIndex);
    event DevCommitmentUpdated(uint256 indexed oldLeaf, uint256 indexed newLeaf, uint256 imtRoot, uint256 timestamp);
    event DevCommitmentRemoved(uint256 indexed oldLeaf, uint256 imtRoot, uint256 timestamp);
    event DevDscKeyCommitmentRegistered(uint256 indexed commitment, uint256 imtRoot, uint256 imtIndex);
    event DevDscKeyCommitmentUpdated(uint256 indexed oldLeaf, uint256 indexed newLeaf, uint256 imtRoot);
    event DevDscKeyCommitmentRemoved(uint256 indexed oldLeaf, uint256 imtRoot);
    event DevNullifierStateChanged(bytes32 indexed attestationId, uint256 indexed nullifier, bool state);
    event DevDscKeyCommitmentStateChanged(uint256 indexed commitment, bool state);

    // Errors
    error HUB_NOT_SET();
    error ONLY_HUB_CAN_ACCESS();
    error REGISTERED_COMMITMENT();

    // Constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        address _hub
    ) 
        external
        initializer 
    {
        __ImplRoot_init();
        _hub = _hub;
        emit RegistryInitialized(_hub);
    }

    modifier onlyHub() {
        if (address(_hub) == address(0)) revert HUB_NOT_SET();
        if (msg.sender != address(_hub)) revert ONLY_HUB_CAN_ACCESS();
        _;
    }

    ///////////////////////////////////////////////////////////////////
    ///                     EXTERNAL FUNCTIONS                      ///
    ///////////////////////////////////////////////////////////////////

    // view
    // test in unit
    // tested
    function hub() 
        external
        virtual
        onlyProxy
        view 
        returns (address) 
    {
        return _hub;
    }

    // test in integration
    // tested
    function nullifiers(
        bytes32 attestationId,
        uint256 nullifier
    ) 
        external
        virtual
        onlyProxy
        view 
        returns (bool) 
    {
        return _nullifiers[attestationId][nullifier];
    }

    // test in integration
    // tested
    function isRegisteredDscKeyCommitment(
        uint256 commitment
    ) 
        external
        virtual
        onlyProxy
        view 
        returns (bool) 
    {
        return _isRegisteredDscKeyCommitment[commitment];
    }

    // test in integration
    // tested
    function rootTimestamps(
        uint256 root
    ) 
        external
        virtual
        onlyProxy
        view 
        returns (uint256) 
    {
        return _rootTimestamps[root];
    }

    // test in integration
    // tested
    function checkIdentityCommitmentRoot(
        uint256 root
    ) 
        external
        onlyProxy
        view 
        returns (bool) 
    {
        return _rootTimestamps[root] != 0;
    }

    // test in integration
    // tested
    function getIdentityCommitmentMerkleTreeSize() 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return _identityCommitmentIMT.size;
    }

    // test in integration
    // tested
    function getIdentityCommitmentMerkleRoot() 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return _identityCommitmentIMT._root();
    }

    // test in integration
    // tested
    function getIdentityCommitmentIndex(
        uint256 commitment
    ) 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return _identityCommitmentIMT._indexOf(commitment);
    }

    // test in unit
    // tested
    function getOfacRoot() 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return _ofacRoot;
    }

    // test in unit
    // tested
    function checkOfacRoot(
        uint256 root
    ) 
        external
        onlyProxy
        view 
        returns (bool) 
    {
        return _ofacRoot == root;
    }

    // test in unit
    // tested
    function getCscaRoot() 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return _cscaRoot;
    }

    // test in unit
    // tested
    function checkCscaRoot(
        uint256 root
    ) 
        external
        onlyProxy
        view 
        returns (bool) 
    {
        return _cscaRoot == root;
    }

    // test in integration
    function getDscKeyCommitmentMerkleRoot() 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return _dscKeyCommitmentIMT._root();
    }

    // test in integration
    function checkDscKeyCommitmentMerkleRoot(
        uint256 root
    ) 
        external
        onlyProxy
        view 
        returns (bool) 
    {
        return _dscKeyCommitmentIMT._root() == root;
    }

    // test in integration
    function getDscKeyCommitmentTreeSize() 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return _dscKeyCommitmentIMT.size;
    }

    function getDscKeyCommitmentIndex(
        uint256 commitment
    )
        external
        onlyProxy
        view
        returns (uint256)
    {
        return _dscKeyCommitmentIMT._indexOf(commitment);
    }

    // register
    function registerCommitment(
        bytes32 attestationId,
        uint256 nullifier,
        uint256 commitment
    ) 
        external
        onlyProxy
        onlyHub
    {
        if (_nullifiers[attestationId][nullifier]) revert REGISTERED_COMMITMENT();

        _nullifiers[attestationId][nullifier] = true;
        uint256 index = _identityCommitmentIMT.size;
        uint256 imt_root = _addCommitment(_identityCommitmentIMT, commitment);
        _rootTimestamps[imt_root] = block.timestamp;
        emit CommitmentRegistered(attestationId, nullifier, commitment, block.timestamp, imt_root, index);
    }

    function registerDscKeyCommitment(
        uint256 dscCommitment
    )
        external
        onlyProxy
        onlyHub
    {
        if (_isRegisteredDscKeyCommitment[dscCommitment]) revert REGISTERED_COMMITMENT();

        _isRegisteredDscKeyCommitment[dscCommitment] = true;
        uint256 index = _dscKeyCommitmentIMT.size;
        uint256 imt_root = _addCommitment(_dscKeyCommitmentIMT, dscCommitment);
        emit DscKeyCommitmentRegistered(dscCommitment, block.timestamp, imt_root, index);
    }
    
    // onlyOwner
    // tested
    function updateHub(
        address newHubAddress
    )
        external
        onlyProxy
        onlyOwner 
    { 
        _hub = newHubAddress;
        emit HubUpdated(newHubAddress);
    }

    // tested
    function updateOfacRoot(
        uint256 newOfacRoot
    ) 
        external
        onlyProxy
        onlyOwner 
    {
        _ofacRoot = newOfacRoot;
        emit OfacRootUpdated(newOfacRoot);
    }

    // tested
    function updateCscaRoot(
        uint256 newCscaRoot
    ) 
        external
        onlyProxy
        onlyOwner 
    {
        _cscaRoot = newCscaRoot;
        emit CscaRootUpdated(newCscaRoot);
    }

    // tested
    function devAddIdentityCommitment(
        bytes32 attestationId,
        uint256 nullifier,
        uint256 commitment
    ) 
        external 
        onlyProxy
        onlyOwner 
    {
        _nullifiers[attestationId][nullifier] = true;
        uint256 imt_root = _addCommitment(_identityCommitmentIMT, commitment);
        _rootTimestamps[imt_root] = block.timestamp;
        uint256 index = _identityCommitmentIMT._indexOf(commitment);
        emit DevCommitmentRegistered(attestationId, nullifier, commitment, block.timestamp, imt_root, index);
    }

    // tested
    function devUpdateCommitment(
        uint256 oldLeaf,
        uint256 newLeaf,
        uint256[] calldata siblingNodes
    )
        external
        onlyProxy
        onlyOwner
    {
        uint256 imt_root = _updateCommitment(_identityCommitmentIMT, oldLeaf, newLeaf, siblingNodes);
        _rootTimestamps[imt_root] = block.timestamp;
        emit DevCommitmentUpdated(oldLeaf, newLeaf, imt_root, block.timestamp);
    }

    // tested
    function devRemoveCommitment(
        uint256 oldLeaf,
        uint256[] calldata siblingNodes
    )
        external
        onlyProxy
        onlyOwner
    {
        uint256 imt_root = _removeCommitment(_identityCommitmentIMT, oldLeaf, siblingNodes);
        _rootTimestamps[imt_root] = block.timestamp;
        emit DevCommitmentRemoved(oldLeaf, imt_root, block.timestamp);
    }
    
    // Will add dsc key commitment manager functions for dev
    function devAddDscKeyCommitment(
        uint256 dscCommitment
    )
        external
        onlyProxy
        onlyOwner
    {
        _isRegisteredDscKeyCommitment[dscCommitment] = true;
        uint256 imt_root = _addCommitment(_dscKeyCommitmentIMT, dscCommitment);
        uint256 index = _dscKeyCommitmentIMT._indexOf(dscCommitment);
        emit DevDscKeyCommitmentRegistered(dscCommitment, imt_root, index);
    }

    function devUpdateDscKeyCommitment(
        uint256 oldLeaf,
        uint256 newLeaf,
        uint256[] calldata siblingNodes
    )
        external
        onlyProxy
        onlyOwner
    {
        uint256 imt_root = _updateCommitment(_dscKeyCommitmentIMT, oldLeaf, newLeaf, siblingNodes);
        emit DevDscKeyCommitmentUpdated(oldLeaf, newLeaf, imt_root);
    }

    function devRemoveDscKeyCommitment(
        uint256 oldLeaf,
        uint256[] calldata siblingNodes
    )
        external
        onlyProxy
        onlyOwner
    {
        uint256 imt_root = _removeCommitment(_dscKeyCommitmentIMT, oldLeaf, siblingNodes);
        emit DevDscKeyCommitmentRemoved(oldLeaf, imt_root);
    }

    // tested
    function devChangeNullifierState(
        bytes32 attestationId,
        uint256 nullifier,
        bool state
    ) 
        external
        onlyProxy
        onlyOwner
    {
        _nullifiers[attestationId][nullifier] = state;
        emit DevNullifierStateChanged(attestationId, nullifier, state);
    }

    // tested
    function devChangeDscKeyCommitmentState(
        uint256 dscCommitment,
        bool state
    )
        external
        onlyProxy
        onlyOwner
    {
        _isRegisteredDscKeyCommitment[dscCommitment] = state;
        emit DevDscKeyCommitmentStateChanged(dscCommitment, state);
    }

    ///////////////////////////////////////////////////////////////////
    ///                     INTERNAL FUNCTIONS                      ///
    ///////////////////////////////////////////////////////////////////
    
    function _addCommitment(
        LeanIMTData storage imt,
        uint256 commitment
    ) 
        internal
        returns(uint256 imt_root)
    {
        imt_root = imt._insert(commitment);
    }

    function _updateCommitment(
        LeanIMTData storage imt,
        uint256 oldLeaf,
        uint256 newLeaf,
        uint256[] calldata siblingNodes
    )
        internal
        returns(uint256 imt_root)
    {
        imt_root = imt._update(oldLeaf, newLeaf, siblingNodes);
    }

    function _removeCommitment(
        LeanIMTData storage imt,
        uint256 oldLeaf,
        uint256[] calldata siblingNodes
    )
        internal
        returns(uint256 imt_root)
    {
        imt_root = imt._remove(oldLeaf, siblingNodes);
    }
}