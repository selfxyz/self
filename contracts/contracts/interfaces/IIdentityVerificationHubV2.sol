// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IRegisterCircuitVerifier} from "./IRegisterCircuitVerifier.sol";
import {IDscCircuitVerifier} from "./IDscCircuitVerifier.sol";
import {IVcAndDiscloseCircuitVerifier} from "./IVcAndDiscloseCircuitVerifier.sol";
import {CircuitConstants} from "../constants/CircuitConstants.sol";

/**
 * @title IIdentityVerificationHubV2
 * @notice Interface for the Identity Verification Hub for verifying zero-knowledge proofs using VC and Disclose circuits.
 * @dev Defines data structures and external functions for verifying proofs and recovering human-readable data.
 */
interface IIdentityVerificationHubV2 {
    /**
     * @notice Enum representing types of data that may be revealed.
     */
    enum RevealedDataType {
        ISSUING_STATE, // The issuing state of the passport.
        NAME, // The full name of the passport holder.
        PASSPORT_NUMBER, // The passport number.
        NATIONALITY, // The nationality.
        DATE_OF_BIRTH, // The date of birth.
        GENDER, // The gender.
        EXPIRY_DATE, // The passport expiry date.
        OLDER_THAN, // The "older than" age verification value.
        PASSPORT_NO_OFAC, // The passport number OFAC status.
        NAME_AND_DOB_OFAC, // The name and date of birth OFAC verification result.
        NAME_AND_YOB_OFAC // The name and year of birth OFAC verification result.
    }

    /**
     * @notice Structure representing the verification result of a VC and Disclose proof.
     * @param attestationId The attestation identifier from the proof.
     * @param scope The scope of the verification.
     * @param userIdentifier Unique identifier for the user.
     * @param nullifier A value used to prevent double registration.
     * @param identityCommitmentRoot The root of the identity commitment.
     * @param revealedDataPacked Packed revealed data.
     * @param forbiddenCountriesListPacked Packed forbidden countries list.
     */
    struct VcAndDiscloseVerificationResult {
        uint256 attestationId;
        uint256 scope;
        uint256 userIdentifier;
        uint256 nullifier;
        uint256 identityCommitmentRoot;
        uint256[3] revealedDataPacked;
        uint256[4] forbiddenCountriesListPacked;
    }

    struct IdCardVcAndDiscloseVerificationResult {
        uint256 attestationId;
        uint256 scope;
        uint256 userIdentifier;
        uint256 nullifier;
        uint256 identityCommitmentRoot;
        uint256[4] revealedDataPacked;
        uint256[4] forbiddenCountriesListPacked;
    }

    /**
     * @notice Structure representing a hub proof for VC and Disclose verification.
     * @param olderThanEnabled Flag indicating if the 'olderThan' check is required.
     * @param olderThan Threshold age for verification.
     * @param forbiddenCountriesEnabled Flag indicating if forbidden countries verification is required.
     * @param forbiddenCountriesListPacked Packed forbidden countries list.
     * @param ofacEnabled Array of flags indicating which OFAC checks are enabled. [passportNo, nameAndDob, nameAndYob]
     * @param vcAndDiscloseProof The underlying VC and Disclose proof.
     */
    struct VcAndDiscloseHubProof {
        bool olderThanEnabled;
        uint256 olderThan;
        bool forbiddenCountriesEnabled;
        uint256[4] forbiddenCountriesListPacked;
        bool[3] ofacEnabled;
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof vcAndDiscloseProof;
    }

    struct IdCardVcAndDiscloseHubProof {
        bool olderThanEnabled;
        uint256 olderThan;
        bool forbiddenCountriesEnabled;
        uint256[4] forbiddenCountriesListPacked;
        bool[2] ofacEnabled;
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof vcAndDiscloseProof;
    }

    /**
     * @notice Verifies a VC and Disclose proof.
     * @dev Checks the provided proof against verification configuration and returns key result data.
     * @param proof The hub proof containing configuration flags and the underlying VC and Disclose proof.
     * @return result The verification result including attestationId, scope, userIdentifier, nullifier, identityCommitmentRoot, revealed data, and forbidden countries list.
     */
    function verifyVcAndDisclose(
        VcAndDiscloseHubProof memory proof
    ) external view returns (VcAndDiscloseVerificationResult memory result);

