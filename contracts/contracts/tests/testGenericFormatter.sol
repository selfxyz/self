// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {GenericFormatter} from "../libraries/GenericFormatter.sol";
import {SelfStructs} from "../libraries/SelfStructs.sol";

contract TestGenericFormatter {
    function testFromV1Config(
        SelfStructs.VerificationConfigV1 memory verificationConfigV1
    ) public pure returns (SelfStructs.VerificationConfigV2 memory verificationConfigV2) {
        verificationConfigV2 = GenericFormatter.fromV1Config(verificationConfigV1);
    }

    function testVerificationConfigFromBytes(
        bytes memory verificationConfig
    ) public pure returns (SelfStructs.VerificationConfigV2 memory verificationConfigV2) {
        verificationConfigV2 = GenericFormatter.verificationConfigFromBytes(verificationConfig);
    }

    function testFormatV1Config(
        SelfStructs.VerificationConfigV1 memory verificationConfigV1
    ) public pure returns (bytes memory v1ConfigBytes) {
        v1ConfigBytes = GenericFormatter.formatV1Config(verificationConfigV1);
    }

    function testFormatV2Config(
        SelfStructs.VerificationConfigV2 memory verificationConfigV2
    ) public pure returns (bytes memory v2ConfigBytes) {
        v2ConfigBytes = GenericFormatter.formatV2Config(verificationConfigV2);
    }

    function testToV2Struct(
        SelfStructs.GenericDiscloseOutputV2 memory genericDiscloseOutput
    ) public pure returns (bytes memory v2StructBytes) {
        v2StructBytes = GenericFormatter.toV2Struct(genericDiscloseOutput);
    }
}
