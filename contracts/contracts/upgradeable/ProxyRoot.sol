// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title ProxyRoot
 * @notice This contract implements an upgradeable proxy that delegates calls to an implementation contract using the ERC1967 standard.
 * @dev Inherits from OpenZeppelin's ERC1967Proxy. The constructor initializes the proxy with the given implementation address and initialization data.
 */
contract ProxyRoot is ERC1967Proxy {
    /// @notice Thrown when the initialization calldata did not initialize the proxy.
    error ProxyRootNotInitialized();

    /// @dev OpenZeppelin v5 Initializable storage location:
    /// keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.Initializable")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant INITIALIZABLE_STORAGE = 0xf0c57e16840df040f15088dc2f81fe391c3923bec73e23a9662efc9c229c6a00;

    /**
     * @notice Creates a new upgradeable proxy.
     * @dev The initialization call must leave the proxy initialized (OpenZeppelin Initializable version > 0),
     * so the proxy is always initialized in its deployment transaction.
     * @param logic The address of the initial implementation contract.
     * @param data The initialization calldata to be passed to the implementation contract.
     */
    constructor(address logic, bytes memory data) ERC1967Proxy(logic, data) {
        uint64 initializedVersion;
        bytes32 slot = INITIALIZABLE_STORAGE;
        assembly {
            // `_initialized` is the low 64 bits of the first word of InitializableStorage
            initializedVersion := and(sload(slot), 0xffffffffffffffff)
        }
        if (initializedVersion == 0) revert ProxyRootNotInitialized();
    }
}
