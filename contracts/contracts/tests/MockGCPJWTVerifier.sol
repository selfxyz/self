// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title MockGCPJWTVerifier
 * @notice Configurable mock verifier for testing GCP JWT proof verification
 * @dev Allows testing both valid and invalid proof scenarios.
 *      Note: verifyProof is a view function to match the IGCPJWTVerifier interface,
 *      so it cannot track call counts. Use separate testing methods if call tracking is needed.
 */
contract MockGCPJWTVerifier {
    /// @notice Whether the verifier should return true or false
    bool private _shouldVerify;

    constructor() {
        _shouldVerify = true; // Default to passing verification
    }

    /**
     * @notice Mock implementation of proof verification
     * @dev This is a view function to match IGCPJWTVerifier interface
     * @param pA Groth16 proof element A (ignored in mock)
     * @param pB Groth16 proof element B (ignored in mock)
     * @param pC Groth16 proof element C (ignored in mock)
     * @param pubSignals Circuit public signals (ignored in mock)
     * @return Whether the proof is valid (configurable via setShouldVerify)
     */
    function verifyProof(
        uint256[2] calldata pA,
        uint256[2][2] calldata pB,
        uint256[2] calldata pC,
        uint256[19] calldata pubSignals
    ) external view returns (bool) {
        // Silence unused variable warnings
        pA;
        pB;
        pC;
        pubSignals;

        return _shouldVerify;
    }

    /**
     * @notice Set whether the verifier should pass or fail
     * @param shouldVerify True to pass verification, false to fail
     */
    function setShouldVerify(bool shouldVerify) external {
        _shouldVerify = shouldVerify;
    }

    /**
     * @notice Get current verification setting
     * @return Current shouldVerify value
     */
    function getShouldVerify() external view returns (bool) {
        return _shouldVerify;
    }
}
