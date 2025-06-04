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
     * @notice Verifies a self-proof using bytes-based relayer data
     * @param relayerData Packed data from relayer in format: | 1 byte circuitVersion | 1 byte contractVersion | 30 bytes buffer | 32 bytes attestationId | 32 bytes scope | proof data |
     */
    function verifySelfProof(bytes calldata relayerData) external;
}
