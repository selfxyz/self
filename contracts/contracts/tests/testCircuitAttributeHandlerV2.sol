// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {CircuitAttributeHandlerV2} from "../libraries/CircuitAttributeHandlerV2.sol";

contract TestCircuitAttributeHandlerV2 {
    function testGetIssuingState(bytes32 attestationId, bytes memory charcodes) external pure returns (string memory) {
        return CircuitAttributeHandlerV2.getIssuingState(attestationId, charcodes);
    }

    function testGetNationality(bytes32 attestationId, bytes memory charcodes) external pure returns (string memory) {
        return CircuitAttributeHandlerV2.getNationality(attestationId, charcodes);
    }

    function testExtractStringAttribute(
        bytes memory charcodes,
        uint256 start,
        uint256 end
    ) external pure returns (string memory) {
        return CircuitAttributeHandlerV2.extractStringAttribute(charcodes, start, end);
    }
}
