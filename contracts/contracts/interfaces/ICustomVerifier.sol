// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SelfStructs} from "../libraries/SelfStructs.sol";

/**
 * @title ICustomVerifier
 * @notice Interface for the custom verifier contract
 */
interface ICustomVerifier {
    /**
     * @notice Verifies the configuration and returns the generic disclose output
     * @param attestationId The attestation ID (E_PASSPORT, EU_ID_CARD, or AADHAAR)
     * @param config The verification config encoded as bytes
     * @param proofOutput The proof output encoded as bytes
     * @return genericDiscloseOutput The generic disclose output
     */
    function customVerify(
        bytes32 attestationId,
        bytes calldata config,
        bytes calldata proofOutput
    ) external pure returns (SelfStructs.GenericDiscloseOutputV2 memory);
}



