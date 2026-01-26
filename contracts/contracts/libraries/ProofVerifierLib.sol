// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {AttestationId} from "../constants/AttestationId.sol";
import {GenericProofStruct} from "../interfaces/IRegisterCircuitVerifier.sol";
import {IVcAndDiscloseCircuitVerifier} from "../interfaces/IVcAndDiscloseCircuitVerifier.sol";
import {IVcAndDiscloseAadhaarCircuitVerifier} from "../interfaces/IVcAndDiscloseCircuitVerifier.sol";
import {IVcAndDiscloseSelfricaCircuitVerifier} from "../interfaces/IVcAndDiscloseCircuitVerifier.sol";

/**
 * @title ProofVerifierLib
 * @notice Library for verifying Groth16 proofs across different attestation types
 * @dev Handles the verification of zero-knowledge proofs for different attestation types,
 * converting dynamic arrays to fixed-size arrays as required by the verifier interfaces.
 */
library ProofVerifierLib {
    /// @notice Thrown when the VC and Disclose proof is invalid
    error InvalidVcAndDiscloseProof();

    /// @notice Thrown when an invalid attestation ID is provided
    error InvalidAttestationId();

    /**
     * @notice Verifies Groth16 proof for VC and Disclose circuit
     * @dev Handles different attestation types with different public signal counts:
     * - E_PASSPORT and EU_ID_CARD: 21 public signals
     * - AADHAAR: 19 public signals
     * - SELFRICA_ID_CARD: 28 public signals
     * @param attestationId The type of attestation being verified
     * @param verifierAddress The address of the verifier contract
     * @param vcAndDiscloseProof The proof data including public signals
     */
    function verifyGroth16Proof(
        bytes32 attestationId,
        address verifierAddress,
        GenericProofStruct memory vcAndDiscloseProof
    ) external view {
        if (attestationId == AttestationId.E_PASSPORT || attestationId == AttestationId.EU_ID_CARD) {
            uint256[21] memory pubSignals;
            for (uint256 i = 0; i < 21; i++) {
                pubSignals[i] = vcAndDiscloseProof.pubSignals[i];
            }
            if (
                !IVcAndDiscloseCircuitVerifier(verifierAddress).verifyProof(
                    vcAndDiscloseProof.a,
                    vcAndDiscloseProof.b,
                    vcAndDiscloseProof.c,
                    pubSignals
                )
            ) {
                revert InvalidVcAndDiscloseProof();
            }
        } else if (attestationId == AttestationId.AADHAAR) {
            uint256[19] memory pubSignals;
            for (uint256 i = 0; i < 19; i++) {
                pubSignals[i] = vcAndDiscloseProof.pubSignals[i];
            }

            if (
                !IVcAndDiscloseAadhaarCircuitVerifier(verifierAddress).verifyProof(
                    vcAndDiscloseProof.a,
                    vcAndDiscloseProof.b,
                    vcAndDiscloseProof.c,
                    pubSignals
                )
            ) {
                revert InvalidVcAndDiscloseProof();
            }
        } else if (attestationId == AttestationId.KYC) {
            uint256[30] memory pubSignals;
            for (uint256 i = 0; i < 30; i++) {
                pubSignals[i] = vcAndDiscloseProof.pubSignals[i];
            }

            if (
                !IVcAndDiscloseSelfricaCircuitVerifier(verifierAddress).verifyProof(
                    vcAndDiscloseProof.a,
                    vcAndDiscloseProof.b,
                    vcAndDiscloseProof.c,
                    pubSignals
                )
            ) {
                revert InvalidVcAndDiscloseProof();
            }
        } else {
            revert InvalidAttestationId();
        }
    }
}
