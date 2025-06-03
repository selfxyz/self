// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title ProxyRoot
 * @notice This contract implements an upgradeable proxy that delegates calls to an implementation contract using the ERC1967 standard.
 * @dev Inherits from OpenZeppelin's ERC1967Proxy. The constructor initializes the proxy with the given implementation address and initialization data.
 */
contract ProxyRoot is ERC1967Proxy {
    /**
     * @notice Creates a new upgradeable proxy.
     * @param logic The address of the initial implementation contract.
     * @param data The initialization calldata to be passed to the implementation contract.
     */
    constructor(address logic, bytes memory data) ERC1967Proxy(logic, data) {}
}
