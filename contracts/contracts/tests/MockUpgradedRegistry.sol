// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ImplRoot} from "../upgradeable/ImplRoot.sol";

/**
 * @title MockUpgradedRegistry
 * @dev Mock contract that simulates the NEW Registry with AccessControl governance
 * This represents what the Registry will look like after the governance upgrade.
 */
contract MockUpgradedRegistry is ImplRoot {
    /// @notice Hub address
    address private _hub;

    /// @notice CSCA Root
    bytes32 private _cscaRoot;

    /// @notice Some registry data
    mapping(bytes32 => bool) private _commitments;

    /// @notice Event emitted when registry governance is initialized
    event RegistryGovernanceInitialized();

    /// @notice Event emitted when hub is updated
    event HubUpdated(address indexed hub);

    /// @notice Event emitted when CSCA root is updated
    event CscaRootUpdated(bytes32 indexed cscaRoot);

    /**
     * @notice Constructor that disables initializers for the implementation contract.
     */
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes governance for the upgraded Registry
     * This should be called after the upgrade to set up AccessControl
     * NOTE: This ONLY initializes governance roles, does NOT modify existing state
     */
    function initialize() external reinitializer(2) {
        __ImplRoot_init();
        // DO NOT modify _hub or _cscaRoot - they should be preserved from before upgrade!
        emit RegistryGovernanceInitialized();
    }

    /**
     * @notice Sets the hub address (now requires SECURITY_ROLE)
     * @param hubAddress The new hub address
     */
    function setHub(address hubAddress) external onlyRole(SECURITY_ROLE) {
        _hub = hubAddress;
        emit HubUpdated(hubAddress);
    }

    /**
     * @notice Updates the hub address (now requires SECURITY_ROLE)
     * @param hubAddress The new hub address
     */
    function updateHub(address hubAddress) external onlyRole(SECURITY_ROLE) {
        _hub = hubAddress;
        emit HubUpdated(hubAddress);
    }

    /**
     * @notice Updates the CSCA root (now requires SECURITY_ROLE)
     * @param cscaRoot The new CSCA root
     */
    function updateCscaRoot(bytes32 cscaRoot) external onlyRole(OPERATIONS_ROLE) {
        _cscaRoot = cscaRoot;
        emit CscaRootUpdated(cscaRoot);
    }

    /**
     * @notice Adds a commitment (now requires SECURITY_ROLE)
     * @param commitment The commitment to add
     */
    function addCommitment(bytes32 commitment) external onlyRole(SECURITY_ROLE) {
        _commitments[commitment] = true;
    }

    /**
     * @notice Gets the hub address
     */
    function getHub() external view returns (address) {
        return _hub;
    }

    /**
     * @notice Gets the CSCA root
     */
    function getCscaRoot() external view returns (bytes32) {
        return _cscaRoot;
    }

    /**
     * @notice Checks if a commitment exists
     */
    function hasCommitment(bytes32 commitment) external view returns (bool) {
        return _commitments[commitment];
    }
}
