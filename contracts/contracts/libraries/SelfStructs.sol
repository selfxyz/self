// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

library SelfStructs {

  struct HubInputHeader {
    uint8 contractVersion;
    uint256 destChainId;
    bytes32 configId;
    bytes32 attestationId;
  }

  struct DiscloseV2 {
    string issuingState;
    string[] name;
    string passportNumber;
    string nationality;
    string dateOfBirth;
    string gender;
    string expiryDate;
    uint256 olderThan;
    uint256 passportNoOfac;
    uint256 nameAndDobOfac;
    uint256 nameAndYobOfac;
  }

  struct PassportOutput {
    uint256 attestationId;
    uint256[3] revealedDataPacked;
    uint256 userIdentifier;
    uint256 nullifier;
    uint256[4] forbiddenCountriesListPacked;
  }

  struct EuIdOutput {
    uint256 attestationId;
    uint256[4] revealedDataPacked;
    uint256 userIdentifier;
    uint256 nullifier;
    uint256[4] forbiddenCountriesListPacked;
  }
}
