// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {AttestationId} from "../constants/AttestationId.sol";
import {CircuitConstantsV2} from "../constants/CircuitConstantsV2.sol";
import {IDscCircuitVerifier} from "../interfaces/IDscCircuitVerifier.sol";
import {IIdentityRegistryV1} from "../interfaces/IIdentityRegistryV1.sol";
import {IIdentityRegistryIdCardV1} from "../interfaces/IIdentityRegistryIdCardV1.sol";

/**
 * @title DscProofVerifierLib
 * @notice Library for verifying DSC circuit proofs across different attestation types
 * @dev Handles the verification of DSC proofs for document signer certificates.
 */
library DscProofVerifierLib {
    /// @notice Thrown when no verifier is set for a given signature type
    error NoVerifierSet();

    /// @notice Thrown when the DSC circuit proof is invalid
    error InvalidDscProof();

    /// @notice Thrown when the provided CSCA root is invalid
    error InvalidCscaRoot();

    /// @notice Thrown when an invalid attestation ID is provided
    error InvalidAttestationId();

    /**
     * @notice Verifies the DSC circuit proof
     * @dev Validates CSCA root and then verifies the cryptographic proof
     * @param attestationId The attestation ID
     * @param dscCircuitVerifierId The identifier for the DSC circuit verifier
     * @param dscCircuitProof The DSC circuit proof data
     * @param verifier The verifier contract address
     * @param registryAddress The registry contract address
     */
    function verifyDscProof(
        bytes32 attestationId,
        uint256 dscCircuitVerifierId,
        IDscCircuitVerifier.DscCircuitProof memory dscCircuitProof,
        address verifier,
        address registryAddress
    ) external view {
        if (verifier == address(0)) {
            revert NoVerifierSet();
        }

        // Validate CSCA root based on attestation type
        if (attestationId == AttestationId.E_PASSPORT) {
            if (
                !IIdentityRegistryV1(registryAddress).checkCscaRoot(
                    dscCircuitProof.pubSignals[CircuitConstantsV2.DSC_CSCA_ROOT_INDEX]
                )
            ) {
                revert InvalidCscaRoot();
            }
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            if (
                !IIdentityRegistryIdCardV1(registryAddress).checkCscaRoot(
                    dscCircuitProof.pubSignals[CircuitConstantsV2.DSC_CSCA_ROOT_INDEX]
                )
            ) {
                revert InvalidCscaRoot();
            }
        } else {
            revert InvalidAttestationId();
        }

        // Verify the cryptographic proof
        if (
            !IDscCircuitVerifier(verifier).verifyProof(
                dscCircuitProof.a,
                dscCircuitProof.b,
                dscCircuitProof.c,
                dscCircuitProof.pubSignals
            )
        ) {
            revert InvalidDscProof();
        }
    }
}
