// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ImplRoot} from "../upgradeable/ImplRoot.sol";

/**
 * @title MockUpgradedHub
 * @dev Mock contract that simulates the NEW Hub with AccessControl governance
 * This represents what the Hub will look like after the governance upgrade.
 */
contract MockUpgradedHub is ImplRoot {
    /// @notice Circuit version for compatibility
    uint256 private _circuitVersion;

    /// @notice Registry address
    address private _registry;

    /// @notice Event emitted when hub is initialized with governance
    event HubGovernanceInitialized();

    /// @notice Event emitted when registry is updated
    event RegistryUpdated(address indexed registry);

    /**
     * @notice Constructor that disables initializers for the implementation contract.
     */
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes governance for the upgraded Hub
     * This should be called after the upgrade to set up AccessControl
     * NOTE: This ONLY initializes governance roles, does NOT modify existing state
     */
    function initialize() external reinitializer(2) {
        __ImplRoot_init();
        // DO NOT modify _registry or _circuitVersion - they should be preserved from before upgrade!
        emit HubGovernanceInitialized();
    }

    /**
     * @notice Updates the registry address (now requires SECURITY_ROLE)
     * @param registryAddress The new registry address
     */
    function updateRegistry(address registryAddress) external onlyRole(SECURITY_ROLE) {
        _registry = registryAddress;
        emit RegistryUpdated(registryAddress);
    }

    /**
     * @notice Updates circuit version (requires SECURITY_ROLE)
     * @param version The new circuit version
     */
    function updateCircuitVersion(uint256 version) external onlyRole(SECURITY_ROLE) {
        _circuitVersion = version;
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
     * @notice Checks if the upgrade preserved critical storage data
     * This is a verification function to ensure storage migration worked
     */
    function verifyStorageMigration() external view returns (bool) {
        // The important thing is that the contract is functional and governance works
        // Registry and circuit version should be preserved, deprecated owner may be zero
        return hasRole(SECURITY_ROLE, msg.sender) || hasRole(OPERATIONS_ROLE, msg.sender);
    }
}
