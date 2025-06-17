// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IRegisterCircuitVerifier} from "./IRegisterCircuitVerifier.sol";
import {IDscCircuitVerifier} from "./IDscCircuitVerifier.sol";
import {SelfStructs} from "../libraries/SelfStructs.sol";

/**
 * @title IIdentityVerificationHubV2
 * @notice Interface for the Identity Verification Hub V2 for verifying zero-knowledge proofs.
 * @dev Defines all external and public functions from IdentityVerificationHubImplV2.
 */
interface IIdentityVerificationHubV2 {
    // ====================================================
    // External Functions
    // ====================================================

    /**
     * @notice Registers a commitment using a register circuit proof.
     * @dev Verifies the register circuit proof and then calls the Identity Registry to register the commitment.
     * @param attestationId The attestation ID.
     * @param registerCircuitVerifierId The identifier for the register circuit verifier to use.
     * @param registerCircuitProof The register circuit proof data.
     */
    function registerCommitment(
        bytes32 attestationId,
        uint256 registerCircuitVerifierId,
        IRegisterCircuitVerifier.RegisterCircuitProof memory registerCircuitProof
    ) external;

    /**
     * @notice Registers a DSC key commitment using a DSC circuit proof.
     * @dev Verifies the DSC proof and then calls the Identity Registry to register the dsc key commitment.
     * @param attestationId The attestation ID.
     * @param dscCircuitVerifierId The identifier for the DSC circuit verifier to use.
     * @param dscCircuitProof The DSC circuit proof data.
     */
    function registerDscKeyCommitment(
        bytes32 attestationId,
        uint256 dscCircuitVerifierId,
        IDscCircuitVerifier.DscCircuitProof memory dscCircuitProof
    ) external;

    /**
     * @notice Sets verification config in V2 storage (owner only)
     * @dev The configId is automatically generated from the config content using sha256(abi.encode(config))
     * @param config The verification configuration
     * @return configId The generated config ID
     */
    function setVerificationConfigV2(
        SelfStructs.VerificationConfigV2 memory config
    ) external returns (bytes32 configId);

    /**
     * @notice Main verification function with new structured input format
     * @param baseVerificationInput The base verification input data
     * @param userContextData The user context data
     */
    function verify(bytes calldata baseVerificationInput, bytes calldata userContextData) external;

    /**
     * @notice Updates the registry address.
     * @param attestationId The attestation ID.
     * @param registryAddress The new registry address.
     */
    function updateRegistry(bytes32 attestationId, address registryAddress) external;

    /**
     * @notice Updates the VC and Disclose circuit verifier address.
     * @param attestationId The attestation ID.
     * @param vcAndDiscloseCircuitVerifierAddress The new VC and Disclose circuit verifier address.
     */
    function updateVcAndDiscloseCircuit(bytes32 attestationId, address vcAndDiscloseCircuitVerifierAddress) external;

    /**
     * @notice Updates the register circuit verifier for a specific signature type.
     * @param attestationId The attestation identifier.
     * @param typeId The signature type identifier.
     * @param verifierAddress The new register circuit verifier address.
     */
    function updateRegisterCircuitVerifier(bytes32 attestationId, uint256 typeId, address verifierAddress) external;

    /**
     * @notice Updates the DSC circuit verifier for a specific signature type.
     * @param attestationId The attestation identifier.
     * @param typeId The signature type identifier.
     * @param verifierAddress The new DSC circuit verifier address.
     */
    function updateDscVerifier(bytes32 attestationId, uint256 typeId, address verifierAddress) external;

    /**
     * @notice Batch updates register circuit verifiers.
     * @param attestationIds An array of attestation identifiers.
     * @param typeIds An array of signature type identifiers.
     * @param verifierAddresses An array of new register circuit verifier addresses.
     */
    function batchUpdateRegisterCircuitVerifiers(
        bytes32[] calldata attestationIds,
        uint256[] calldata typeIds,
        address[] calldata verifierAddresses
    ) external;

    /**
     * @notice Batch updates DSC circuit verifiers.
     * @param attestationIds An array of attestation identifiers.
     * @param typeIds An array of signature type identifiers.
     * @param verifierAddresses An array of new DSC circuit verifier addresses.
     */
    function batchUpdateDscCircuitVerifiers(
        bytes32[] calldata attestationIds,
        uint256[] calldata typeIds,
        address[] calldata verifierAddresses
    ) external;

    // ====================================================
    // External View Functions
    // ====================================================

    /**
     * @notice Returns the registry address for a given attestation ID.
     * @param attestationId The attestation ID to query.
     * @return The registry address associated with the attestation ID.
     */
    function registry(bytes32 attestationId) external view returns (address);

    /**
     * @notice Returns the disclose verifier address for a given attestation ID.
     * @param attestationId The attestation ID to query.
     * @return The disclose verifier address associated with the attestation ID.
     */
    function discloseVerifier(bytes32 attestationId) external view returns (address);

    /**
     * @notice Returns the register circuit verifier address for a given attestation ID and type ID.
     * @param attestationId The attestation ID to query.
     * @param typeId The type ID to query.
     * @return The register circuit verifier address associated with the attestation ID and type ID.
     */
    function registerCircuitVerifiers(bytes32 attestationId, uint256 typeId) external view returns (address);

    /**
     * @notice Returns the DSC circuit verifier address for a given attestation ID and type ID.
     * @param attestationId The attestation ID to query.
     * @param typeId The type ID to query.
     * @return The DSC circuit verifier address associated with the attestation ID and type ID.
     */
    function dscCircuitVerifiers(bytes32 attestationId, uint256 typeId) external view returns (address);

    /**
     * @notice Returns the merkle root timestamp for a given attestation ID and root.
     * @param attestationId The attestation ID to query.
     * @param root The merkle root to query.
     * @return The merkle root timestamp associated with the attestation ID and root.
     */
    function rootTimestamp(bytes32 attestationId, uint256 root) external view returns (uint256);

    /**
     * @notice Returns the identity commitment merkle root for a given attestation ID.
     * @param attestationId The attestation ID to query.
     * @return The identity commitment merkle root associated with the attestation ID.
     */
    function getIdentityCommitmentMerkleRoot(bytes32 attestationId) external view returns (uint256);

    /**
     * @notice Checks if a verification config exists
     * @param configId The configuration identifier
     * @return exists Whether the config exists
     */
    function verificationConfigV2Exists(bytes32 configId) external view returns (bool exists);

    // ====================================================
    // Public Functions
    // ====================================================

    /**
     * @notice Generates a config ID from a verification config
     * @param config The verification configuration
     * @return The generated config ID (sha256 hash of encoded config)
     */
    function generateConfigId(SelfStructs.VerificationConfigV2 memory config) external pure returns (bytes32);
}
