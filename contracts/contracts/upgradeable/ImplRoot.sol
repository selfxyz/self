// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/**
 * @title ImplRoot
 * @dev Abstract contract providing upgradeable functionality via UUPSUpgradeable,
 * along with role-based access control using AccessControlUpgradeable.
 * Serves as a base for upgradeable implementations.
 *
 * Governance Roles:
 * - SECURITY_ROLE: Security-sensitive operations and role management (3/5 multisig consensus)
 * - OPERATIONS_ROLE: Routine operational tasks (2/5 multisig consensus)
 */
abstract contract ImplRoot is UUPSUpgradeable, AccessControlUpgradeable {
    /// @notice Security-sensitive operations requiring 3/5 multisig consensus
    bytes32 public constant SECURITY_ROLE = keccak256("SECURITY_ROLE");

    /// @notice Routine operations requiring 2/5 multisig consensus
    bytes32 public constant OPERATIONS_ROLE = keccak256("OPERATIONS_ROLE");

    /// @notice TEE-operated routines (attested off-chain)
    bytes32 public constant TEE_ROLE = keccak256("TEE_ROLE");

    modifier onlyTEE() {
        if (!hasRole(TEE_ROLE, msg.sender)) {
            revert AccessControlUnauthorizedAccount(msg.sender, TEE_ROLE);
        }
        _;
    }

    // Reserved storage space to allow for layout changes in the future.
    uint256[50] private __gap;

    /**
     * @dev Initializes the contract by setting the deployer as the initial owner and initializing
     * the UUPS proxy functionality.
     *
     * This function should be called in the initializer of the derived contract.
     */
    function __ImplRoot_init() internal virtual onlyInitializing {
        __AccessControl_init();

        _grantRole(SECURITY_ROLE, msg.sender);
        _grantRole(OPERATIONS_ROLE, msg.sender);
        _grantRole(TEE_ROLE, msg.sender);

        // Set role admins - SECURITY_ROLE manages all roles
        _setRoleAdmin(SECURITY_ROLE, SECURITY_ROLE);
        _setRoleAdmin(OPERATIONS_ROLE, SECURITY_ROLE);
        _setRoleAdmin(TEE_ROLE, SECURITY_ROLE);
    }

    /**
     * @notice Initializes TEE role administration for existing deployments.
     * @dev Call once after upgrade to set admin and optionally grant the role.
     */
    function initializeTeeRole(address tee) external reinitializer(3) onlyRole(SECURITY_ROLE) {
        require(tee != address(0), "TEE address required");
        _setRoleAdmin(TEE_ROLE, SECURITY_ROLE);
        _grantRole(TEE_ROLE, tee);
    }

    /**
     * @dev Authorizes an upgrade to a new implementation.
     * Requirements:
     *   - Must be called through a proxy.
     *   - Caller must have SECURITY_ROLE.
     *
     * @param newImplementation The address of the new implementation contract.
     */
    function _authorizeUpgrade(address newImplementation) internal virtual override onlyProxy onlyRole(SECURITY_ROLE) {}
}
