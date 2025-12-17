// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";

/**
 * @title MockOwnableImplRoot
 * @dev Mock contract that simulates the OLD production ImplRoot using Ownable2StepUpgradeable
 * This represents what's currently deployed in production before the governance upgrade.
 */
abstract contract MockOwnableImplRoot is UUPSUpgradeable, Ownable2StepUpgradeable {
    // Reserved storage space to allow for layout changes in the future.
    uint256[50] private __gap;

    /**
     * @dev Initializes the contract by setting the deployer as the initial owner and initializing
     * the UUPS proxy functionality.
     */
    function __MockOwnableImplRoot_init() internal virtual onlyInitializing {
        __Ownable_init(msg.sender);
    }

    /**
     * @dev Authorizes an upgrade to a new implementation.
     * Requirements:
     *   - Must be called through a proxy.
     *   - Caller must be the owner.
     */
    function _authorizeUpgrade(address newImplementation) internal virtual override onlyProxy onlyOwner {}
}
