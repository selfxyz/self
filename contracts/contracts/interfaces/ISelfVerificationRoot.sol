// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface ISelfVerificationRoot {

    struct DiscloseCircuitProof {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
        uint256[21] pubSignals;
    }

    // TODO: use this struct
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

    /**
     * @notice Verifies a self-proof using bytes-based relayer data
     * @param relayerData Packed data from relayer in format: | 1 byte circuitVersion | 1 byte contractVersion | 30 bytes buffer | 32 bytes attestationId | 32 bytes scope | proof data |
     */
    function verifySelfProof(
        bytes calldata proofData,
        bytes calldata additionalData
    ) external;

    function onVerificationSuccess(
        bytes memory verificationData,
        bytes memory userDefinedData
    ) external;
}
