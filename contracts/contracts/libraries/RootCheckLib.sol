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
 * @title RootCheckLib
 * @notice Library for verifying identity commitment roots across different attestation types
 * @dev Handles the validation of identity commitment merkle roots.
 */
library RootCheckLib {
    /// @notice Thrown when the provided identity commitment root is invalid
    error InvalidIdentityCommitmentRoot();

    /// @notice Thrown when an invalid attestation ID is provided
    error InvalidAttestationId();

    /// @notice Thrown when the registry address is not set
    error RegistryNotSet();

    /**
     * @notice Performs identity commitment root verification
     * @param attestationId The attestation identifier
     * @param vcAndDiscloseProof The VC and Disclose proof containing the merkle root
     * @param indices Circuit-specific indices for extracting the merkle root
     * @param registryAddress The registry contract address
     */
    function performRootCheck(
        bytes32 attestationId,
        GenericProofStruct memory vcAndDiscloseProof,
        CircuitConstantsV2.DiscloseIndices memory indices,
        address registryAddress
    ) external view {
        if (registryAddress == address(0)) {
            revert RegistryNotSet();
        }

        uint256 merkleRoot = vcAndDiscloseProof.pubSignals[indices.merkleRootIndex];

        if (attestationId == AttestationId.E_PASSPORT) {
            if (!IIdentityRegistryV1(registryAddress).checkIdentityCommitmentRoot(merkleRoot)) {
                revert InvalidIdentityCommitmentRoot();
            }
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            if (!IIdentityRegistryIdCardV1(registryAddress).checkIdentityCommitmentRoot(merkleRoot)) {
                revert InvalidIdentityCommitmentRoot();
            }
        } else if (attestationId == AttestationId.AADHAAR) {
            if (!IIdentityRegistryAadhaarV1(registryAddress).checkIdentityCommitmentRoot(merkleRoot)) {
                revert InvalidIdentityCommitmentRoot();
            }
        } else if (attestationId == AttestationId.KYC) {
            if (!IIdentityRegistryKycV1(registryAddress).checkIdentityCommitmentRoot(merkleRoot)) {
                revert InvalidIdentityCommitmentRoot();
            }
        } else {
            revert InvalidAttestationId();
        }
    }
}
