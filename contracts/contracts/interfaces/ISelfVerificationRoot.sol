// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

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

    /**
     * @notice Verifies a self-proof
     * @param proof The proof data for verification and disclosure
     */
    function verifySelfProof(DiscloseCircuitProof memory proof) external;
}
