// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../proxy/OpenPassportProxy.sol";

contract OpenPassportRegisterProxy is OpenPassportProxy {
    constructor(address _logic, bytes memory _data) OpenPassportProxy(_logic, _data) {}
}