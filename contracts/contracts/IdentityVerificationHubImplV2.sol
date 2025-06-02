// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {CircuitConstantsV2} from "./constants/CircuitConstantsV2.sol";
import {AttestationId} from "./constants/AttestationId.sol";
import {Formatter} from "./libraries/Formatter.sol";
import {CircuitAttributeHandlerV2} from "./libraries/CircuitAttributeHandlerV2.sol";
import {IIdentityVerificationHubV2} from "./interfaces/IIdentityVerificationHubV2.sol";
import {IIdentityRegistryV1} from "./interfaces/IIdentityRegistryV1.sol";
import {IRegisterCircuitVerifier} from "./interfaces/IRegisterCircuitVerifier.sol";
import {IVcAndDiscloseCircuitVerifier} from "./interfaces/IVcAndDiscloseCircuitVerifier.sol";
import {IDscCircuitVerifier} from "./interfaces/IDscCircuitVerifier.sol";
import {ImplRoot} from "./upgradeable/ImplRoot.sol";
import {IdentityVerificationHubStorageV1} from "./IdentityVerificationHubImplV1.sol";
import {IIdentityRegistryIdCardV1} from "./interfaces/IIdentityRegistryIdCardV1.sol";

/**
 * @notice ⚠️ CRITICAL STORAGE LAYOUT WARNING ⚠️
 * =============================================
 *
 * This contract uses the UUPS upgradeable pattern which makes storage layout EXTREMELY SENSITIVE.
 *
 * 🚫 NEVER MODIFY OR REORDER existing storage variables
 * 🚫 NEVER INSERT new variables between existing ones
 * 🚫 NEVER CHANGE THE TYPE of existing variables
 *
 * ✅ New storage variables MUST be added in one of these two ways ONLY:
 *    1. At the END of the storage layout
 *    2. In a new V2 contract that inherits from this V1
 *
 * Examples of forbidden changes:
 * - Changing uint256 to uint128
 * - Changing bytes32 to bytes
 * - Changing array type to mapping
 *
 * For more detailed information about forbidden changes, please refer to:
 * https://docs.openzeppelin.com/upgrades-plugins/writing-upgradeable#modifying-your-contracts
 *
 * ⚠️ VIOLATION OF THESE RULES WILL CAUSE CATASTROPHIC STORAGE COLLISIONS IN FUTURE UPGRADES ⚠️
 * =============================================
 */

/**
 * @title IdentityVerificationHubStorageV2
 * @notice Storage contract for IdentityVerificationHubImplV2.
 * @dev Inherits from ImplRoot to include upgradeability functionality.
 */
abstract contract IdentityVerificationHubStorageV2 is IdentityVerificationHubStorageV1 {
    mapping(bytes32 => address) internal _attestationIdToRegistry;
    mapping(bytes32 => address) internal _attestationIdToDiscloseVerifier;
}

/**
 * @title IdentityVerificationHubImplV2
 * @notice Implementation contract for the Identity Verification Hub.
 * @dev Provides functions for registering commitments and verifying groth16 proofs and inclusion proofs.
 */
