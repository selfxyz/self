// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ImplRoot} from "../../contracts/upgradeable/ImplRoot.sol";

contract MockImplRoot is ImplRoot {
    function exposed__ImplRoot_init() external initializer {
        __ImplRoot_init();
    }

    function exposed_authorizeUpgrade(address newImplementation) external {
        _authorizeUpgrade(newImplementation);
    }

    function exposed_grantRole(bytes32 role, address account) external {
        _grantRole(role, account);
    }

    function exposed_revokeRole(bytes32 role, address account) external {
        _revokeRole(role, account);
    }

    function exposed_setRoleAdmin(bytes32 role, bytes32 adminRole) external {
        _setRoleAdmin(role, adminRole);
    }
}
