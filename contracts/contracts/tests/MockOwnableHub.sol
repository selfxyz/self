// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {MockOwnableImplRoot} from "./MockOwnableImplRoot.sol";

/**
 * @title MockOwnableHub
 * @dev Mock contract that simulates the OLD production Hub using Ownable
 * This represents what's currently deployed in production before the governance upgrade.
 */
contract MockOwnableHub is MockOwnableImplRoot {
    /// @notice Circuit version for compatibility
    uint256 private _circuitVersion;

    /// @notice Registry address
    address private _registry;

    /// @notice Event emitted when hub is initialized
    event HubInitialized();

    /// @notice Event emitted when registry is updated
    event RegistryUpdated(address indexed registry);

    /**
     * @notice Constructor that disables initializers for the implementation contract.
     */
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the Hub contract (simulates production initialization)
     */
    function initialize() external initializer {
        __MockOwnableImplRoot_init();
        _circuitVersion = 1;
        emit HubInitialized();
    }

    /**
     * @notice Updates the registry address (simulates production function)
     * @param registryAddress The new registry address
     */
    function updateRegistry(address registryAddress) external onlyOwner {
        _registry = registryAddress;
        emit RegistryUpdated(registryAddress);
    }

    /**
     * @notice Gets the circuit version
     */
    function getCircuitVersion() external view returns (uint256) {
        return _circuitVersion;
    }

    /**
     * @notice Gets the registry address
     */
    function getRegistry() external view returns (address) {
        return _registry;
    }

    /**
     * @notice Updates the circuit version
     * @param version The new circuit version
     */
    function updateCircuitVersion(uint256 version) external onlyOwner {
        _circuitVersion = version;
    }
}
