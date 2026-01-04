// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title IBridgeAdapter
 * @notice Interface for bridge adapters that handle cross-chain messaging
 * @dev Allows the hub to be bridge-provider agnostic (LayerZero, Wormhole, etc.)
 */
interface IBridgeAdapter {
    /**
     * @notice Quotes the fee required for bridging a message
     * @param destChainId The destination chain ID
     * @param destDAppAddress The destination dApp address
     * @param output The verification output
     * @param userData The user data
     * @return nativeFee The required fee in native token
     */
    function quoteBridgeFee(
        uint256 destChainId,
        address destDAppAddress,
        bytes calldata output,
        bytes calldata userData
    ) external view returns (uint256 nativeFee);

    /**
     * @notice Sends a cross-chain message
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
    ) external payable;

    /**
     * @notice Returns the bridge endpoint address
     * @return The bridge endpoint address
     */
    function bridgeEndpoint() external view returns (address);

    /**
     * @notice Returns the destination hub for a chain
     * @param chainId The chain ID
     * @return The destination hub address as bytes32
     */
    function destHubs(uint256 chainId) external view returns (bytes32);

    /**
     * @notice Returns the LayerZero EID for a chain
     * @param chainId The chain ID
     * @return The LayerZero endpoint ID
     */
    function chainEids(uint256 chainId) external view returns (uint32);
}



