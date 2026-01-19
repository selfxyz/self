// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {MockOwnableImplRoot} from "./MockOwnableImplRoot.sol";

/**
 * @title MockOwnableRegistry
 * @dev Mock contract that simulates the OLD production Registry using Ownable
 * This represents what's currently deployed in production before the governance upgrade.
 */
contract MockOwnableRegistry is MockOwnableImplRoot {
    /// @notice Hub address
    address private _hub;

    /// @notice CSCA Root
    bytes32 private _cscaRoot;

    /// @notice Some registry data
    mapping(bytes32 => bool) private _commitments;

    /// @notice Event emitted when registry is initialized
    event RegistryInitialized(address indexed hub);

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
     * @notice Initializes the Registry contract (simulates production initialization)
     * @param hubAddress The hub address
     */
    function initialize(address hubAddress) external initializer {
        __MockOwnableImplRoot_init();
        _hub = hubAddress;
        emit RegistryInitialized(hubAddress);
    }

    /**
     * @notice Sets the hub address (simulates production function)
     * @param hubAddress The new hub address
     */
    function setHub(address hubAddress) external onlyOwner {
        _hub = hubAddress;
        emit HubUpdated(hubAddress);
    }

    /**
     * @notice Updates the hub address (simulates production function)
     * @param hubAddress The new hub address
     */
    function updateHub(address hubAddress) external onlyOwner {
        _hub = hubAddress;
        emit HubUpdated(hubAddress);
    }

    /**
     * @notice Updates the CSCA root (simulates production function)
     * @param cscaRoot The new CSCA root
     */
    function updateCscaRoot(bytes32 cscaRoot) external onlyOwner {
        _cscaRoot = cscaRoot;
        emit CscaRootUpdated(cscaRoot);
    }

    /**
     * @notice Adds a commitment (simulates production function)
     * @param commitment The commitment to add
     */
    function addCommitment(bytes32 commitment) external onlyOwner {
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
