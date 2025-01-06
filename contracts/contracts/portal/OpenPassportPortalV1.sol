// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

// This is the contract to implement external callable logics

contract OpenPassportPortalV1 is UUPSUpgradeable, OwnableUpgradeable {

    function initialize() external initializer {
        __Ownable_init(msg.sender);
    }

    /// @dev UUPS: restrict upgrade auth to `onlyOwner`
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
