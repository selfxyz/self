// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SelfSBT} from "./SelfSBT.sol";
import {SelfUtils} from "../libraries/SelfUtils.sol";

/**
 * @title SelfSBTFactory
 * @notice Deploys per-flow SelfSBT contracts; one factory per network, owned by Self
 * @dev The factory never calls the hub — each SelfSBT registers its own verification
 *      config in its constructor. Consumers parse SBTDeployed from the receipt
 */
contract SelfSBTFactory {
    address public immutable hubV2;

    event SBTDeployed(address indexed contractAddr, uint256 scope, address indexed deployer);

    constructor(address _hubV2) {
        hubV2 = _hubV2;
    }

    function deploy(
        string calldata scopeSeed,
        string calldata name_,
        string calldata symbol_,
        SelfUtils.UnformattedVerificationConfigV2 calldata cfg
    ) external returns (address) {
        SelfSBT sbt = new SelfSBT(hubV2, scopeSeed, name_, symbol_, cfg);
        emit SBTDeployed(address(sbt), sbt.scope(), msg.sender);
        return address(sbt);
    }
}