contract IdentityVerificationHubImplV2 is IdentityVerificationHubStorageV2, IIdentityVerificationHubV2 {
    using Formatter for uint256;

    uint256 constant MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH = 40;

    // ====================================================
    // Events
    // ====================================================

    event HubInitialized(
        bytes32[] attestationIds,
        address[] registryAddresses,
        address[] vcAndDiscloseCircuitVerifiers,
        uint256[] registerCircuitVerifierIds,
        address[] registerCircuitVerifiers,
        uint256[] dscCircuitVerifierIds,
        address[] dscCircuitVerifiers
    );
    /**
     * @notice Emitted when the registry address is updated.
     * @param registry The new registry address.
     */
    event RegistryUpdated(bytes32 attestationId, address registry);
    /**
     * @notice Emitted when the VC and Disclose circuit verifier is updated.
     * @param vcAndDiscloseCircuitVerifier The new VC and Disclose circuit verifier address.
     */
    event VcAndDiscloseCircuitUpdated(bytes32 attestationId, address vcAndDiscloseCircuitVerifier);
    /**
     * @notice Emitted when a register circuit verifier is updated.
     * @param typeId The signature type id.
     * @param verifier The new verifier address for the register circuit.
     */
    event RegisterCircuitVerifierUpdated(uint256 typeId, address verifier);
    /**
     * @notice Emitted when a DSC circuit verifier is updated.
     * @param typeId The signature type id.
     * @param verifier The new verifier address for the DSC circuit.
     */
    event DscCircuitVerifierUpdated(uint256 typeId, address verifier);

    // ====================================================
    // Errors
    // ====================================================

    /// @notice Thrown when the lengths of provided arrays do not match.
    /// @dev Used when initializing or updating arrays that must have equal length.
    error LENGTH_MISMATCH();

    /// @notice Thrown when no verifier is set for a given signature type.
    /// @dev Indicates that the mapping lookup for the verifier returned the zero address.
    error NO_VERIFIER_SET();

    /// @notice Thrown when the current date in the proof is not within the valid range.
    /// @dev Ensures that the provided proof's date is within one day of the expected start time.
    error CURRENT_DATE_NOT_IN_VALID_RANGE();

    /// @notice Thrown when the 'older than' attribute in the proof is invalid.
    /// @dev The 'older than' value derived from the proof does not match the expected criteria.
    error INVALID_OLDER_THAN();

    /// @notice Thrown when the provided forbidden countries list is invalid.
    /// @dev The forbidden countries list in the proof does not match the expected packed data.
    error INVALID_FORBIDDEN_COUNTRIES();

    /// @notice Thrown when the OFAC check fails.
    /// @dev Indicates that the proof did not satisfy the required OFAC conditions.
    error INVALID_OFAC();

    /// @notice Thrown when the register circuit proof is invalid.
    /// @dev The register circuit verifier did not validate the provided proof.
    error INVALID_REGISTER_PROOF();

    /// @notice Thrown when the DSC circuit proof is invalid.
    /// @dev The DSC circuit verifier did not validate the provided proof.
    error INVALID_DSC_PROOF();

    /// @notice Thrown when the VC and Disclose proof is invalid.
    /// @dev The VC and Disclose circuit verifier did not validate the provided proof.
    error INVALID_VC_AND_DISCLOSE_PROOF();

    /// @notice Thrown when the provided commitment root is invalid.
    /// @dev Used in proofs to ensure that the commitment root matches the expected value in the registry.
    error INVALID_COMMITMENT_ROOT();

    /// @notice Thrown when the provided OFAC root is invalid.
    /// @dev Indicates that the OFAC root from the proof does not match the expected OFAC root.
    error INVALID_OFAC_ROOT();

    /// @notice Thrown when the provided CSCA root is invalid.
    /// @dev Indicates that the CSCA root from the DSC proof does not match the expected CSCA root.
    error INVALID_CSCA_ROOT();

    /// @notice Thrown when the revealed data type is invalid or not supported.
    /// @dev Raised during the processing of revealed data if it does not match any supported type.
    error INVALID_REVEALED_DATA_TYPE();

    error INVALID_ATTESTATION_ID();

    // ====================================================
    // Constructor
    // ====================================================

    /**
     * @notice Constructor that disables initializers.
     * @dev Prevents direct initialization of the implementation contract.
     */
    constructor() {
        _disableInitializers();
    }

    // ====================================================
    // Initializer
    // ====================================================

    function initialize(
        bytes32[] memory attestationIds,
        address[] memory registryAddresses,
        address[] memory vcAndDiscloseCircuitVerifierAddresses,
        uint256[] memory registerCircuitVerifierIds,
        address[] memory registerCircuitVerifierAddresses,
        uint256[] memory dscCircuitVerifierIds,
        address[] memory dscCircuitVerifierAddresses
    ) external initializer {
        __ImplRoot_init();
        if (attestationIds.length != registryAddresses.length) {
            revert LENGTH_MISMATCH();
        }
        if (attestationIds.length != vcAndDiscloseCircuitVerifierAddresses.length) {
            revert LENGTH_MISMATCH();
        }
        if (registerCircuitVerifierIds.length != registerCircuitVerifierAddresses.length) {
            revert LENGTH_MISMATCH();
        }
        if (dscCircuitVerifierIds.length != dscCircuitVerifierAddresses.length) {
            revert LENGTH_MISMATCH();
        }
        for (uint256 i = 0; i < attestationIds.length; i++) {
            _attestationIdToRegistry[attestationIds[i]] = registryAddresses[i];
            _attestationIdToDiscloseVerifier[attestationIds[i]] = vcAndDiscloseCircuitVerifierAddresses[i];
        }
        for (uint256 i = 0; i < registerCircuitVerifierIds.length; i++) {
            _sigTypeToRegisterCircuitVerifiers[registerCircuitVerifierIds[i]] = registerCircuitVerifierAddresses[i];
        }
        for (uint256 i = 0; i < dscCircuitVerifierIds.length; i++) {
            _sigTypeToDscCircuitVerifiers[dscCircuitVerifierIds[i]] = dscCircuitVerifierAddresses[i];
        }
        emit HubInitialized(
            attestationIds,
            registryAddresses,
            vcAndDiscloseCircuitVerifierAddresses,
            registerCircuitVerifierIds,
            registerCircuitVerifierAddresses,
            dscCircuitVerifierIds,
            dscCircuitVerifierAddresses
        );
    }

    // ====================================================
    // External View Functions
    // ====================================================

    /**
     * @notice Retrieves the registry address.
     * @return The address of the Identity Registry.
     */
    function registry(bytes32 attestationId) external view virtual onlyProxy returns (address) {
        return _attestationIdToRegistry[attestationId];
    }

    /**
     * @notice Retrieves the VC and Disclose circuit verifier address.
     * @return The address of the VC and Disclose circuit verifier.
     */
    function vcAndDiscloseCircuitVerifier(bytes32 attestationId) external view virtual onlyProxy returns (address) {
        return _attestationIdToDiscloseVerifier[attestationId];
    }

    /**
     * @notice Retrieves the register circuit verifier address for a given signature type.
     * @param typeId The signature type identifier.
     * @return The register circuit verifier address.
     */
    function sigTypeToRegisterCircuitVerifiers(uint256 typeId) external view virtual onlyProxy returns (address) {
        return _sigTypeToRegisterCircuitVerifiers[typeId];
    }

    /**
     * @notice Retrieves the DSC circuit verifier address for a given signature type.
     * @param typeId The signature type identifier.
     * @return The DSC circuit verifier address.
     */
    function sigTypeToDscCircuitVerifiers(uint256 typeId) external view virtual onlyProxy returns (address) {
        return _sigTypeToDscCircuitVerifiers[typeId];
    }

    /**
     * @notice Verifies a VC and Disclose proof using unified bytes interface.
     * @dev Supports both passport and ID card proofs through a unified interface.
     * @param proofData Encoded proof data containing all necessary verification parameters.
     * @return result Encoded verification result containing all relevant data.
     */
    function verifyVcAndDisclose(
        bytes calldata proofData
    ) external view virtual onlyProxy returns (bytes memory result) {
        // Decode the attestation ID from the first 32 bytes
        bytes32 attestationId;
        assembly {
            attestationId := calldataload(proofData.offset)
        }

        if (attestationId == AttestationId.E_PASSPORT) {
            // Passport proof
            VcAndDiscloseHubProof memory proof = _decodePassportProof(proofData[32:]);
            VcAndDiscloseVerificationResult memory passportResult = _verifyPassportVcAndDisclose(proof);
            return _encodePassportResult(passportResult);
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            // ID Card proof
            IdCardVcAndDiscloseHubProof memory proof = _decodeIdCardProof(proofData[32:]);
            IdCardVcAndDiscloseVerificationResult memory idCardResult = _verifyEuIdVcAndDisclose(proof);
            return _encodeIdCardResult(idCardResult);
        } else {
            revert INVALID_ATTESTATION_ID();
        }
    }

    // ====================================================
    // External Functions - Registration
    // ====================================================

    /**
     * @notice Registers a passport commitment using a register circuit proof.
     * @dev Verifies the proof and then calls the Identity Registry to register the commitment.
     * @param registerCircuitVerifierId The identifier for the register circuit verifier to use.
     * @param registerCircuitProof The register circuit proof data.
     */
    function registerCommitment(
        bytes32 attestationId,
        uint256 registerCircuitVerifierId,
        IRegisterCircuitVerifier.RegisterCircuitProof memory registerCircuitProof
    ) external virtual onlyProxy {
        _verifyRegisterProof(attestationId, registerCircuitVerifierId, registerCircuitProof);
        if (attestationId == AttestationId.E_PASSPORT) {
            IIdentityRegistryV1(_attestationIdToRegistry[attestationId]).registerCommitment(
                attestationId,
                registerCircuitProof.pubSignals[CircuitConstantsV2.REGISTER_NULLIFIER_INDEX],
                registerCircuitProof.pubSignals[CircuitConstantsV2.REGISTER_COMMITMENT_INDEX]
            );
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            IIdentityRegistryIdCardV1(_attestationIdToRegistry[attestationId]).registerCommitment(
                attestationId,
                registerCircuitProof.pubSignals[CircuitConstantsV2.REGISTER_NULLIFIER_INDEX],
                registerCircuitProof.pubSignals[CircuitConstantsV2.REGISTER_COMMITMENT_INDEX]
            );
        } else {
            revert INVALID_ATTESTATION_ID();
        }
    }

    /**
     * @notice Registers a DSC key commitment using a DSC circuit proof.
     * @dev Verifies the DSC proof and then calls the Identity Registry to register the dsc key commitment.
     * @param dscCircuitVerifierId The identifier for the DSC circuit verifier to use.
     * @param dscCircuitProof The DSC circuit proof data.
     */
    function registerDscKeyCommitment(
        bytes32 attestationId,
        uint256 dscCircuitVerifierId,
        IDscCircuitVerifier.DscCircuitProof memory dscCircuitProof
    ) external virtual onlyProxy {
        _verifyDscProof(attestationId, dscCircuitVerifierId, dscCircuitProof);
        if (attestationId == AttestationId.E_PASSPORT) {
            IIdentityRegistryV1(_attestationIdToRegistry[attestationId]).registerDscKeyCommitment(
                dscCircuitProof.pubSignals[CircuitConstantsV2.DSC_TREE_LEAF_INDEX]
            );
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            IIdentityRegistryIdCardV1(_attestationIdToRegistry[attestationId]).registerDscKeyCommitment(
                dscCircuitProof.pubSignals[CircuitConstantsV2.DSC_TREE_LEAF_INDEX]
            );
        } else {
            revert INVALID_ATTESTATION_ID();
        }
    }

    // ====================================================
    // External Functions - Only Owner
    // ====================================================

    /**
     * @notice Updates the registry address.
     * @param registryAddress The new registry address.
     */
    function updateRegistry(bytes32 attestationId, address registryAddress) external virtual onlyProxy onlyOwner {
        _attestationIdToRegistry[attestationId] = registryAddress;
        emit RegistryUpdated(attestationId, registryAddress);
    }

    /**
     * @notice Updates the VC and Disclose circuit verifier address.
     * @param vcAndDiscloseCircuitVerifierAddress The new VC and Disclose circuit verifier address.
     */
    function updateVcAndDiscloseCircuit(
        bytes32 attestationId,
        address vcAndDiscloseCircuitVerifierAddress
    ) external virtual onlyProxy onlyOwner {
        _attestationIdToDiscloseVerifier[attestationId] = vcAndDiscloseCircuitVerifierAddress;
        emit VcAndDiscloseCircuitUpdated(attestationId, vcAndDiscloseCircuitVerifierAddress);
    }

    /**
     * @notice Updates the register circuit verifier for a specific signature type.
     * @param typeId The signature type identifier.
     * @param verifierAddress The new register circuit verifier address.
     */
    function updateRegisterCircuitVerifier(
        uint256 typeId,
        address verifierAddress
    ) external virtual onlyProxy onlyOwner {
        _sigTypeToRegisterCircuitVerifiers[typeId] = verifierAddress;
        emit RegisterCircuitVerifierUpdated(typeId, verifierAddress);
    }

    /**
     * @notice Updates the DSC circuit verifier for a specific signature type.
     * @param typeId The signature type identifier.
     * @param verifierAddress The new DSC circuit verifier address.
     */
    function updateDscVerifier(uint256 typeId, address verifierAddress) external virtual onlyProxy onlyOwner {
        _sigTypeToDscCircuitVerifiers[typeId] = verifierAddress;
        emit DscCircuitVerifierUpdated(typeId, verifierAddress);
    }

    /**
     * @notice Batch updates register circuit verifiers.
     * @param typeIds An array of signature type identifiers.
     * @param verifierAddresses An array of new register circuit verifier addresses.
     */
    function batchUpdateRegisterCircuitVerifiers(
        uint256[] calldata typeIds,
        address[] calldata verifierAddresses
    ) external virtual onlyProxy onlyOwner {
        if (typeIds.length != verifierAddresses.length) {
            revert LENGTH_MISMATCH();
        }
        for (uint256 i = 0; i < typeIds.length; i++) {
            _sigTypeToRegisterCircuitVerifiers[typeIds[i]] = verifierAddresses[i];
            emit RegisterCircuitVerifierUpdated(typeIds[i], verifierAddresses[i]);
        }
    }

    /**
     * @notice Batch updates DSC circuit verifiers.
     * @param typeIds An array of signature type identifiers.
     * @param verifierAddresses An array of new DSC circuit verifier addresses.
     */
    function batchUpdateDscCircuitVerifiers(
        uint256[] calldata typeIds,
        address[] calldata verifierAddresses
    ) external virtual onlyProxy onlyOwner {
        if (typeIds.length != verifierAddresses.length) {
            revert LENGTH_MISMATCH();
        }
        for (uint256 i = 0; i < typeIds.length; i++) {
            _sigTypeToDscCircuitVerifiers[typeIds[i]] = verifierAddresses[i];
            emit DscCircuitVerifierUpdated(typeIds[i], verifierAddresses[i]);
        }
    }

    // ====================================================
    // Internal Functions
    // ====================================================

    /**
     * @notice Internal function to verify passport VC and Disclose proof.
     */
    function _verifyPassportVcAndDisclose(
        VcAndDiscloseHubProof memory proof
    ) internal view returns (VcAndDiscloseVerificationResult memory) {
        VcAndDiscloseVerificationResult memory result;
        CircuitConstantsV2.DiscloseIndices memory indices = CircuitConstantsV2.getDiscloseIndices(
            AttestationId.E_PASSPORT
        );

        result.identityCommitmentRoot = _verifyVcAndDiscloseProof(
            AttestationId.E_PASSPORT,
            proof.vcAndDiscloseProof,
            proof.olderThanEnabled,
            proof.olderThan,
            proof.ofacEnabled,
            proof.forbiddenCountriesEnabled,
            proof.forbiddenCountriesListPacked
        );

        for (uint256 i = 0; i < 3; i++) {
            result.revealedDataPacked[i] = proof.vcAndDiscloseProof.pubSignals[indices.revealedDataPackedIndex + i];
        }
        for (uint256 i = 0; i < 4; i++) {
            result.forbiddenCountriesListPacked[i] = proof.vcAndDiscloseProof.pubSignals[
                indices.forbiddenCountriesListPackedIndex + i
            ];
        }
        result.nullifier = proof.vcAndDiscloseProof.pubSignals[indices.nullifierIndex];
        result.attestationId = proof.vcAndDiscloseProof.pubSignals[indices.attestationIdIndex];
        result.userIdentifier = proof.vcAndDiscloseProof.pubSignals[indices.userIdentifierIndex];
        result.scope = proof.vcAndDiscloseProof.pubSignals[indices.scopeIndex];
        return result;
    }

    /**
     * @notice Internal function to verify ID card VC and Disclose proof.
     */
    function _verifyEuIdVcAndDisclose(
        IdCardVcAndDiscloseHubProof memory proof
    ) internal view returns (IdCardVcAndDiscloseVerificationResult memory) {
        IdCardVcAndDiscloseVerificationResult memory result;
        CircuitConstantsV2.DiscloseIndices memory indices = CircuitConstantsV2.getDiscloseIndices(
            AttestationId.EU_ID_CARD
        );

        result.identityCommitmentRoot = _verifyVcAndDiscloseProof(
            AttestationId.EU_ID_CARD,
            proof.vcAndDiscloseProof,
            proof.olderThanEnabled,
            proof.olderThan,
            _convertOfacFlags(proof.ofacEnabled),
            proof.forbiddenCountriesEnabled,
            proof.forbiddenCountriesListPacked
        );

        for (uint256 i = 0; i < 4; i++) {
            result.revealedDataPacked[i] = proof.vcAndDiscloseProof.pubSignals[indices.revealedDataPackedIndex + i];
        }
        for (uint256 i = 0; i < 4; i++) {
            result.forbiddenCountriesListPacked[i] = proof.vcAndDiscloseProof.pubSignals[
                indices.forbiddenCountriesListPackedIndex + i
            ];
        }
        result.nullifier = proof.vcAndDiscloseProof.pubSignals[indices.nullifierIndex];
        result.attestationId = proof.vcAndDiscloseProof.pubSignals[indices.attestationIdIndex];
        result.userIdentifier = proof.vcAndDiscloseProof.pubSignals[indices.userIdentifierIndex];
        result.scope = proof.vcAndDiscloseProof.pubSignals[indices.scopeIndex];
        return result;
    }

    function _verifyRegisterProof(
        bytes32 attestationId,
        uint256 registerCircuitVerifierId,
        IRegisterCircuitVerifier.RegisterCircuitProof memory registerCircuitProof
    ) internal view {
        address verifier = _sigTypeToRegisterCircuitVerifiers[registerCircuitVerifierId];
        if (verifier == address(0)) {
            revert NO_VERIFIER_SET();
        }

        if (attestationId == AttestationId.E_PASSPORT) {
            if (
                !IIdentityRegistryV1(_attestationIdToRegistry[attestationId]).checkDscKeyCommitmentMerkleRoot(
                    registerCircuitProof.pubSignals[CircuitConstantsV2.REGISTER_MERKLE_ROOT_INDEX]
                )
            ) {
                revert INVALID_COMMITMENT_ROOT();
            }
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            if (
                !IIdentityRegistryIdCardV1(_attestationIdToRegistry[attestationId]).checkDscKeyCommitmentMerkleRoot(
                    registerCircuitProof.pubSignals[CircuitConstantsV2.REGISTER_MERKLE_ROOT_INDEX]
                )
            ) {
                revert INVALID_COMMITMENT_ROOT();
            }
        } else {
            revert INVALID_ATTESTATION_ID();
        }

        if (
            !IRegisterCircuitVerifier(verifier).verifyProof(
                registerCircuitProof.a,
                registerCircuitProof.b,
                registerCircuitProof.c,
                registerCircuitProof.pubSignals
            )
        ) {
            revert INVALID_REGISTER_PROOF();
        }
    }

    /**
     * @notice Verifies the passport DSC circuit proof.
     * @dev Uses the DSC circuit verifier specified by dscCircuitVerifierId.
     * @param dscCircuitVerifierId The identifier for the DSC circuit verifier.
     * @param dscCircuitProof The DSC circuit proof data.
     */
    function _verifyDscProof(
        bytes32 attestationId,
        uint256 dscCircuitVerifierId,
        IDscCircuitVerifier.DscCircuitProof memory dscCircuitProof
    ) internal view {
        address verifier = _sigTypeToDscCircuitVerifiers[dscCircuitVerifierId];
        if (verifier == address(0)) {
            revert NO_VERIFIER_SET();
        }

        if (attestationId == AttestationId.E_PASSPORT) {
            if (
                !IIdentityRegistryV1(_attestationIdToRegistry[attestationId]).checkCscaRoot(
                    dscCircuitProof.pubSignals[CircuitConstantsV2.DSC_CSCA_ROOT_INDEX]
                )
            ) {
                revert INVALID_CSCA_ROOT();
            }
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            if (
                !IIdentityRegistryIdCardV1(_attestationIdToRegistry[attestationId]).checkCscaRoot(
                    dscCircuitProof.pubSignals[CircuitConstantsV2.DSC_CSCA_ROOT_INDEX]
                )
            ) {
                revert INVALID_CSCA_ROOT();
            }
        } else {
            revert INVALID_ATTESTATION_ID();
        }

        if (
            !IDscCircuitVerifier(verifier).verifyProof(
                dscCircuitProof.a,
                dscCircuitProof.b,
                dscCircuitProof.c,
                dscCircuitProof.pubSignals
            )
        ) {
            revert INVALID_DSC_PROOF();
        }
    }

    /**
     * @notice Retrieves the timestamp for the start of the current day.
     * @dev Calculated by subtracting the remainder of block.timestamp modulo 1 day.
     * @return The Unix timestamp representing the start of the day.
     */
    function _getStartOfDayTimestamp() internal view returns (uint256) {
        return block.timestamp - (block.timestamp % 1 days);
    }

    /**
     * @notice Unified internal verification function for both passport and ID card proofs.
     * @dev Handles the common verification logic for both proof types.
     */
    function _verifyVcAndDiscloseProof(
        bytes32 attestationId,
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory vcAndDiscloseProof,
        bool olderThanEnabled,
        uint256 olderThan,
        bool[3] memory ofacEnabled,
        bool forbiddenCountriesEnabled,
        uint256[4] memory forbiddenCountriesListPacked
    ) internal view returns (uint256 identityCommitmentRoot) {
        // Get indices for the specific attestation type
        CircuitConstantsV2.DiscloseIndices memory indices = CircuitConstantsV2.getDiscloseIndices(attestationId);
        bool isPassport = (attestationId == AttestationId.E_PASSPORT);

        // verify identity commitment root
        if (isPassport) {
            if (
                !IIdentityRegistryV1(_attestationIdToRegistry[attestationId]).checkIdentityCommitmentRoot(
                    vcAndDiscloseProof.pubSignals[indices.merkleRootIndex]
                )
            ) {
                revert INVALID_COMMITMENT_ROOT();
            }
        } else {
            if (
                !IIdentityRegistryIdCardV1(_attestationIdToRegistry[attestationId]).checkIdentityCommitmentRoot(
                    vcAndDiscloseProof.pubSignals[indices.merkleRootIndex]
                )
            ) {
                revert INVALID_COMMITMENT_ROOT();
            }
        }

        // verify current date
        uint[6] memory dateNum;
        for (uint256 i = 0; i < 6; i++) {
            dateNum[i] = vcAndDiscloseProof.pubSignals[indices.currentDateIndex + i];
        }

        uint currentTimestamp = Formatter.proofDateToUnixTimestamp(dateNum);
        if (
            currentTimestamp < _getStartOfDayTimestamp() - 1 days + 1 ||
            currentTimestamp > _getStartOfDayTimestamp() + 1 days - 1
        ) {
            revert CURRENT_DATE_NOT_IN_VALID_RANGE();
        }

        // verify attributes
        if (isPassport) {
            uint256[3] memory revealedDataPacked;
            for (uint256 i = 0; i < 3; i++) {
                revealedDataPacked[i] = vcAndDiscloseProof.pubSignals[indices.revealedDataPackedIndex + i];
            }

            if (olderThanEnabled) {
                if (
                    !CircuitAttributeHandlerV2.compareOlderThan(
                        attestationId,
                        Formatter.fieldElementsToBytes(revealedDataPacked),
                        olderThan
                    )
                ) {
                    revert INVALID_OLDER_THAN();
                }
            }

            if (ofacEnabled[0] || ofacEnabled[1] || ofacEnabled[2]) {
                if (
                    !CircuitAttributeHandlerV2.compareOfac(
                        attestationId,
                        Formatter.fieldElementsToBytes(revealedDataPacked),
                        ofacEnabled[0],
                        ofacEnabled[1],
                        ofacEnabled[2]
                    )
                ) {
                    revert INVALID_OFAC();
                }
                if (
                    !IIdentityRegistryV1(_attestationIdToRegistry[attestationId]).checkOfacRoots(
                        vcAndDiscloseProof.pubSignals[indices.passportNoSmtRootIndex],
                        vcAndDiscloseProof.pubSignals[indices.namedobSmtRootIndex],
                        vcAndDiscloseProof.pubSignals[indices.nameyobSmtRootIndex]
                    )
                ) {
                    revert INVALID_OFAC_ROOT();
                }
            }
        } else {
            uint256[4] memory revealedDataPacked;
            for (uint256 i = 0; i < 4; i++) {
                revealedDataPacked[i] = vcAndDiscloseProof.pubSignals[indices.revealedDataPackedIndex + i];
            }

            if (olderThanEnabled) {
                if (
                    !CircuitAttributeHandlerV2.compareOlderThan(
                        attestationId,
                        Formatter.fieldElementsToBytesIdCard(revealedDataPacked),
                        olderThan
                    )
                ) {
                    revert INVALID_OLDER_THAN();
                }
            }

            if (ofacEnabled[1] || ofacEnabled[2]) {
                if (
                    !CircuitAttributeHandlerV2.compareOfac(
                        attestationId,
                        Formatter.fieldElementsToBytesIdCard(revealedDataPacked),
                        false, // Document number OFAC not applicable for ID cards
                        ofacEnabled[1],
                        ofacEnabled[2]
                    )
                ) {
                    revert INVALID_OFAC();
                }
                if (
                    !IIdentityRegistryIdCardV1(_attestationIdToRegistry[attestationId]).checkOfacRoots(
                        vcAndDiscloseProof.pubSignals[indices.namedobSmtRootIndex],
                        vcAndDiscloseProof.pubSignals[indices.nameyobSmtRootIndex]
                    )
                ) {
                    revert INVALID_OFAC_ROOT();
                }
            }
        }

        if (forbiddenCountriesEnabled) {
            for (uint256 i = 0; i < 4; i++) {
                if (
                    forbiddenCountriesListPacked[i] !=
                    vcAndDiscloseProof.pubSignals[indices.forbiddenCountriesListPackedIndex + i]
                ) {
                    revert INVALID_FORBIDDEN_COUNTRIES();
                }
            }
        }

        // verify the proof using the VC and Disclose circuit verifier
        if (
            !IVcAndDiscloseCircuitVerifier(_attestationIdToDiscloseVerifier[attestationId]).verifyProof(
                vcAndDiscloseProof.a,
                vcAndDiscloseProof.b,
                vcAndDiscloseProof.c,
                vcAndDiscloseProof.pubSignals
            )
        ) {
            revert INVALID_VC_AND_DISCLOSE_PROOF();
        }

        return vcAndDiscloseProof.pubSignals[indices.merkleRootIndex];
    }

    /**
     * @notice Converts ID card OFAC flags (2 elements) to passport format (3 elements).
     */
    function _convertOfacFlags(bool[2] memory idCardOfacEnabled) internal pure returns (bool[3] memory) {
        bool[3] memory passportOfacEnabled;
        passportOfacEnabled[0] = false; // ID cards don't have passport number OFAC
        passportOfacEnabled[1] = idCardOfacEnabled[0]; // name and DOB OFAC
        passportOfacEnabled[2] = idCardOfacEnabled[1]; // name and YOB OFAC
        return passportOfacEnabled;
    }

    /**
     * @notice Decodes passport proof data from bytes.
     */
    function _decodePassportProof(bytes memory data) internal pure returns (VcAndDiscloseHubProof memory) {
        return abi.decode(data, (VcAndDiscloseHubProof));
    }

    /**
     * @notice Decodes ID card proof data from bytes.
     */
    function _decodeIdCardProof(bytes memory data) internal pure returns (IdCardVcAndDiscloseHubProof memory) {
        return abi.decode(data, (IdCardVcAndDiscloseHubProof));
    }

    /**
     * @notice Encodes passport verification result to bytes.
     */
    function _encodePassportResult(VcAndDiscloseVerificationResult memory result) internal pure returns (bytes memory) {
        return abi.encode(result);
    }

    /**
     * @notice Encodes ID card verification result to bytes.
     */
    function _encodeIdCardResult(
        IdCardVcAndDiscloseVerificationResult memory result
    ) internal pure returns (bytes memory) {
        return abi.encode(result);
    }
}
