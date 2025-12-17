// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title IVcAndDiscloseCircuitVerifier
 * @notice Interface for verifying zero-knowledge proofs related to VC and Disclose circuits.
 * @dev This interface defines the structure of a VC and Disclose proof and a function to verify such proofs.
 */

interface IVcAndDiscloseCircuitVerifier {
    struct VcAndDiscloseProof {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
        uint256[21] pubSignals;
    }

    /**
     * @notice Verifies a given VC and Disclose zero-knowledge proof.
     * @dev This function checks the validity of the provided proof parameters.
     * @param a The 'a' component of the proof.
     * @param b The 'b' component of the proof.
     * @param c The 'c' component of the proof.
     * @param pubSignals The public signals associated with the proof.
     * @return A boolean value indicating whether the proof is valid (true) or not (false).
     */
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[21] calldata pubSignals
    ) external view returns (bool);
}

interface IVcAndDiscloseAadhaarCircuitVerifier {
    /**
     * @notice Verifies a given VC and Disclose zero-knowledge proof.
     * @dev This function checks the validity of the provided proof parameters.
     * @param a The 'a' component of the proof.
     * @param b The 'b' component of the proof.
     * @param c The 'c' component of the proof.
     * @param pubSignals The public signals associated with the proof.
     * @return A boolean value indicating whether the proof is valid (true) or not (false).
     */
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[19] calldata pubSignals
    ) external view returns (bool);
}

interface IVcAndDiscloseSelfricaCircuitVerifier {
    /**
     * @notice Verifies a given VC and Disclose zero-knowledge proof.
     * @dev This function checks the validity of the provided proof parameters.
     * @param a The 'a' component of the proof.
     * @param b The 'b' component of the proof.
     * @param c The 'c' component of the proof.
     * @param pubSignals The public signals associated with the proof.
     * @return A boolean value indicating whether the proof is valid (true) or not (false).
     */
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[30] calldata pubSignals
    ) external view returns (bool);
}
