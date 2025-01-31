// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../upgradeable/ProxyRoot.sol";

contract IdentityRegistry is ProxyRoot {
    constructor(address _logic, bytes memory _data) ProxyRoot(_logic, _data) {}
}