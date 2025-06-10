// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

library SelfStructs {
  struct HubInputHeader {
    uint8 contractVersion;
    uint256 scope;
    bytes32 attestationId;
    // Note: configId and destChainId are now extracted from userDefinedData
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
    bytes revealedDataPacked;
    uint256 userIdentifier;
    uint256 nullifier;
    uint256[4] forbiddenCountriesListPacked;
  }

  struct EuIdOutput {
    uint256 attestationId;
    bytes revealedDataPacked;
    uint256 userIdentifier;
    uint256 nullifier;
    uint256[4] forbiddenCountriesListPacked;
  }

  uint256 constant passportNoOfac = 0;
  uint256 constant nameAndDobOfac = 1;
  uint256 constant nameAndYobOfac = 2;

   struct GenericDiscloseOutputV2 {
    bytes32 attestationId;
    uint256 userIdentifier;
    uint256 nullifier;
    uint256[4] forbiddenCountriesListPacked;
    string issuingState;
    string[] name;
    string idNumber;
    string nationality;
    string dateOfBirth;
    string gender;
    string expiryDate;
    uint256 olderThan;
    bool[3] ofac;
   }
}
