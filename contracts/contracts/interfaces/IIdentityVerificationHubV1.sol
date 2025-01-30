// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IRegisterCircuitVerifier.sol";
import "./IDscCircuitVerifier.sol";
import "./IVcAndDiscloseCircuitVerifier.sol";
interface IIdentityVerificationHubV1 {

    enum RevealedDataType {
        ISSUING_STATE,
        NAME,
        PASSPORT_NUMBER,
        NATIONALITY,
        DATE_OF_BIRTH,
        GENDER,
        EXPIRY_DATE,
        OLDER_THAN,
        OFAC
    }

    struct VcAndDiscloseVerificationResult {
        uint256 attestationId;
        uint256 scope;
        uint256 userIdentifier;
        uint256 nullifier;
        uint256 identityCommitmentRoot;
        uint256[3] revealedDataPacked;
        uint256 forbiddenCountriesListPacked;
    }

    struct ReadableRevealedData {
        string issuingState;
        string name;
        string passportNumber;
        string nationality;
        string dateOfBirth;
        string gender;
        string expiryDate;
        uint256 olderThan;
        uint256 ofac;
    }


    struct VcAndDiscloseHubProof {
        bool olderThanEnabled;
        uint256 olderThan;
        bool forbiddenCountriesEnabled;
        uint256 forbiddenCountriesListPacked;
        bool ofacEnabled;
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof vcAndDiscloseProof;
    }

    function verifyVcAndDisclose(
        VcAndDiscloseHubProof memory proof
    )
        external
        view
        returns (VcAndDiscloseVerificationResult memory);

    function getReadableRevealedData(
        uint256[3] memory revealedDataPacked,
        RevealedDataType[] memory types
    )
        external
        view
        returns (ReadableRevealedData memory);

} 