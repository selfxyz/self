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

  struct VerificationConfigV2 {
    bool olderThanEnabled;
    uint256 olderThan;
    bool forbiddenCountriesEnabled;
    uint256[4] forbiddenCountriesListPacked;
    bool[3] ofacEnabled;
  }

}