    /**
     * @notice Verifies a EU ID Card VC and Disclose proof.
     * @dev Checks the provided proof against verification configuration and returns key result data.
     * @param proof The hub proof containing configuration flags and the underlying VC and Disclose proof.
     * @return result The verification result including attestationId, scope, userIdentifier, nullifier, identityCommitmentRoot, revealed data, and forbidden countries list.
     */
    function verifyEuIdVcAndDisclose(
        IdCardVcAndDiscloseHubProof memory proof
    ) external view returns (IdCardVcAndDiscloseVerificationResult memory result);

    /**
     * @notice Registers a passport commitment using a register circuit proof.
     * @dev Verifies the proof and then calls the Identity Registry to register the commitment.
     * @param attestationId The attestation identifier.
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
     * @dev Verifies the DSC circuit proof before registering the DSC key commitment.
     * @param attestationId The attestation identifier.
     * @param dscCircuitVerifierId The identifier for the DSC circuit verifier to be used.
     * @param dscCircuitProof The proof data for the DSC circuit.
     */
    function registerDscKeyCommitment(
        bytes32 attestationId,
        uint256 dscCircuitVerifierId,
        IDscCircuitVerifier.DscCircuitProof memory dscCircuitProof
    ) external;

    /**
     * @notice Returns the address of the Identity Registry for a specific attestation type.
     * @param attestationId The attestation identifier.
     * @return registryAddr The address of the Identity Registry contract.
     */
    function registry(bytes32 attestationId) external view returns (address registryAddr);

    /**
     * @notice Returns the address of the VC and Disclose circuit verifier for a specific attestation type.
     * @param attestationId The attestation identifier.
     * @return verifierAddr The address of the VC and Disclose circuit verifier.
     */
    function vcAndDiscloseCircuitVerifier(bytes32 attestationId) external view returns (address verifierAddr);

    /**
     * @notice Retrieves the register circuit verifier for a given signature type.
     * @param typeId The signature type identifier.
     * @return verifier The address of the register circuit verifier.
     */
    function sigTypeToRegisterCircuitVerifiers(uint256 typeId) external view returns (address verifier);

    /**
     * @notice Retrieves the DSC circuit verifier for a given signature type.
     * @param typeId The signature type identifier.
     * @return verifier The address of the DSC circuit verifier.
     */
    function sigTypeToDscCircuitVerifiers(uint256 typeId) external view returns (address verifier);

    /**
     * @notice Updates the registry address.
     * @param attestationId The attestation identifier.
     * @param registryAddress The new registry address.
     */
    function updateRegistry(bytes32 attestationId, address registryAddress) external;

    /**
     * @notice Updates the VC and Disclose circuit verifier address.
     * @param attestationId The attestation identifier.
     * @param vcAndDiscloseCircuitVerifierAddress The new VC and Disclose circuit verifier address.
     */
    function updateVcAndDiscloseCircuit(bytes32 attestationId, address vcAndDiscloseCircuitVerifierAddress) external;

    /**
     * @notice Updates the register circuit verifier for a specific signature type.
     * @param typeId The signature type identifier.
     * @param verifierAddress The new register circuit verifier address.
     */
    function updateRegisterCircuitVerifier(uint256 typeId, address verifierAddress) external;

    /**
     * @notice Updates the DSC circuit verifier for a specific signature type.
     * @param typeId The signature type identifier.
     * @param verifierAddress The new DSC circuit verifier address.
     */
    function updateDscVerifier(uint256 typeId, address verifierAddress) external;

    /**
     * @notice Batch updates register circuit verifiers.
     * @param typeIds An array of signature type identifiers.
     * @param verifierAddresses An array of new register circuit verifier addresses.
     */
    function batchUpdateRegisterCircuitVerifiers(
        uint256[] calldata typeIds,
        address[] calldata verifierAddresses
    ) external;

    /**
     * @notice Batch updates DSC circuit verifiers.
     * @param typeIds An array of signature type identifiers.
     * @param verifierAddresses An array of new DSC circuit verifier addresses.
     */
    function batchUpdateDscCircuitVerifiers(uint256[] calldata typeIds, address[] calldata verifierAddresses) external;
}
