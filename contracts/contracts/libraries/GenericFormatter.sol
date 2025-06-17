// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SelfStructs} from "./SelfStructs.sol";

struct GenericVerificationStruct {
    uint8 attestationId;
    bytes verificationConfig;
}

library GenericFormatter {
    /**
     * @notice Converts a VerificationConfigV1 struct to a VerificationConfigV2 struct.
     * @param verificationConfigV1 The VerificationConfigV1 struct to convert.
     * @return verificationConfig The converted VerificationConfigV2 struct.
     */
    function fromV1Config(
        SelfStructs.VerificationConfigV1 memory verificationConfigV1
    ) internal pure returns (SelfStructs.VerificationConfigV2 memory verificationConfig) {
        verificationConfig = SelfStructs.VerificationConfigV2({
            olderThanEnabled: verificationConfigV1.olderThanEnabled,
            olderThan: verificationConfigV1.olderThan,
            forbiddenCountriesEnabled: verificationConfigV1.forbiddenCountriesEnabled,
            forbiddenCountriesListPacked: verificationConfigV1.forbiddenCountriesListPacked,
            ofacEnabled: verificationConfigV1.ofacEnabled
        });
    }

    /**
     * @notice Converts a bytes array to the latest VerificationConfig struct.
     * @param verificationConfig The bytes array to convert.
     * @return verificationConfigV2 The converted VerificationConfig struct.
     */
    function verificationConfigFromBytes(
        bytes memory verificationConfig
    ) internal pure returns (SelfStructs.VerificationConfigV2 memory verificationConfigV2) {
        return abi.decode(verificationConfig, (SelfStructs.VerificationConfigV2));
    }

    /**
     * @notice Formats a VerificationConfigV1 struct to the latest verification config bytes array.
     * @param verificationConfigV1 The VerificationConfigV1 struct to format.
     * @return v1ConfigBytes The latest verification config formatted bytes array.
     */
    function formatV1Config(
        SelfStructs.VerificationConfigV1 memory verificationConfigV1
    ) internal pure returns (bytes memory v1ConfigBytes) {
        SelfStructs.VerificationConfigV2 memory verificationConfigV2 = fromV1Config(verificationConfigV1);
        return abi.encode(verificationConfigV2);
    }

    /**
     * @notice Formats a VerificationConfigV2 struct to the latest verification config bytes array.
     * @param verificationConfigV2 The VerificationConfigV2 struct to format.
     * @return v2ConfigBytes The latest verification config formatted bytes array.
     */
    function formatV2Config(
        SelfStructs.VerificationConfigV2 memory verificationConfigV2
    ) internal pure returns (bytes memory v2ConfigBytes) {
        return abi.encode(verificationConfigV2);
    }

    /**
     * @notice Formats a GenericDiscloseOutputV2 struct to the latest generic disclose output bytes array.
     * @param genericDiscloseOutput The GenericDiscloseOutputV2 struct to format.
     * @return v2StructBytes The latest generic disclose output formatted bytes array.
     */
    function toV2Struct(
        SelfStructs.GenericDiscloseOutputV2 memory genericDiscloseOutput
    ) internal pure returns (bytes memory v2StructBytes) {
        v2StructBytes = abi.encode(genericDiscloseOutput);
    }
}
