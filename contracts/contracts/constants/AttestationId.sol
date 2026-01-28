// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title AttestationId Library
 * @notice This library provides attestation identifiers used across contracts.
 * @dev Contains constants for all supported attestation types:
 *      - E_PASSPORT (1): Electronic passports with NFC chip
 *      - EU_ID_CARD (2): EU biometric ID cards with NFC chip
 *      - AADHAAR (3): Indian Aadhaar identity documents
 *      - KYC (4): African identity documents via SumSub
 */
library AttestationId {
    /// @notice Identifier for an E-PASSPORT attestation (electronic passports with NFC chip).
    bytes32 constant E_PASSPORT = bytes32(uint256(1));

    /// @notice Identifier for an EU_ID_CARD attestation (EU biometric ID cards with NFC chip).
    bytes32 constant EU_ID_CARD = bytes32(uint256(2));

    /// @notice Identifier for an AADHAAR attestation (Indian Aadhaar identity documents).
    bytes32 constant AADHAAR = bytes32(uint256(3));

    /// @notice Identifier for a KYC attestation (African identity documents via SumSub).
    bytes32 constant KYC = bytes32(uint256(4));
}
