// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {AttestationId} from "../constants/AttestationId.sol";
import {CircuitConstantsV2} from "../constants/CircuitConstantsV2.sol";
import {GenericProofStruct} from "../interfaces/IRegisterCircuitVerifier.sol";
import {IRegisterCircuitVerifier} from "../interfaces/IRegisterCircuitVerifier.sol";
import {IAadhaarRegisterCircuitVerifier} from "../interfaces/IRegisterCircuitVerifier.sol";
import {ISelfricaRegisterCircuitVerifier} from "../interfaces/IRegisterCircuitVerifier.sol";
import {IIdentityRegistryV1} from "../interfaces/IIdentityRegistryV1.sol";
import {IIdentityRegistryIdCardV1} from "../interfaces/IIdentityRegistryIdCardV1.sol";
import {IIdentityRegistryAadhaarV1} from "../interfaces/IIdentityRegistryAadhaarV1.sol";
import {IIdentityRegistryKycV1} from "../interfaces/IIdentityRegistryKycV1.sol";

/**
 * @title RegisterProofVerifierLib
 * @notice Library for verifying register circuit proofs across different attestation types
 * @dev Handles the verification of register proofs for identity commitments.
 */
library RegisterProofVerifierLib {
    /// @notice Thrown when no verifier is set for a given signature type
    error NoVerifierSet();

    /// @notice Thrown when the register circuit proof is invalid
    error InvalidRegisterProof();

    /// @notice Thrown when the provided DSC commitment root is invalid
    error InvalidDscCommitmentRoot();

    /// @notice Thrown when an invalid attestation ID is provided
    error InvalidAttestationId();

    /// @notice Thrown when the pubkey is not valid
    error InvalidPubkey();

    /// @notice Thrown when the timestamp is invalid
    error InvalidUidaiTimestamp(uint256 blockTimestamp, uint256 timestamp);

    /// @notice Thrown when the pubkey commitment is invalid
    error InvalidPubkeyCommitment();

    /// @notice Thrown when the public signals length is invalid
    error InvalidPubSignalsLength(uint256 expected, uint256 actual);

    /**
     * @notice Verifies the register circuit proof for all attestation types
     * @dev Validates registry state and then verifies the cryptographic proof
     * @param attestationId The attestation ID
     * @param registerCircuitVerifierId The identifier for the register circuit verifier
     * @param registerCircuitProof The register circuit proof data
     * @param verifier The verifier contract address
     * @param registryAddress The registry contract address
     * @param aadhaarRegistrationWindow The AADHAAR registration window in minutes
     */
    function verifyRegisterProof(
        bytes32 attestationId,
        uint256 registerCircuitVerifierId,
        GenericProofStruct memory registerCircuitProof,
        address verifier,
        address registryAddress,
        uint256 aadhaarRegistrationWindow
    ) external view {
        if (verifier == address(0)) {
            revert NoVerifierSet();
        }

        // Perform attestation-specific registry checks
        if (attestationId == AttestationId.E_PASSPORT) {
            if (
                !IIdentityRegistryV1(registryAddress).checkDscKeyCommitmentMerkleRoot(
                    registerCircuitProof.pubSignals[CircuitConstantsV2.REGISTER_MERKLE_ROOT_INDEX]
                )
            ) {
                revert InvalidDscCommitmentRoot();
            }
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            if (
                !IIdentityRegistryIdCardV1(registryAddress).checkDscKeyCommitmentMerkleRoot(
                    registerCircuitProof.pubSignals[CircuitConstantsV2.REGISTER_MERKLE_ROOT_INDEX]
                )
            ) {
                revert InvalidDscCommitmentRoot();
            }
        } else if (attestationId == AttestationId.AADHAAR) {
            uint256 timestamp = registerCircuitProof.pubSignals[CircuitConstantsV2.AADHAAR_TIMESTAMP_INDEX];
            if (timestamp < (block.timestamp - (aadhaarRegistrationWindow * 1 minutes))) {
                revert InvalidUidaiTimestamp(block.timestamp, timestamp);
            }
            if (timestamp > (block.timestamp + (aadhaarRegistrationWindow * 1 minutes))) {
                revert InvalidUidaiTimestamp(block.timestamp, timestamp);
            }

            if (
                !IIdentityRegistryAadhaarV1(registryAddress).checkUidaiPubkey(
                    registerCircuitProof.pubSignals[CircuitConstantsV2.AADHAAR_UIDAI_PUBKEY_COMMITMENT_INDEX]
                )
            ) {
                revert InvalidPubkey();
            }
        } else if (attestationId == AttestationId.KYC) {
            if (
                !IIdentityRegistryKycV1(registryAddress).checkPubkeyCommitment(
                    registerCircuitProof.pubSignals[CircuitConstantsV2.SELFRICA_PUBKEY_COMMITMENT_INDEX]
                )
            ) {
                revert InvalidPubkeyCommitment();
            }
        } else {
            revert InvalidAttestationId();
        }

        // Verify the cryptographic proof
        if (attestationId == AttestationId.E_PASSPORT || attestationId == AttestationId.EU_ID_CARD) {
            if (registerCircuitProof.pubSignals.length != 3) {
                revert InvalidPubSignalsLength(3, registerCircuitProof.pubSignals.length);
            }
            uint256[3] memory pubSignals = [
                registerCircuitProof.pubSignals[0],
                registerCircuitProof.pubSignals[1],
                registerCircuitProof.pubSignals[2]
            ];
            if (
                !IRegisterCircuitVerifier(verifier).verifyProof(
                    registerCircuitProof.a,
                    registerCircuitProof.b,
                    registerCircuitProof.c,
                    pubSignals
                )
            ) {
                revert InvalidRegisterProof();
            }
        } else if (attestationId == AttestationId.AADHAAR) {
            if (registerCircuitProof.pubSignals.length != 4) {
                revert InvalidPubSignalsLength(4, registerCircuitProof.pubSignals.length);
            }
            uint256[4] memory pubSignals = [
                registerCircuitProof.pubSignals[0],
                registerCircuitProof.pubSignals[1],
                registerCircuitProof.pubSignals[2],
                registerCircuitProof.pubSignals[3]
            ];

            if (
                !IAadhaarRegisterCircuitVerifier(verifier).verifyProof(
                    registerCircuitProof.a,
                    registerCircuitProof.b,
                    registerCircuitProof.c,
                    pubSignals
                )
            ) {
                revert InvalidRegisterProof();
            }
        } else if (attestationId == AttestationId.KYC) {
            uint256[4] memory pubSignals = [
                registerCircuitProof.pubSignals[0],
                registerCircuitProof.pubSignals[1],
                registerCircuitProof.pubSignals[2],
                registerCircuitProof.pubSignals[3]
            ];
            if (
                !ISelfricaRegisterCircuitVerifier(verifier).verifyProof(
                    registerCircuitProof.a,
                    registerCircuitProof.b,
                    registerCircuitProof.c,
                    pubSignals
                )
            ) {
                revert InvalidRegisterProof();
            }
        }
    }
}
