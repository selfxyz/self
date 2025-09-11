// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {AttestationId} from "./AttestationId.sol";

/**
 * @title Circuit Constants Library
 * @notice This library defines constants representing indices used to access public signals
 *         of various circuits such as register, DSC, and VC/Disclose.
 * @dev These indices map directly to specific data fields in the corresponding circuits proofs.
 */
library CircuitConstantsV2 {
    // ---------------------------
    // Register Circuit Constants
    // ---------------------------

    /**
     * @notice Index to access the nullifier in the register circuit public signals.
     */
    uint256 constant REGISTER_NULLIFIER_INDEX = 0;

    /**
     * @notice Index to access the commitment in the register circuit public signals.
     */
    uint256 constant REGISTER_COMMITMENT_INDEX = 1;

    /**
     * @notice Index to access the Merkle root in the register circuit public signals.
     */
    uint256 constant REGISTER_MERKLE_ROOT_INDEX = 2;

    // ---------------------------
    // DSC Circuit Constants
    // ---------------------------

    /**
     * @notice Index to access the tree leaf in the DSC circuit public signals.
     */
    uint256 constant DSC_TREE_LEAF_INDEX = 0;

    /**
     * @notice Index to access the CSCA root in the DSC circuit public signals.
     */
    uint256 constant DSC_CSCA_ROOT_INDEX = 1;

    // ---------------------------
    // Aadhaar Circuit Constants
    // ---------------------------
    /**
     * @notice Index to access the pubkey commitment in the Aadhaar circuit public signals.
     */
    uint256 constant AADHAAR_UIDAI_PUBKEY_COMMITMENT_INDEX = 0;
    uint256 constant AADHAAR_NULLIFIER_INDEX = 1;
    uint256 constant AADHAAR_COMMITMENT_INDEX = 2;
    uint256 constant AADHAAR_TIMESTAMP_INDEX = 3;

    // -------------------------------------
    // VC and Disclose Circuit Constants
    // -------------------------------------

    /**
     * @notice Structure containing circuit indices for a specific attestation type.
     */
    struct DiscloseIndices {
        uint256 revealedDataPackedIndex;
        uint256 forbiddenCountriesListPackedIndex;
        uint256 nullifierIndex;
        uint256 attestationIdIndex;
        uint256 merkleRootIndex;
        uint256 currentDateIndex;
        uint256 namedobSmtRootIndex;
        uint256 nameyobSmtRootIndex;
        uint256 scopeIndex;
        uint256 userIdentifierIndex;
        uint256 passportNoSmtRootIndex;
    }

    /**
     * @notice Returns the circuit indices for a given attestation type.
     * @param attestationId The attestation identifier.
     * @return indices The DiscloseIndices struct containing all relevant indices.
     */
    function getDiscloseIndices(bytes32 attestationId) internal pure returns (DiscloseIndices memory indices) {
        if (attestationId == AttestationId.E_PASSPORT) {
            return
                DiscloseIndices({
                    revealedDataPackedIndex: 0,
                    forbiddenCountriesListPackedIndex: 3,
                    nullifierIndex: 7,
                    attestationIdIndex: 8,
                    merkleRootIndex: 9,
                    currentDateIndex: 10,
                    namedobSmtRootIndex: 17,
                    nameyobSmtRootIndex: 18,
                    scopeIndex: 19,
                    userIdentifierIndex: 20,
                    passportNoSmtRootIndex: 16
                });
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            return
                DiscloseIndices({
                    revealedDataPackedIndex: 0,
                    forbiddenCountriesListPackedIndex: 4,
                    nullifierIndex: 8,
                    attestationIdIndex: 9,
                    merkleRootIndex: 10,
                    currentDateIndex: 11,
                    namedobSmtRootIndex: 17,
                    nameyobSmtRootIndex: 18,
                    scopeIndex: 19,
                    userIdentifierIndex: 20,
                    passportNoSmtRootIndex: 99
                });
        } else if (attestationId == AttestationId.AADHAAR) {
            return
                DiscloseIndices({
                    revealedDataPackedIndex: 2,
                    forbiddenCountriesListPackedIndex: 6,
                    nullifierIndex: 0,
                    attestationIdIndex: 10,
                    merkleRootIndex: 16,
                    currentDateIndex: 11,
                    namedobSmtRootIndex: 14,
                    nameyobSmtRootIndex: 15,
                    scopeIndex: 17,
                    userIdentifierIndex: 18,
                    passportNoSmtRootIndex: 99
                });
        } else {
            revert("Invalid attestation ID");
        }
    }
}
