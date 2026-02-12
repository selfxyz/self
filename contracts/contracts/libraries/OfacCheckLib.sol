// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {AttestationId} from "../constants/AttestationId.sol";
import {CircuitConstantsV2} from "../constants/CircuitConstantsV2.sol";
import {GenericProofStruct} from "../interfaces/IRegisterCircuitVerifier.sol";
import {IIdentityRegistryV1} from "../interfaces/IIdentityRegistryV1.sol";
import {IIdentityRegistryIdCardV1} from "../interfaces/IIdentityRegistryIdCardV1.sol";
import {IIdentityRegistryAadhaarV1} from "../interfaces/IIdentityRegistryAadhaarV1.sol";
import {IIdentityRegistryKycV1} from "../interfaces/IIdentityRegistryKycV1.sol";

/**
 * @title OfacCheckLib
 * @notice Library for verifying OFAC compliance roots across different attestation types
 * @dev Handles the validation of OFAC sanctions list merkle roots.
 */
library OfacCheckLib {
    /// @notice Thrown when the ofac roots don't match
    error InvalidOfacRoots();

    /// @notice Thrown when an invalid attestation ID is provided
    error InvalidAttestationId();

    /**
     * @notice Performs OFAC compliance verification
     * @param attestationId The attestation identifier
     * @param vcAndDiscloseProof The VC and Disclose proof containing OFAC roots
     * @param indices Circuit-specific indices for extracting OFAC roots
     * @param registryAddress The registry contract address
     */
    function performOfacCheck(
        bytes32 attestationId,
        GenericProofStruct memory vcAndDiscloseProof,
        CircuitConstantsV2.DiscloseIndices memory indices,
        address registryAddress
    ) external view {
        if (attestationId == AttestationId.E_PASSPORT) {
            if (
                !IIdentityRegistryV1(registryAddress).checkOfacRoots(
                    vcAndDiscloseProof.pubSignals[indices.passportNoSmtRootIndex],
                    vcAndDiscloseProof.pubSignals[indices.namedobSmtRootIndex],
                    vcAndDiscloseProof.pubSignals[indices.nameyobSmtRootIndex]
                )
            ) {
                revert InvalidOfacRoots();
            }
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            if (
                !IIdentityRegistryIdCardV1(registryAddress).checkOfacRoots(
                    vcAndDiscloseProof.pubSignals[indices.namedobSmtRootIndex],
                    vcAndDiscloseProof.pubSignals[indices.nameyobSmtRootIndex]
                )
            ) {
                revert InvalidOfacRoots();
            }
        } else if (attestationId == AttestationId.AADHAAR) {
            if (
                !IIdentityRegistryAadhaarV1(registryAddress).checkOfacRoots(
                    vcAndDiscloseProof.pubSignals[indices.namedobSmtRootIndex],
                    vcAndDiscloseProof.pubSignals[indices.nameyobSmtRootIndex]
                )
            ) {
                revert InvalidOfacRoots();
            }
        } else if (attestationId == AttestationId.KYC) {
            if (
                !IIdentityRegistryKycV1(registryAddress).checkOfacRoots(
                    vcAndDiscloseProof.pubSignals[indices.namedobSmtRootIndex],
                    vcAndDiscloseProof.pubSignals[indices.nameyobSmtRootIndex]
                )
            ) {
                revert InvalidOfacRoots();
            }
        } else {
            revert InvalidAttestationId();
        }
    }
}
