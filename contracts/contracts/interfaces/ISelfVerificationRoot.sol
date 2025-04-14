// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IVcAndDiscloseCircuitVerifier} from "./IVcAndDiscloseCircuitVerifier.sol";

interface ISelfVerificationRoot {

    struct VerificationConfig {
        bool olderThanEnabled;
        uint256 olderThan;
        bool forbiddenCountriesEnabled;
        uint256[4] forbiddenCountriesListPacked;
        bool[3] ofacEnabled;
    }

    struct DiscloseCircuitProof {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
        uint256[21] pubSignals;
    }
    
    function verifySelfProof(
        DiscloseCircuitProof memory proof
    ) external;

}