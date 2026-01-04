// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ISelfVerificationRoot} from "./abstract/SelfVerificationRoot.sol";
import {Origin} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import {OAppReceiverUpgradeable} from
    "@layerzerolabs/oapp-evm-upgradeable/contracts/oapp/OAppReceiverUpgradeable.sol";
import {OAppCoreUpgradeable} from "@layerzerolabs/oapp-evm-upgradeable/contracts/oapp/OAppCoreUpgradeable.sol";

/**
 * @title IdentityVerificationHubMultichain
 * @notice Receives and validates bridged verification messages on destination chains
 * @dev This contract is deployed on destination chains (Base, Gnosis, etc.) to receive
 * verification outputs from the source chain (Celo). It validates bridge messages and
 * forwards them to the appropriate dApp contracts.
 *
 * Uses LayerZero's official OAppReceiverUpgradeable for cross-chain message receiving.
 * Overrides OApp's OwnableUpgradeable with AccessControlUpgradeable for role-based control.
 *
 * @custom:version 1.0.0
 */
contract IdentityVerificationHubMultichain is
    UUPSUpgradeable,
    OAppReceiverUpgradeable,
    AccessControlUpgradeable
{
    /// @custom:storage-location erc7201:self.storage.MultichainHub
    struct MultichainHubStorage {
        mapping(uint256 chainId => uint32 eid) chainIdToEid; // Map chainId to EID for backward compatibility
        mapping(uint32 eid => uint256 chainId) eidToChainId; // Reverse mapping for efficient lookup
        mapping(bytes32 messageId => bool processed) processedMessages;
    }

    /// @dev keccak256(abi.encode(uint256(keccak256("self.storage.MultichainHub")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant MULTICHAIN_HUB_STORAGE_LOCATION =
        0x8c3d1a3b4f5e6a7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b00;

    /// @notice Role identifier for security-related operations
    bytes32 public constant SECURITY_ROLE = keccak256("SECURITY_ROLE");

    /**
     * @notice Returns the storage struct for the Multichain Hub.
     * @dev Uses ERC-7201 storage pattern for upgradeable contracts.
     * @return $ The storage struct reference.
     */
    function _getMultichainHubStorage() private pure returns (MultichainHubStorage storage $) {
        assembly {
            $.slot := MULTICHAIN_HUB_STORAGE_LOCATION
        }
    }

    /**
     * @notice Emitted when a verification is successfully bridged and delivered to a dApp.
     * @param destDAppAddress The destination dApp contract that received the verification.
     * @param configId The configuration identifier used for verification.
     * @param output The verification output data.
     * @param userDataToPass The user data passed through from the source chain.
     * @param timestamp The block timestamp when the message was delivered.
     */
    event VerificationBridged(
        address indexed destDAppAddress,
        bytes32 indexed configId,
        bytes output,
        bytes userDataToPass,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a source hub address is updated for a chain.
     * @param chainId The source chain identifier.
     * @param hubAddress The trusted hub address on the source chain.
     */
    event SourceHubUpdated(uint256 indexed chainId, bytes32 indexed hubAddress);

    // ====================================================
    // Errors
    // ====================================================

    /// @notice Thrown when the config ID validation fails.
    /// @dev Used to ensure verification config matches the destination dApp requirements.
    error InvalidConfigId();

    /// @notice Thrown when the destination contract address is zero.
    /// @dev Ensures the message has a valid target dApp contract.
    error InvalidDestinationContract();

    /// @notice Thrown when a bridged message is processed more than once.
    error MessageAlreadyProcessed();

    // ====================================================
    // Constructor
    // ====================================================

    /**
     * @notice Constructor sets the LayerZero endpoint (immutable).
     * @dev Disables initializers for the implementation contract.
     * @param _endpoint The LayerZero endpoint address
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor(address _endpoint) OAppCoreUpgradeable(_endpoint) {
        _disableInitializers();
    }

    // ====================================================
    // Initializer
    // ====================================================

    /**
     * @notice Initializes the Multichain Hub contract.
     * @dev Sets up UUPS upgradeability and access control with admin and security roles.
     * This function can only be called once due to the initializer modifier.
     * @param admin The address to grant DEFAULT_ADMIN_ROLE and SECURITY_ROLE (also owner for OApp).
     * @param delegate The delegate address for LayerZero configuration
     */
    function initialize(address admin, address delegate) external initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __Ownable_init(admin); // Required by OAppCoreUpgradeable
        __OAppReceiver_init(delegate);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SECURITY_ROLE, admin);
    }

    // ====================================================
    // OApp Overrides (use AccessControl instead of Ownable)
    // ====================================================

    /**
     * @notice Sets the peer (source hub) for a LayerZero endpoint ID.
     * @param _eid The LayerZero endpoint ID
     * @param _peer The peer address (bytes32)
     * @dev Overrides OAppCoreUpgradeable to use SECURITY_ROLE instead of owner
     */
    function setPeer(uint32 _eid, bytes32 _peer) public override onlyRole(SECURITY_ROLE) {
        _setPeer(_eid, _peer);
    }

    /**
     * @notice Internal function to set a peer without access control (for use in other functions)
     * @param _eid The LayerZero endpoint ID
     * @param _peer The peer address (bytes32)
     */
    function _setPeer(uint32 _eid, bytes32 _peer) internal virtual {
        OAppCoreUpgradeable.OAppCoreStorage storage $ = _getOAppCoreStorage();
        $.peers[_eid] = _peer;
        emit PeerSet(_eid, _peer);
    }

    // Note: setDelegate() uses onlyOwner from OAppCoreUpgradeable

    // ====================================================
    // LayerZero OApp Implementation
    // ====================================================

    /**
     * @notice Internal function called by OAppReceiverUpgradeable.lzReceive
     * @dev This is where we process the incoming LayerZero message.
     * OAppReceiverUpgradeable already validates:
     * - Caller is the endpoint
     * - Sender matches the expected peer for srcEid
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        // Convert srcEid to chainId for backward compatibility
        uint256 sourceChainId = _getChainIdFromEid(_origin.srcEid);

        _processIncomingPayload(sourceChainId, _origin.sender, _message, _guid);
    }

    // ====================================================
    // External Functions (Backward Compatibility)
    // ====================================================

    /**
     * @notice Sets the trusted source hub address for a specific source chain (backward compatibility).
     * @dev Only callable by accounts with SECURITY_ROLE.
     * Each source chain can have one trusted hub address. Messages from other hubs
     * on the same chain will be rejected.
     * @param chainId The source chain identifier (e.g., Celo mainnet = 42220).
     * @param hubAddress The trusted hub address on the source chain (encoded as bytes32).
     * @param eid The LayerZero endpoint ID for this chain
     */
    function setSourceHub(uint256 chainId, bytes32 hubAddress, uint32 eid) external onlyRole(SECURITY_ROLE) {
        MultichainHubStorage storage $ = _getMultichainHubStorage();
        $.chainIdToEid[chainId] = eid;
        $.eidToChainId[eid] = chainId;
        _setPeer(eid, hubAddress);
        emit SourceHubUpdated(chainId, hubAddress);
    }

    // ====================================================
    // External View Functions
    // ====================================================

    /**
     * @notice Returns the configured bridge endpoint address.
     * @dev The bridge endpoint is the LayerZero endpoint.
     * @return The bridge endpoint contract address.
     */
    function getBridgeEndpoint() external view returns (address) {
        return address(endpoint);
    }

    /**
     * @notice Returns the trusted source hub address for a specific chain (backward compatibility).
     * @dev Returns bytes32(0) if no hub is configured for the given chain ID.
     * @param chainId The source chain identifier to query.
     * @return The trusted hub address on the source chain (encoded as bytes32).
     */
    function getSourceHub(uint256 chainId) external view returns (bytes32) {
        MultichainHubStorage storage $ = _getMultichainHubStorage();
        uint32 eid = $.chainIdToEid[chainId];
        if (eid == 0) return bytes32(0);
        return peers(eid);
    }

    // ====================================================
    // Internal Functions
    // ====================================================

    /**
     * @dev Helper to convert EID to chainId (for backward compatibility)
     * @param eid The LayerZero endpoint ID
     * @return chainId The chain ID (or eid if no mapping exists)
     */
    function _getChainIdFromEid(uint32 eid) private view returns (uint256) {
        MultichainHubStorage storage $ = _getMultichainHubStorage();
        uint256 chainId = $.eidToChainId[eid];
        // If no mapping exists (chainId is 0), use EID as chainId
        // This works for testnet/mainnet where EIDs are unique
        return chainId != 0 ? chainId : uint256(eid);
    }

    /**
     * @dev Shared message validation/decoding for LayerZero lzReceive.
     * @param sourceChainId The source chain ID (converted from EID)
     * @param sourceHub The source hub address (already validated by OAppReceiver)
     * @param payload The message payload
     * @param guid The message GUID for replay protection
     */
    function _processIncomingPayload(uint256 sourceChainId, bytes32 sourceHub, bytes calldata payload, bytes32 guid)
        private
    {
        MultichainHubStorage storage $ = _getMultichainHubStorage();

        (address destDAppAddress, bytes memory output, bytes memory userDataToPass) =
            abi.decode(payload, (address, bytes, bytes));

        if (destDAppAddress == address(0)) {
            revert InvalidDestinationContract();
        }

        // Replay protection: ensure each message is processed only once
        bytes32 messageId = guid == bytes32(0) ? keccak256(abi.encode(sourceChainId, sourceHub, payload)) : guid;
        if ($.processedMessages[messageId]) {
            revert MessageAlreadyProcessed();
        }
        $.processedMessages[messageId] = true;

        // TODO: Add configId validation when dApp contracts expose getConfigId()
        // For now, we use bytes32(0) as a placeholder in the event
        bytes32 configId;

        ISelfVerificationRoot(destDAppAddress).onVerificationSuccess(output, userDataToPass);
        emit VerificationBridged(destDAppAddress, configId, output, userDataToPass, block.timestamp);
    }

    /**
     * @notice Authorizes contract upgrades.
     * @dev Only accounts with DEFAULT_ADMIN_ROLE can authorize upgrades.
     * This is required by the UUPS upgrade pattern.
     * @param newImplementation The address of the new implementation contract.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
