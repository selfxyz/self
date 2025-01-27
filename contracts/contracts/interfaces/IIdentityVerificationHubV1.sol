// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IRegisterCircuitVerifier.sol";
import "./IDscCircuitVerifier.sol";
import "./IVcAndDiscloseCircuitVerifier.sol";
interface IIdentityVerificationHubV1 {

    struct Dg1Attributes {
        string issuingState;
        string name;
        string passportNumber;
        string nationality;
        string dateOfBirth;
        string gender;
        string expiryDate;
    }

    struct VcAndDiscloseVerificationMinimumResult {
        uint256 attestationId;
        uint256 scope;
        uint256 userIdentifier;
        uint256 nullifier;
    }

    struct VcAndDiscloseVerificationFullResult {
        uint256 attestationId;
        uint256 scope;
        uint256 userIdentifier;
        uint256 nullifier;
        uint256[3] revealedDataPacked;
        uint256 olderThan;
        uint256[2] forbiddenCountriesList;
        bool ofacResult;
    }

    struct PassportProof {
        uint256 registerCircuitVerifierId;
        uint256 dscCircuitVerifierId;
        IRegisterCircuitVerifier.RegisterCircuitProof registerCircuitProof;
        IDscCircuitVerifier.DscCircuitProof dscCircuitProof;
    }

    struct VcAndDiscloseHubProof {
        bool olderThanEnabled;
        uint256 olderThan;
        bool forbiddenCountriesEnabled;
        uint256[2] forbiddenCountriesList;
        bool ofacEnabled;
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof vcAndDiscloseProof;
    }

} 