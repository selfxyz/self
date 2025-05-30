// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ProxyRoot} from "./upgradeable/ProxyRoot.sol";

/**
 * @title IdentityVerificationHub
 * @notice Acts as an upgradeable proxy for the identity verification hub.
 * @dev Inherits from ProxyRoot to delegate calls to an implementation contract.
 * The constructor initializes the proxy using the provided implementation address and initialization data.
 */
contract IdentityVerificationHub is ProxyRoot {
    /**
     * @notice Constructs a new IdentityVerificationHub proxy.
     * @param logic The address of the implementation contract containing the hub logic.
     * @param data The initialization data to be executed in the context of the implementation contract.
     */
    constructor(address logic, bytes memory data) ProxyRoot(logic, data) {}
}
