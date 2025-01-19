// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IDscCircuitVerifier.sol";

interface IIdentityVerificationHubV1 {

    enum SignatureType {
        RSA,
        ECDSA
    }

    struct PassportAttributes {
        string issuingState;
        string name;
        string passportNumber;
        string nationality;
        string dateOfBirth;
        string gender;
        string expiryDate;
        uint256 olderThan;
        bool ofacResult;
        address pubkey;
        bytes3[20] forbiddenCountries;
    }

    struct ProveCircuitProof {
        SignatureType signatureType;
        uint[2] a;
        uint[2][2] b;
        uint[2] c;
        uint[51] pubSignalsRSA;
        uint[28] pubSignalsECDSA;
    }

    struct PassportProof {
        uint256 proveVerifierId;
        uint256 dscVerifierId;
        ProveCircuitProof proveCircuitProof;
        IDscCircuitVerifier.DscCircuitProof dscCircuitProof;
    }

} 