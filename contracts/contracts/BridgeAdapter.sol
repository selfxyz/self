// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ILayerZeroEndpointV2, MessagingFee} from
    "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import {OptionsBuilder} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import {OAppSenderUpgradeable} from "@layerzerolabs/oapp-evm-upgradeable/contracts/oapp/OAppSenderUpgradeable.sol";
import {OAppCoreUpgradeable} from "@layerzerolabs/oapp-evm-upgradeable/contracts/oapp/OAppCoreUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IBridgeAdapter} from "./interfaces/IBridgeAdapter.sol";

/**
 * @title BridgeAdapter
 * @notice External contract for handling cross-chain bridging via LayerZero
 * @dev Extracts bridge logic from IdentityVerificationHubImplV2 to reduce contract size.
 *      This contract is upgradeable via UUPS pattern and uses LayerZero's official
 *      OAppSenderUpgradeable for cross-chain message sending.
 *
 *      Uses AccessControlUpgradeable instead of OwnableUpgradeable for more granular
 *      role-based access control, overriding the default OApp access control.
 *
 * @custom:security-contact security@self.xyz
 */
contract BridgeAdapter is
    Initializable,
    OAppSenderUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IBridgeAdapter
{
    using OptionsBuilder for bytes;

    /// @notice Role for hub contracts that can send bridge messages
    bytes32 public constant HUB_ROLE = keccak256("HUB_ROLE");

    /// @notice Role for security operations
    bytes32 public constant SECURITY_ROLE = keccak256("SECURITY_ROLE");

    /// @notice Default gas limit for LayerZero receive operations
    uint128 public constant DEFAULT_LZ_RECEIVE_GAS_LIMIT = 500_000;

    /// @notice Gas limit for lzReceive operations
    uint128 public lzReceiveGasLimit;

    /// @notice Mapping of chain ID to LayerZero endpoint ID
    /// @dev Used to convert chainId to EID for peer lookups
    mapping(uint256 chainId => uint32 eid) public override chainEids;

    /// @notice Thrown when the bridge endpoint is not set
    error NoBridgeEndpoint();

    /// @notice Thrown when no destination hub is configured for the chain
    error NoDestinationHub();

    /// @notice Thrown when no bridge chain ID is configured
    error NoBridgeChainId();

    /// @notice Thrown when insufficient fee is provided for bridging
    error InvalidBridgeFee(uint256 requiredFee, uint256 suppliedFee);

    /// @notice Emitted when destination hub is updated
    event DestinationHubUpdated(uint256 indexed chainId, bytes32 destHub);

    /// @notice Emitted when chain EID is updated
    event ChainEidUpdated(uint256 indexed chainId, uint32 eid);

    /// @notice Emitted when gas limit is updated
    event GasLimitUpdated(uint128 oldLimit, uint128 newLimit);

    /// @notice Emitted when a bridge message is sent
    event BridgeMessageSent(uint256 indexed destChainId, address indexed destDApp, address indexed refundAddress);

    /// @custom:oz-upgrades-unsafe-allow constructor
    /// @param _endpoint The LayerZero endpoint address (immutable)
    constructor(address _endpoint) OAppCoreUpgradeable(_endpoint) {
        _disableInitializers();
    }

    /**
     * @notice Initializes the bridge adapter
     * @param admin The admin address (will also be the owner for OApp)
     * @param delegate The delegate address for LayerZero configuration
     */
    function initialize(address admin, address delegate) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __Ownable_init(admin); // Required by OAppCoreUpgradeable
        __OAppSender_init(delegate);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SECURITY_ROLE, admin);
    }

    /**
     * @notice Authorizes an upgrade to a new implementation
     * @param newImplementation The new implementation address
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    /**
     * @notice Returns the bridge endpoint address for backward compatibility
     * @return The LayerZero endpoint address
     */
    function bridgeEndpoint() external view override returns (address) {
        return address(endpoint);
    }

    /**
     * @notice Sets the peer (destination hub) for a LayerZero endpoint ID
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

    /**
     * @notice Sets the gas limit for lzReceive operations
     * @param gasLimit The gas limit
     */
    function setLzReceiveGasLimit(uint128 gasLimit) external onlyRole(SECURITY_ROLE) {
        uint128 oldLimit = lzReceiveGasLimit;
        lzReceiveGasLimit = gasLimit;
        emit GasLimitUpdated(oldLimit, gasLimit);
    }

    /**
     * @notice Sets the destination hub for a chain (backward compatibility)
     * @param chainId The chain ID
     * @param destHub The destination hub address (bytes32)
     * @dev This is a convenience function that uses chainEids mapping to convert chainId to EID
     */
    function setDestinationHub(uint256 chainId, bytes32 destHub) external onlyRole(SECURITY_ROLE) {
        uint32 eid = chainEids[chainId];
        if (eid == 0) revert NoBridgeChainId();
        _setPeer(eid, destHub);
        emit DestinationHubUpdated(chainId, destHub);
    }

    /**
     * @notice Returns the destination hub for a chain (backward compatibility with interface)
     * @param chainId The chain ID
     * @return The destination hub address as bytes32 (from peers mapping)
     */
    function destHubs(uint256 chainId) external view override returns (bytes32) {
        uint32 eid = chainEids[chainId];
        if (eid == 0) return bytes32(0);
        return peers(eid);
    }

    /**
     * @notice Sets the LayerZero EID for a chain
     * @param chainId The chain ID
     * @param eid The LayerZero endpoint ID
     */
    function setChainEid(uint256 chainId, uint32 eid) external onlyRole(SECURITY_ROLE) {
        chainEids[chainId] = eid;
        emit ChainEidUpdated(chainId, eid);
    }

    /**
     * @notice Grants hub role to a contract
     * @param hub The hub contract address
     */
    function grantHubRole(address hub) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(HUB_ROLE, hub);
    }

    /**
     * @notice Revokes hub role from a contract
     * @param hub The hub contract address
     */
    function revokeHubRole(address hub) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(HUB_ROLE, hub);
    }

    /**
     * @notice Allows the contract to receive ETH (for LayerZero refunds)
     */
    receive() external payable {}

    /**
     * @notice Quotes the fee required for bridging a message
     * @param destChainId The destination chain ID
     * @param destDAppAddress The destination dApp address
     * @param output The verification output
     * @param userData The user data
     * @return nativeFee The required fee in native token
     */
    function quoteBridgeFee(uint256 destChainId, address destDAppAddress, bytes calldata output, bytes calldata userData)
        external
        view
        override
        returns (uint256 nativeFee)
    {
        uint32 destEid = chainEids[destChainId];
        if (destEid == 0) revert NoBridgeChainId();

        // Check if peer is set for this EID
        bytes32 destHub = peers(destEid);
        if (destHub == bytes32(0)) revert NoDestinationHub();

        uint128 gasLimit = lzReceiveGasLimit == 0 ? DEFAULT_LZ_RECEIVE_GAS_LIMIT : lzReceiveGasLimit;

        bytes memory payload = abi.encode(destDAppAddress, output, userData);
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(gasLimit, 0);

        // Use OAppSenderUpgradeable's _quote function which validates peers
        MessagingFee memory fee = _quote(destEid, payload, options, false);
        return fee.nativeFee;
    }

    /**
     * @notice Sends a cross-chain message via LayerZero
     * @param destChainId The destination chain ID
     * @param destDAppAddress The dApp contract address on the destination chain
     * @param output The verification output data
     * @param userDataToPass The user data to pass to the destination dApp
     * @param refundAddress The address to refund excess fees to
     */
    function sendBridgeMessage(
        uint256 destChainId,
        address destDAppAddress,
        bytes calldata output,
        bytes calldata userDataToPass,
        address refundAddress
    ) external payable override onlyRole(HUB_ROLE) {
        _sendBridgeMessageInternal(destChainId, destDAppAddress, output, userDataToPass, refundAddress);
    }

    /**
     * @dev Internal function to send bridge message, split to avoid stack too deep
     */
    function _sendBridgeMessageInternal(
        uint256 destChainId,
        address destDAppAddress,
        bytes calldata output,
        bytes calldata userDataToPass,
        address refundAddress
    ) internal {
        uint32 destEid = chainEids[destChainId];
        if (destEid == 0) revert NoBridgeChainId();

        // Check if peer is set for this EID (via OAppCore's peers)
        bytes32 destHub = peers(destEid);
        if (destHub == bytes32(0)) revert NoDestinationHub();

        uint128 gasLimit = lzReceiveGasLimit == 0 ? DEFAULT_LZ_RECEIVE_GAS_LIMIT : lzReceiveGasLimit;

        // Build message payload
        bytes memory payload = abi.encode(destDAppAddress, output, userDataToPass);
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(gasLimit, 0);

        // Quote fee using OAppSenderUpgradeable's _quote
        MessagingFee memory fee = _quote(destEid, payload, options, false);
        if (msg.value < fee.nativeFee) revert InvalidBridgeFee(fee.nativeFee, msg.value);

        // Send message using OAppSenderUpgradeable's _lzSend
        _lzSend(destEid, payload, options, MessagingFee(msg.value, 0), refundAddress);

        emit BridgeMessageSent(destChainId, destDAppAddress, refundAddress);
    }

    /**
     * @dev Override _payNative to support variable msg.value (excess goes to refund address)
     */
    function _payNative(uint256 _nativeFee) internal view override returns (uint256 nativeFee) {
        if (msg.value < _nativeFee) revert NotEnoughNative(msg.value);
        return msg.value;
    }
}
