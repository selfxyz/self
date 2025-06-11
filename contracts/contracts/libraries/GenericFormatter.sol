// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SelfStructs} from "./SelfStructs.sol";

struct GenericVerificationStruct {
  uint8 attestationId;
  bytes verificationConfig;
}

library GenericFormatter {
  function fromV1Config(SelfStructs.VerificationConfigV1 memory verificationConfigV1) internal pure returns (SelfStructs.VerificationConfigV2 memory verificationConfig) {
    verificationConfig = SelfStructs.VerificationConfigV2({
      olderThanEnabled: verificationConfigV1.olderThanEnabled,
      olderThan: verificationConfigV1.olderThan,
      forbiddenCountriesEnabled: verificationConfigV1.forbiddenCountriesEnabled,
      forbiddenCountriesListPacked: verificationConfigV1.forbiddenCountriesListPacked,
      ofacEnabled: verificationConfigV1.ofacEnabled
    });
  }

  function verificationConfigFromBytes(bytes memory verificationConfig) internal pure returns (SelfStructs.VerificationConfigV2 memory verificationConfigV2) {
    return abi.decode(verificationConfig, (SelfStructs.VerificationConfigV2));
  }

  function formatV1Config(SelfStructs.VerificationConfigV1 memory verificationConfigV1) internal pure returns (bytes memory v1ConfigBytes) {
    SelfStructs.VerificationConfigV2 memory verificationConfigV2 = fromV1Config(verificationConfigV1);
    return abi.encode(verificationConfigV2);
  }

  function formatV2Config(SelfStructs.VerificationConfigV2 memory verificationConfigV2) internal pure returns (bytes memory v2ConfigBytes) {
    return abi.encode(verificationConfigV2);
  }

   function toV2Struct(SelfStructs.GenericDiscloseOutputV2 memory genericDiscloseOutput) internal pure returns (bytes memory v2StructBytes) {
    v2StructBytes = abi.encode(genericDiscloseOutput);
  }
}
