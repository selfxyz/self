// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {
    MessagingFee,
    MessagingParams,
    MessagingReceipt,
    Origin
} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

/**
 * @title MockBridgeProvider
 * @notice Mock bridge implementation for testing multichain verification flow
 * @dev This contract simulates a bridge provider (LayerZero/Wormhole) for end-to-end testing
 * without requiring actual cross-chain infrastructure. It allows testing the complete
 * multichain verification flow in a local/testnet environment.
 *
 * IMPORTANT: This is ONLY for testing. Will be replaced with real bridge provider integration
 * (LayerZero v2 or Wormhole) in production.
 *
 * @custom:version 1.0.0
 */
contract MockBridgeProvider {
    /// @custom:storage-location erc7201:self.storage.MockBridge
    struct MockBridgeStorage {
        mapping(uint256 chainId => address destHub) destinationHubs;
        mapping(uint256 chainId => uint256 fee) bridgeFees;
        uint256 bridgeDelay;
        uint256 pendingMessageCount;
        bytes32 sourceHub;
    }

    /// @dev keccak256(abi.encode(uint256(keccak256("self.storage.MockBridge")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant MOCKBRIDGE_STORAGE_LOCATION =
        0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a00;

    /**
     * @notice Returns the storage struct for the Mock Bridge.
     * @dev Uses ERC-7201 storage pattern for upgradeable contracts.
     * @return $ The storage struct reference.
     */
    function _getMockBridgeStorage() private pure returns (MockBridgeStorage storage $) {
        assembly {
            $.slot := MOCKBRIDGE_STORAGE_LOCATION
        }
    }

    /**
     * @notice Emitted when a message is sent through the mock bridge.
     * @param destChainId The destination chain identifier.
     * @param destHub The destination hub address (as bytes32).
     * @param payload The message payload being bridged.
     */
    event MockMessageSent(uint256 indexed destChainId, bytes32 indexed destHub, bytes payload);

    // ====================================================
    // Errors
    // ====================================================

    /// @notice Thrown when the destination hub is not configured.
    error DestinationHubNotConfigured();

    /// @notice Thrown when the message send operation fails.
    error MockBridgeSendFailed();

    /// @notice Thrown when insufficient fee is provided.
    error InsufficientFee();

    // ====================================================
    // External Functions
    // ====================================================

    /**
     * @notice Mock LayerZero v2 quote implementation.
     * @dev Returns the configured fee for the destination endpoint id.
     */
    function quote(MessagingParams calldata _params, address) external view returns (MessagingFee memory) {
        MockBridgeStorage storage $ = _getMockBridgeStorage();
        return MessagingFee({nativeFee: $.bridgeFees[_params.dstEid], lzTokenFee: 0});
    }

    /**
     * @notice Mock LayerZero v2 send implementation.
     * @dev Simulates end-to-end delivery by directly invoking lzReceive on the destination hub.
     */
    function send(
        MessagingParams calldata _params,
        address /*_refundAddress*/
    ) external payable returns (MessagingReceipt memory receipt) {
        MockBridgeStorage storage $ = _getMockBridgeStorage();

        address destHub = address(uint160(uint256(_params.receiver)));
        address configuredHub = $.destinationHubs[_params.dstEid];
        if (configuredHub == address(0) || configuredHub != destHub) {
            revert DestinationHubNotConfigured();
        }
        if (destHub == address(0)) revert DestinationHubNotConfigured();

        uint256 requiredFee = $.bridgeFees[_params.dstEid];
        if (msg.value < requiredFee) revert InsufficientFee();

        $.pendingMessageCount++;

        emit MockMessageSent(_params.dstEid, _params.receiver, _params.message);

        receipt = MessagingReceipt({
            guid: keccak256(abi.encodePacked(block.timestamp, msg.sender, _params.dstEid, $.pendingMessageCount)),
            nonce: uint64($.pendingMessageCount),
            fee: MessagingFee({nativeFee: requiredFee, lzTokenFee: 0})
        });

        bytes32 sourceHubAddress = $.sourceHub != bytes32(0) ? $.sourceHub : bytes32(uint256(uint160(msg.sender)));
        Origin memory origin = Origin({srcEid: uint32(block.chainid), sender: sourceHubAddress, nonce: receipt.nonce});

        (bool success, bytes memory returnData) = destHub.call(
            abi.encodeWithSignature(
                "lzReceive((uint32,bytes32,uint64),bytes32,bytes,address,bytes)",
                origin,
                receipt.guid,
                _params.message,
                msg.sender,
                bytes("")
            )
        );

        if (!success) {
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
            revert MockBridgeSendFailed();
        }
    }

    /**
     * @notice Mock implementation of bridge message sending.
     * @dev This function simulates sending a message to another chain. In testing,
     * it directly calls the destination hub on the same chain. In production, this
     * would be replaced with actual LayerZero/Wormhole bridge calls.
     *
     * Flow:
     * 1. Validates destination hub is configured
     * 2. Validates sufficient fee is provided
     * 3. Emits event for tracking
     * 4. Directly calls destination hub's receiveMessage() (mock only)
     *
     * @param destChainId The destination chain identifier.
     * @param destHub The destination hub address (as bytes32).
     * @param payload The encoded message payload: abi.encode(destDAppAddress, output, userDataToPass).
     */
    function sendMessage(uint256 destChainId, bytes32 destHub, bytes calldata payload) external payable {
        MockBridgeStorage storage $ = _getMockBridgeStorage();

        // Validate destination hub is configured
        if ($.destinationHubs[destChainId] == address(0)) {
            revert DestinationHubNotConfigured();
        }

        // Validate sufficient fee is provided
        uint256 requiredFee = $.bridgeFees[destChainId];
        if (msg.value < requiredFee) {
            revert InsufficientFee();
        }

        // Increment pending message count
        $.pendingMessageCount++;

        // Emit event for tracking
        emit MockMessageSent(destChainId, destHub, payload);

        // MOCK ONLY: Directly call destination hub on same chain
        // In production, this would trigger actual cross-chain message via LayerZero/Wormhole
        address destHubAddress = $.destinationHubs[destChainId];

        // Source chain ID would be the current chain in production bridge
        uint256 sourceChainId = block.chainid;

        // Use configured source hub or default to msg.sender as bytes32
        bytes32 sourceHubAddress = $.sourceHub != bytes32(0) ? $.sourceHub : bytes32(uint256(uint160(msg.sender)));

        // Call receiveMessage on destination hub (simulating cross-chain delivery)
        (bool success, bytes memory returnData) = destHubAddress.call(
            abi.encodeWithSignature("receiveMessage(uint256,bytes32,bytes)", sourceChainId, sourceHubAddress, payload)
        );

        if (!success) {
            // If the call failed, forward the revert reason if available
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
            revert MockBridgeSendFailed();
        }
    }

    /**
     * @notice Configures the destination hub address for a specific chain.
     * @dev In testing, this maps chain IDs to local contract addresses that simulate
     * the destination hub on another chain.
     * @param chainId The destination chain identifier.
     * @param hubAddress The destination hub contract address.
     */
    function setDestinationHub(uint256 chainId, address hubAddress) external {
        MockBridgeStorage storage $ = _getMockBridgeStorage();
        $.destinationHubs[chainId] = hubAddress;
    }

    /**
     * @notice Sets the bridge fee for a specific destination chain.
     * @param chainId The destination chain identifier.
     * @param fee The fee amount in wei.
     */
    function setBridgeFee(uint256 chainId, uint256 fee) external {
        MockBridgeStorage storage $ = _getMockBridgeStorage();
        $.bridgeFees[chainId] = fee;
    }

    /**
     * @notice Sets the simulated bridge delay in seconds.
     * @param delay The delay in seconds.
     */
    function setBridgeDelay(uint256 delay) external {
        MockBridgeStorage storage $ = _getMockBridgeStorage();
        $.bridgeDelay = delay;
    }

    /**
     * @notice Sets the source hub address to use in mock bridge calls.
     * @param hubAddress The source hub address as bytes32.
     */
    function setSourceHub(bytes32 hubAddress) external {
        MockBridgeStorage storage $ = _getMockBridgeStorage();
        $.sourceHub = hubAddress;
    }

    // ====================================================
    // External View Functions
    // ====================================================

    /**
     * @notice Returns the configured destination hub address for a chain.
     * @param chainId The destination chain identifier to query.
     * @return The destination hub contract address.
     */
    function getDestinationHub(uint256 chainId) external view returns (address) {
        MockBridgeStorage storage $ = _getMockBridgeStorage();
        return $.destinationHubs[chainId];
    }

    /**
     * @notice Returns the bridge fee quote for a specific destination chain.
     * @param chainId The destination chain identifier.
     * @return The fee amount in wei.
     */
    function quoteFee(uint256 chainId) external view returns (uint256) {
        MockBridgeStorage storage $ = _getMockBridgeStorage();
        return $.bridgeFees[chainId];
    }

    /**
     * @notice Returns the current bridge delay setting.
     * @return The delay in seconds.
     */
    function bridgeDelay() external view returns (uint256) {
        MockBridgeStorage storage $ = _getMockBridgeStorage();
        return $.bridgeDelay;
    }

    /**
     * @notice Returns the count of pending messages.
     * @return The number of pending messages.
     */
    function getPendingMessageCount() external view returns (uint256) {
        MockBridgeStorage storage $ = _getMockBridgeStorage();
        return $.pendingMessageCount;
    }
}
