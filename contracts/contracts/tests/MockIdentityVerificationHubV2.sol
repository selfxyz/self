// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ISelfVerificationRoot} from "../interfaces/ISelfVerificationRoot.sol";
import {IIdentityVerificationHubV2} from "../interfaces/IIdentityVerificationHubV2.sol";
import {SelfStructs} from "../libraries/SelfStructs.sol";

/**
 * @title MockIdentityVerificationHubV2
 * @notice Mock Hub V2 for local testing. Skips ZK proof validation but performs
 *         the actual verify() → onVerificationSuccess() callback flow.
 * @dev Use setNextVerificationOutput() to configure what the mock returns
 *      on the next verify() call. This lets you test the full verifySelfProof()
 *      flow without real ZK proofs.
 */
contract MockIdentityVerificationHubV2 {
    // ====================================================
    // Storage
    // ====================================================

    /// @notice Stored verification configs (configId → config)
    mapping(bytes32 => SelfStructs.VerificationConfigV2) public configs;

    /// @notice Pre-configured output for the next verify() call
    ISelfVerificationRoot.GenericDiscloseOutputV2 private _nextOutput;
    bool private _hasNextOutput;

    /// @notice Track all verification events for debugging
    event MockVerification(
        address indexed caller,
        uint256 scope,
        bytes32 attestationId,
        bytes32 configId,
        uint256 userIdentifier
    );

    event MockCallback(address indexed target, uint256 userIdentifier, uint256 nullifier);

    // ====================================================
    // Config Management
    // ====================================================

    function setVerificationConfigV2(
        SelfStructs.VerificationConfigV2 memory config
    ) external returns (bytes32 configId) {
        configId = generateConfigId(config);
        configs[configId] = config;
        return configId;
    }

    function verificationConfigV2Exists(bytes32 configId) external view returns (bool) {
        // Check if olderThanEnabled or ofacEnabled are set (default struct has all false/0)
        // A simpler check: see if the configId was ever stored
        return generateConfigId(configs[configId]) == configId;
    }

    function generateConfigId(
        SelfStructs.VerificationConfigV2 memory config
    ) public pure returns (bytes32) {
        return sha256(abi.encode(config));
    }

    // ====================================================
    // Output Configuration
    // ====================================================

    /**
     * @notice Set the output that the next verify() call will return via callback.
     * @dev Call this BEFORE calling verifySelfProof() on your contract.
     * @param output The GenericDiscloseOutputV2 to pass to onVerificationSuccess
     */
    function setNextVerificationOutput(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output
    ) external {
        _nextOutput = output;
        _hasNextOutput = true;
    }

    // ====================================================
    // Verification (Mock)
    // ====================================================

    /**
     * @notice Mock verify() — decodes the input format, skips proof validation,
     *         and calls onVerificationSuccess() on msg.sender with the pre-configured output.
     * @dev Matches the real Hub V2 interface exactly. The baseVerificationInput format:
     *      | 1 byte contractVersion | 31 bytes buffer | 32 bytes scope | 32 bytes attestationId | proof data |
     *      The userContextData format:
     *      | 32 bytes configId | 32 bytes destChainId | 32 bytes userIdentifier | userData |
     */
    function verify(
        bytes calldata baseVerificationInput,
        bytes calldata userContextData
    ) external {
        require(_hasNextOutput, "MockHub: call setNextVerificationOutput first");
        require(baseVerificationInput.length >= 96, "MockHub: baseVerificationInput too short");
        require(userContextData.length >= 96, "MockHub: userContextData too short");

        // Decode baseVerificationInput
        uint256 scopeValue;
        bytes32 attestationId;
        assembly {
            // Skip 32 bytes (contractVersion + buffer), read scope
            scopeValue := calldataload(add(baseVerificationInput.offset, 32))
            // Read attestationId
            attestationId := calldataload(add(baseVerificationInput.offset, 64))
        }

        // Decode userContextData
        bytes32 configId = bytes32(userContextData[0:32]);
        uint256 destChainId = uint256(bytes32(userContextData[32:64]));
        uint256 userIdentifier = uint256(bytes32(userContextData[64:96]));
        bytes memory userData = userContextData[96:];

        emit MockVerification(msg.sender, scopeValue, attestationId, configId, userIdentifier);

        // Use the pre-configured output, overriding userIdentifier to match the request
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output = _nextOutput;
        // The userIdentifier in the output should match what the frontend set
        // (in production, the circuit enforces this; here we trust the pre-configured output)

        // Encode the output the same way the real Hub does
        bytes memory encodedOutput = abi.encode(output);

        emit MockCallback(msg.sender, output.userIdentifier, output.nullifier);

        // Clear for next call
        _hasNextOutput = false;

        // Callback — same as real Hub V2 (IdentityVerificationHubImplV2.sol:690)
        ISelfVerificationRoot(msg.sender).onVerificationSuccess(encodedOutput, userData);
    }

    // ====================================================
    // Direct Callback (for testing without verifySelfProof)
    // ====================================================

    /**
     * @notice Directly call onVerificationSuccess on a target contract.
     *         Useful for unit tests that bypass verifySelfProof().
     */
    function simulateCallback(
        address target,
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) external {
        bytes memory encodedOutput = abi.encode(output);
        ISelfVerificationRoot(target).onVerificationSuccess(encodedOutput, userData);
    }

    // ====================================================
    // Stub implementations for IIdentityVerificationHubV2
    // ====================================================

    function registry(bytes32) external pure returns (address) { return address(0); }
    function discloseVerifier(bytes32) external pure returns (address) { return address(0); }
    function registerCircuitVerifiers(bytes32, uint256) external pure returns (address) { return address(0); }
    function dscCircuitVerifiers(bytes32, uint256) external pure returns (address) { return address(0); }
    function rootTimestamp(bytes32, uint256) external pure returns (uint256) { return 0; }
    function getIdentityCommitmentMerkleRoot(bytes32) external pure returns (uint256) { return 0; }
}
