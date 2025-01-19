// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @title Initialization Checker
/// @author Worldcoin
/// @notice A contract that represents the ability to initialize a proxy-based contract but also to
///         check that said contract is initialized.
contract CheckInitialized is Initializable {
    /// @notice Whether the initialization has been completed.
    /// @dev This relies on the fact that a default-init `bool` is `false` here.
    bool private _initialized;

    /// @notice Thrown when attempting to call a function while the implementation has not been
    ///         initialized.
    error ImplementationNotInitialized();

    /// @notice Sets the contract as initialized.
    function __setInitialized() internal onlyInitializing {
        _initialized = true;
    }

    /// @notice Asserts that the annotated function can only be called once the contract has been
    ///         initialized.
    modifier onlyInitialized() {
        if (!_initialized) {
            revert ImplementationNotInitialized();
        }
        _;
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
