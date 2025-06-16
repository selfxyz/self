// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {CustomVerifier} from "../libraries/CustomVerifier.sol";
import {SelfStructs} from "../libraries/SelfStructs.sol";

contract TestCustomVerifier {
    function testCustomVerify(
        bytes32 attestationId,
        bytes calldata config,
        bytes calldata proofOutput
    ) external pure returns (SelfStructs.GenericDiscloseOutputV2 memory) {
        return CustomVerifier.customVerify(attestationId, config, proofOutput);
    }
}
