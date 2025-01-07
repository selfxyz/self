// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../proxy/OpenPassportProxy.sol";

/// @title OpenPassportRouterProxy
/// @notice A thin wrapper over ERC1967Proxy to deploy a UUPS Router contract
contract OpenPassportVerifierRouterProxy is OpenPassportProxy {
    constructor(address _logic, bytes memory _data) OpenPassportProxy(_logic, _data) {}
}