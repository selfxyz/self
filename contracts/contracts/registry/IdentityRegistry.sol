// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ProxyRoot} from "../upgradeable/ProxyRoot.sol";

/**
 * @title IdentityRegistry
 * @notice Acts as an upgradeable proxy for the identity registry.
 * @dev Inherits from ProxyRoot to delegate calls to an implementation contract.
 * The constructor initializes the proxy using the provided implementation address and initialization data.
 */
contract IdentityRegistry is ProxyRoot {
    /**
     * @notice Creates a new instance of the IdentityRegistry proxy.
     * @param logic The address of the initial implementation contract that contains the registry logic.
     * @param data The initialization data passed to the implementation during deployment.
     */
    constructor(address logic, bytes memory data) ProxyRoot(logic, data) {}
}
