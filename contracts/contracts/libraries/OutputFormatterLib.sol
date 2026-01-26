// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SelfStructs} from "./SelfStructs.sol";
import {Formatter} from "./Formatter.sol";
import {CircuitConstantsV2} from "../constants/CircuitConstantsV2.sol";
import {GenericProofStruct} from "../interfaces/IRegisterCircuitVerifier.sol";

/**
 * @title OutputFormatterLib
 * @notice Library for creating attestation-specific output structures
 * @dev Handles the formatting of verification outputs for different attestation types.
 */
library OutputFormatterLib {
    /**
     * @notice Creates passport output struct from proof data
     * @param vcAndDiscloseProof The verified proof containing passport data
     * @param indices Circuit-specific indices for extracting values
     * @param attestationId The attestation identifier
     * @param userIdentifier The user identifier
     * @return Encoded PassportOutput struct
     */
    function createPassportOutput(
        GenericProofStruct memory vcAndDiscloseProof,
        CircuitConstantsV2.DiscloseIndices memory indices,
        bytes32 attestationId,
        uint256 userIdentifier
    ) external pure returns (bytes memory) {
        SelfStructs.PassportOutput memory passportOutput;
        passportOutput.attestationId = uint256(attestationId);
        passportOutput.userIdentifier = userIdentifier;
        passportOutput.nullifier = vcAndDiscloseProof.pubSignals[indices.nullifierIndex];

        // Extract revealed data
        uint256[3] memory revealedDataPacked;
        for (uint256 i = 0; i < 3; i++) {
            revealedDataPacked[i] = vcAndDiscloseProof.pubSignals[indices.revealedDataPackedIndex + i];
        }
        passportOutput.revealedDataPacked = Formatter.fieldElementsToBytes(revealedDataPacked);

        // Extract forbidden countries list
        for (uint256 i = 0; i < 4; i++) {
            passportOutput.forbiddenCountriesListPacked[i] = vcAndDiscloseProof.pubSignals[
                indices.forbiddenCountriesListPackedIndex + i
            ];
        }

        return abi.encode(passportOutput);
    }

    /**
     * @notice Creates EU ID card output struct from proof data
     * @param vcAndDiscloseProof The verified proof containing EU ID data
     * @param indices Circuit-specific indices for extracting values
     * @param attestationId The attestation identifier
     * @param userIdentifier The user identifier
     * @return Encoded EuIdOutput struct
     */
    function createEuIdOutput(
        GenericProofStruct memory vcAndDiscloseProof,
        CircuitConstantsV2.DiscloseIndices memory indices,
        bytes32 attestationId,
        uint256 userIdentifier
    ) external pure returns (bytes memory) {
        SelfStructs.EuIdOutput memory euIdOutput;
        euIdOutput.attestationId = uint256(attestationId);
        euIdOutput.userIdentifier = userIdentifier;
        euIdOutput.nullifier = vcAndDiscloseProof.pubSignals[indices.nullifierIndex];

        // Extract revealed data
        uint256[4] memory revealedDataPacked;
        for (uint256 i = 0; i < 4; i++) {
            revealedDataPacked[i] = vcAndDiscloseProof.pubSignals[indices.revealedDataPackedIndex + i];
        }
        euIdOutput.revealedDataPacked = Formatter.fieldElementsToBytesIdCard(revealedDataPacked);

        // Extract forbidden countries list
        for (uint256 i = 0; i < 4; i++) {
            euIdOutput.forbiddenCountriesListPacked[i] = vcAndDiscloseProof.pubSignals[
                indices.forbiddenCountriesListPackedIndex + i
            ];
        }

        return abi.encode(euIdOutput);
    }

    /**
     * @notice Creates Aadhaar output struct from proof data
     * @param vcAndDiscloseProof The verified proof containing Aadhaar data
     * @param indices Circuit-specific indices for extracting values
     * @param attestationId The attestation identifier
     * @param userIdentifier The user identifier
     * @return Encoded AadhaarOutput struct
     */
    function createAadhaarOutput(
        GenericProofStruct memory vcAndDiscloseProof,
        CircuitConstantsV2.DiscloseIndices memory indices,
        bytes32 attestationId,
        uint256 userIdentifier
    ) external pure returns (bytes memory) {
        SelfStructs.AadhaarOutput memory aadhaarOutput;
        aadhaarOutput.attestationId = uint256(attestationId);
        aadhaarOutput.userIdentifier = userIdentifier;
        aadhaarOutput.nullifier = vcAndDiscloseProof.pubSignals[indices.nullifierIndex];

        uint256[4] memory revealedDataPacked;
        for (uint256 i = 0; i < 4; i++) {
            revealedDataPacked[i] = vcAndDiscloseProof.pubSignals[indices.revealedDataPackedIndex + i];
        }
        aadhaarOutput.revealedDataPacked = Formatter.fieldElementsToBytesAadhaar(revealedDataPacked);

        return abi.encode(aadhaarOutput);
    }

    /**
     * @notice Creates KYC ID output struct from proof data
     * @param vcAndDiscloseProof The verified proof containing KYC ID data
     * @param indices Circuit-specific indices for extracting values
     * @param attestationId The attestation identifier
     * @param userIdentifier The user identifier
     * @return Encoded KycOutput struct
     */
    function createKycOutput(
        GenericProofStruct memory vcAndDiscloseProof,
        CircuitConstantsV2.DiscloseIndices memory indices,
        bytes32 attestationId,
        uint256 userIdentifier
    ) external pure returns (bytes memory) {
        SelfStructs.KycOutput memory kycOutput;
        kycOutput.attestationId = uint256(attestationId);
        kycOutput.userIdentifier = userIdentifier;
        kycOutput.nullifier = vcAndDiscloseProof.pubSignals[indices.nullifierIndex];

        uint256[11] memory revealedDataPacked;
        for (uint256 i = 0; i < 11; i++) {
            revealedDataPacked[i] = vcAndDiscloseProof.pubSignals[indices.revealedDataPackedIndex + i];
        }
        kycOutput.revealedDataPacked = Formatter.fieldElementsToBytesKyc(revealedDataPacked);

        return abi.encode(kycOutput);
    }
}
