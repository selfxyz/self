// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title OpenPassportRouterProxy
/// @notice A thin wrapper over ERC1967Proxy to deploy a UUPS Router contract
contract OpenPassportVerifierRouterProxy is ERC1967Proxy {
    constructor(address _logic, bytes memory _data) ERC1967Proxy(_logic, _data) {}
}
