// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./proxy/PrivacyIDProxy.sol";

contract IdentityVerificationHub is PrivacyIDProxy {
    constructor(address _logic, bytes memory _data) PrivacyIDProxy(_logic, _data) {}
}
