// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ImplRoot} from "./upgradeable/ImplRoot.sol";
import {SelfStructs} from "./libraries/SelfStructs.sol";
import {CustomVerifier, VerificationConfig} from "./libraries/CustomVerifier.sol";
import {GenericFormatter} from "./libraries/GenericFormatter.sol";
import {AttestationId} from "./constants/AttestationId.sol";
import {IVcAndDiscloseCircuitVerifier} from "./interfaces/IVcAndDiscloseCircuitVerifier.sol";
import {ISelfVerificationRoot} from "./interfaces/ISelfVerificationRoot.sol";

contract IdentityVerificationHubImplV2 is ImplRoot {

    /// @custom:storage-location erc7201:self.storage.IdentityVerificationHub
    struct IdentityVerificationHubStorage {
        uint256 _circuitVersion;
        mapping(bytes32 attestationId => address registry) _registries;
        mapping(bytes32 attestationId => mapping(uint256 sigTypeId => address registerCircuitVerifier)) _registerCircuitVerifiers;
        mapping(bytes32 attestationId => mapping(uint256 sigTypeId => address dscCircuitVerifier)) _dscCircuitVerifiers;
        mapping(bytes32 attestationId => address discloseVerifiers) _discloseVerifiers;
    }

    /// @custom:storage-location erc7201:self.storage.IdentityVerificationHubV2
    struct IdentityVerificationHubV2Storage {
        mapping(bytes32 configId => SelfStructs.VerificationConfigV2) _v2VerificationConfigs;
        // We should consider to add bridge address
        // address bridgeAddress;
    }

    /// @dev keccak256(abi.encode(uint256(keccak256("self.storage.IdentityVerificationHub")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant IDENTITYVERIFICATIONHUB_STORAGE_LOCATION = 0x2ade7eace21710c689ddef374add52ace9783e33bac626e58e73a9d190173d00;

    /// @dev keccak256(abi.encode(uint256(keccak256("self.storage.IdentityVerificationHubV2")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant IDENTITYVERIFICATIONHUBV2_STORAGE_LOCATION = 0xf9b5980dcec1a8b0609576a1f453bb2cad4732a0ea02bb89154d44b14a306c00;

    function _getIdentityVerificationHubStorage() private pure returns (IdentityVerificationHubStorage storage $) {
        assembly {
            $.slot := IDENTITYVERIFICATIONHUB_STORAGE_LOCATION
        }
    }

    function _getIdentityVerificationHubV2Storage() private pure returns (IdentityVerificationHubV2Storage storage $) {
        assembly {
            $.slot := IDENTITYVERIFICATIONHUBV2_STORAGE_LOCATION
        }
    }

    event HubInitialized(
        bytes32[] attestationIds,
        address[] registryAddresses,
        address[] vcAndDiscloseCircuitVerifiers,
        uint256[] registerCircuitVerifierIds,
        address[] registerCircuitVerifiers,
        uint256[] dscCircuitVerifierIds,
        address[] dscCircuitVerifiers
    );

    event HubInitializedV2(
        bytes32[] attestationIds,
        address[] registryAddresses,
        address[] vcAndDiscloseCircuitVerifierAddresses,
        bytes32[] registerCircuitAttestationIds,
        uint256[] registerCircuitTypeIds,
        address[] registerCircuitVerifierAddresses,
        bytes32[] dscCircuitAttestationIds,
        uint256[] dscCircuitTypeIds,
        address[] dscCircuitVerifierAddresses
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

    error LengthMismatch();

    /// @notice Thrown when no verifier is set for a given signature type.
    /// @dev Indicates that the mapping lookup for the verifier returned the zero address.
    error NoVerifierSet();

    /// @notice Thrown when the current date in the proof is not within the valid range.
    /// @dev Ensures that the provided proof's date is within one day of the expected start time.
    error CurrentDateNotInValidRange();

    /// @notice Thrown when the 'older than' attribute in the proof is invalid.
    /// @dev The 'older than' value derived from the proof does not match the expected criteria.
    error InvalidOlderThan();

    /// @notice Thrown when the provided forbidden countries list is invalid.
    /// @dev The forbidden countries list in the proof does not match the expected packed data.
    error InvalidForbiddenCountries();

    /// @notice Thrown when the OFAC check fails.
    /// @dev Indicates that the proof did not satisfy the required OFAC conditions.
    error InvalidOfacCheck();

    /// @notice Thrown when the register circuit proof is invalid.
    /// @dev The register circuit verifier did not validate the provided proof.
    error InvalidRegisterProof();

    /// @notice Thrown when the DSC circuit proof is invalid.
    /// @dev The DSC circuit verifier did not validate the provided proof.
    error InvalidDscProof();

    /// @notice Thrown when the VC and Disclose proof is invalid.
    /// @dev The VC and Disclose circuit verifier did not validate the provided proof.
    error InvalidVcAndDiscloseProof();

    /// @notice Thrown when the provided commitment root is invalid.
    /// @dev Used in proofs to ensure that the commitment root matches the expected value in the registry.

    error InvalidIdentityCommitmentRoot();
    error InvalidDscCommitmentRoot();

    /// @notice Thrown when the provided OFAC root is invalid.
    /// @dev Indicates that the OFAC root from the proof does not match the expected OFAC root.
    error InvalidOfacRoot();

    /// @notice Thrown when the provided CSCA root is invalid.
    /// @dev Indicates that the CSCA root from the DSC proof does not match the expected CSCA root.
    error InvalidCscaRoot();

    /// @notice Thrown when the revealed data type is invalid or not supported.
    /// @dev Raised during the processing of revealed data if it does not match any supported type.
    error INVALID_REVEALED_DATA_TYPE();

    error InvalidAttestationId();

    // ====================================================
    // Input Format Structs
    // ====================================================

    // HubInputHeader is now defined in SelfStructs library

    // ====================================================
    // Constructor
    // ====================================================

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
        bytes32[] memory registerCircuitAttestationIds,
        uint256[] memory registerCircuitTypeIds,
        address[] memory registerCircuitVerifierAddresses,
        bytes32[] memory dscCircuitAttestationIds,
        uint256[] memory dscCircuitTypeIds,
        address[] memory dscCircuitVerifierAddresses
    ) external initializer {
        __ImplRoot_init();

        if (attestationIds.length != registryAddresses.length ||
            attestationIds.length != vcAndDiscloseCircuitVerifierAddresses.length ||
            registerCircuitAttestationIds.length != registerCircuitTypeIds.length ||
            registerCircuitAttestationIds.length != registerCircuitVerifierAddresses.length ||
            dscCircuitAttestationIds.length != dscCircuitTypeIds.length ||
            dscCircuitAttestationIds.length != dscCircuitVerifierAddresses.length
        ) {
            revert LengthMismatch();
        }

        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();

        for (uint256 i = 0; i < attestationIds.length; i++) {
            $._registries[attestationIds[i]] = registryAddresses[i];
            $._discloseVerifiers[attestationIds[i]] = vcAndDiscloseCircuitVerifierAddresses[i];
        }

        for (uint256 i = 0; i < registerCircuitAttestationIds.length; i++) {
            $._registerCircuitVerifiers[registerCircuitAttestationIds[i]][registerCircuitTypeIds[i]] = registerCircuitVerifierAddresses[i];
        }

        for (uint256 i = 0; i < dscCircuitAttestationIds.length; i++) {
            $._dscCircuitVerifiers[dscCircuitAttestationIds[i]][dscCircuitTypeIds[i]] = dscCircuitVerifierAddresses[i];
        }

        emit HubInitializedV2(
            attestationIds,
            registryAddresses,
            vcAndDiscloseCircuitVerifierAddresses,
            registerCircuitAttestationIds,
            registerCircuitTypeIds,
            registerCircuitVerifierAddresses,
            dscCircuitAttestationIds,
            dscCircuitTypeIds,
            dscCircuitVerifierAddresses
        );
    }

    // ====================================================
    // External View Functions
    // ====================================================

    function registry(bytes32 attestationId) external view virtual onlyProxy returns (address) {
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        return $._registries[attestationId];
    }

    function discloseVerifier(bytes32 attestationId) external view virtual onlyProxy returns (address) {
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        return $._discloseVerifiers[attestationId];
    }

    function registerCircuitVerifiers(bytes32 attestationId, uint256 typeId) external view virtual onlyProxy returns (address) {
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        return $._registerCircuitVerifiers[attestationId][typeId];
    }

    function dscCircuitVerifiers(bytes32 attestationId, uint256 typeId) external view virtual onlyProxy returns (address) {
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        return $._dscCircuitVerifiers[attestationId][typeId];
    }

    // ====================================================
    // External Functions - Verification
    // ====================================================

    function _decodeInput(bytes calldata input) internal pure returns (SelfStructs.HubInputHeader memory header, bytes calldata proofData) {
        require(input.length >= 97, "Input too short"); // 1 + 31 + 32 + 32 + 32 = 128 bytes minimum
        header.contractVersion = uint8(input[0]);
        header.destChainId = uint256(bytes32(input[32:64]));
        header.configId = bytes32(input[64:96]);
        header.attestationId = bytes32(input[96:128]);
        proofData = input[128:];
    }

    /**
     * @notice Gets verification config from V2 storage
     * @param configId The configuration identifier
     * @return The verification configuration
     */
    function getVerificationConfigV2(bytes32 configId) external view virtual onlyProxy returns (SelfStructs.VerificationConfigV2 memory) {
        IdentityVerificationHubV2Storage storage $v2 = _getIdentityVerificationHubV2Storage();
        return $v2._v2VerificationConfigs[configId];
    }

    /**
     * @notice Sets verification config in V2 storage (owner only)
     * @param configId The configuration identifier
     * @param config The verification configuration
     */
    function setVerificationConfigV2(bytes32 configId, SelfStructs.VerificationConfigV2 memory config) external virtual onlyProxy onlyOwner {
        IdentityVerificationHubV2Storage storage $v2 = _getIdentityVerificationHubV2Storage();
        $v2._v2VerificationConfigs[configId] = config;
    }

    /**
     * @notice Main verification function with new structured input format
     */
    function verify(
        bytes calldata input
    ) external view virtual onlyProxy returns (bytes memory result) {
        // Decode the structured input
        /*
            | 1 byte contractVersion
            | 31 bytes buffer
            | 32 bytes destChainId
            | 32 bytes configId
            | 32 bytes attestationId
            | data |
        */
        (SelfStructs.HubInputHeader memory header, bytes calldata proofData) = _decodeInput(input);

        bytes memory config;
        if (header.contractVersion == 2) {
            IdentityVerificationHubV2Storage storage $v2 = _getIdentityVerificationHubV2Storage();
            VerificationConfig.VerificationConfigV2 memory verificationConfig = $v2._v2VerificationConfigs[header.configId];
            config = GenericFormatter.formatV2Config(verificationConfig);
        }


        // Perform basic verification (rootCheck, currentDateCheck, groth16 proof verification)
        bytes memory output = _basicVerification(
            header.attestationId,
            _decodeVcAndDiscloseProof(proofData)
        );

        // ======= Need to execute Custom Verifications Here ============
        //shouldn't custom verifier return proof data for me?
        CustomVerifier.customVerify(header.attestationId, config, proofData);

        // ======= Need to execute formatting Here =============
        /*
            Informations which should be included in the output
            - attestationId
            - revealedData_packed
            - user_identifier
            - nullifier
            - forbiddenCountriesListPacked
         */

        if (header.destChainId == block.chainid) {
            ISelfVerificationRoot(msg.sender).onBasicVerificationSuccess(output);
        } else {
            // Cal external bridge
            // _handleBridge()
        }
    }

    // ====================================================
    // External Functions - Registration
    // ====================================================

    function registerCommitment(
        bytes32 attestationId,
        uint256 registerCircuitVerifierId,
        IRegisterCircuitVerifier.RegisterCircuitProof memory registerCircuitProof
    ) external virtual onlyProxy {
        _verifyRegisterProof(attestationId, registerCircuitVerifierId, registerCircuitProof);
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        if (attestationId == AttestationId.E_PASSPORT) {
            IIdentityRegistryV1($._registries[attestationId]).registerCommitment(
                attestationId,
                registerCircuitProof.pubSignals[CircuitConstantsV2.REGISTER_NULLIFIER_INDEX],
                registerCircuitProof.pubSignals[CircuitConstantsV2.REGISTER_COMMITMENT_INDEX]
            );
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            IIdentityRegistryIdCardV1($._registries[attestationId]).registerCommitment(
                attestationId,
                registerCircuitProof.pubSignals[CircuitConstantsV2.REGISTER_NULLIFIER_INDEX],
                registerCircuitProof.pubSignals[CircuitConstantsV2.REGISTER_COMMITMENT_INDEX]
            );
        } else {
            revert InvalidAttestationId();
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
            revert InvalidAttestationId();
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
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        $._registries[attestationId] = registryAddress;
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
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        $._discloseVerifiers[attestationId] = vcAndDiscloseCircuitVerifierAddress;
        emit VcAndDiscloseCircuitUpdated(attestationId, vcAndDiscloseCircuitVerifierAddress);
    }

    /**
     * @notice Updates the register circuit verifier for a specific signature type.
     * @param attestationId The attestation identifier.
     * @param typeId The signature type identifier.
     * @param verifierAddress The new register circuit verifier address.
     */
    function updateRegisterCircuitVerifier(
        bytes32 attestationId,
        uint256 typeId,
        address verifierAddress
    ) external virtual onlyProxy onlyOwner {
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        $._registerCircuitVerifiers[attestationId][typeId] = verifierAddress;
        emit RegisterCircuitVerifierUpdated(typeId, verifierAddress);
    }

    /**
     * @notice Updates the DSC circuit verifier for a specific signature type.
     * @param attestationId The attestation identifier.
     * @param typeId The signature type identifier.
     * @param verifierAddress The new DSC circuit verifier address.
     */
    function updateDscVerifier(
        bytes32 attestationId,
        uint256 typeId,
        address verifierAddress
    ) external virtual onlyProxy onlyOwner {
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        $._dscCircuitVerifiers[attestationId][typeId] = verifierAddress;
        emit DscCircuitVerifierUpdated(typeId, verifierAddress);
    }

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
    ) external virtual onlyProxy onlyOwner {
        if (attestationIds.length != typeIds.length || attestationIds.length != verifierAddresses.length) {
            revert LengthMismatch();
        }
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        for (uint256 i = 0; i < attestationIds.length; i++) {
            $._registerCircuitVerifiers[attestationIds[i]][typeIds[i]] = verifierAddresses[i];
            emit RegisterCircuitVerifierUpdated(typeIds[i], verifierAddresses[i]);
        }
    }

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
    ) external virtual onlyProxy onlyOwner {
        if (attestationIds.length != typeIds.length || attestationIds.length != verifierAddresses.length) {
            revert LengthMismatch();
        }
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        for (uint256 i = 0; i < attestationIds.length; i++) {
            $._dscCircuitVerifiers[attestationIds[i]][typeIds[i]] = verifierAddresses[i];
            emit DscCircuitVerifierUpdated(typeIds[i], verifierAddresses[i]);
        }
    }

    // ====================================================
    // Internal Functions
    // ====================================================

    function _verifyRegisterProof(
        bytes32 attestationId,
        uint256 registerCircuitVerifierId,
        IRegisterCircuitVerifier.RegisterCircuitProof memory registerCircuitProof
    ) internal view {
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        address verifier = $._registerCircuitVerifiers[attestationId][registerCircuitVerifierId];
        if (verifier == address(0)) {
            revert NoVerifierSet();
        }

        if (attestationId == AttestationId.E_PASSPORT) {
            if (
                !IIdentityRegistryV1($._registries[attestationId]).checkDscKeyCommitmentMerkleRoot(
                    registerCircuitProof.pubSignals[CircuitConstantsV2.REGISTER_MERKLE_ROOT_INDEX]
                )
            ) {
                revert InvalidDscCommitmentRoot();
            }
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            if (
                !IIdentityRegistryIdCardV1($._registries[attestationId]).checkDscKeyCommitmentMerkleRoot(
                    registerCircuitProof.pubSignals[CircuitConstantsV2.REGISTER_MERKLE_ROOT_INDEX]
                )
            ) {
                revert InvalidDscCommitmentRoot();
            }
        } else {
            revert InvalidAttestationId();
        }

        if (
            !IRegisterCircuitVerifier(verifier).verifyProof(
                registerCircuitProof.a,
                registerCircuitProof.b,
                registerCircuitProof.c,
                registerCircuitProof.pubSignals
            )
        ) {
            revert InvalidRegisterProof();
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
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        address verifier = $._dscCircuitVerifiers[attestationId][dscCircuitVerifierId];
        if (verifier == address(0)) {
            revert NoVerifierSet();
        }

        if (attestationId == AttestationId.E_PASSPORT) {
            if (
                !IIdentityRegistryV1($._registries[attestationId]).checkCscaRoot(
                    dscCircuitProof.pubSignals[CircuitConstantsV2.DSC_CSCA_ROOT_INDEX]
                )
            ) {
                revert InvalidCscaRoot();
            }
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            if (
                !IIdentityRegistryIdCardV1($._registries[attestationId]).checkCscaRoot(
                    dscCircuitProof.pubSignals[CircuitConstantsV2.DSC_CSCA_ROOT_INDEX]
                )
            ) {
                revert InvalidCscaRoot();
            }
        } else {
            revert InvalidAttestationId();
        }

        if (
            !IDscCircuitVerifier(verifier).verifyProof(
                dscCircuitProof.a,
                dscCircuitProof.b,
                dscCircuitProof.c,
                dscCircuitProof.pubSignals
            )
        ) {
            revert InvalidDscProof();
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
     * @notice Unified basic verification function for both passport and ID card proofs.
     * @dev Performs three core verification steps: rootCheck, currentDateCheck, groth16 proof verification
     * @param attestationId The attestation identifier
     * @param vcAndDiscloseProof The VC and Disclose proof data
     * @return output The verification result encoded as bytes (PassportOutput or EuIdOutput)
     */
    function _basicVerification(
        bytes32 attestationId,
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory vcAndDiscloseProof
    ) internal view returns (bytes memory output) {
        // Get indices for the specific attestation type
        CircuitConstantsV2.DiscloseIndices memory indices = CircuitConstantsV2.getDiscloseIndices(attestationId);
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();

        // === 1. ROOT CHECK ===
        // Verify identity commitment root exists in registry
        if (attestationId == AttestationId.E_PASSPORT) {
            if (
                !IIdentityRegistryV1($._registries[attestationId]).checkIdentityCommitmentRoot(
                    vcAndDiscloseProof.pubSignals[indices.merkleRootIndex]
                )
            ) {
                revert InvalidIdentityCommitmentRoot();
            }
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            if (
                !IIdentityRegistryIdCardV1($._registries[attestationId]).checkIdentityCommitmentRoot(
                    vcAndDiscloseProof.pubSignals[indices.merkleRootIndex]
                )
            ) {
                revert InvalidIdentityCommitmentRoot();
            }
        } else {
            revert InvalidAttestationId();
        }

        // === 2. CURRENT DATE CHECK ===
        // Verify current date is within valid range (±1 day)
        uint[6] memory dateNum;
        for (uint256 i = 0; i < 6; i++) {
            dateNum[i] = vcAndDiscloseProof.pubSignals[indices.currentDateIndex + i];
        }

        uint currentTimestamp = Formatter.proofDateToUnixTimestamp(dateNum);
        if (
            currentTimestamp < _getStartOfDayTimestamp() - 1 days + 1 ||
            currentTimestamp > _getStartOfDayTimestamp() + 1 days - 1
        ) {
            revert CurrentDateNotInValidRange();
        }

        // === 3. GROTH16 PROOF VERIFICATION ===
        // Verify the proof using the VC and Disclose circuit verifier
        if (
            !IVcAndDiscloseCircuitVerifier($._discloseVerifiers[attestationId]).verifyProof(
                vcAndDiscloseProof.a,
                vcAndDiscloseProof.b,
                vcAndDiscloseProof.c,
                vcAndDiscloseProof.pubSignals
            )
        ) {
            revert InvalidVcAndDiscloseProof();
        }

        // === 4. CREATE OUTPUT STRUCT AND ENCODE TO BYTES ===
        if (attestationId == AttestationId.E_PASSPORT) {
            // Create PassportOutput struct
            SelfStructs.PassportOutput memory passportOutput;
            passportOutput.attestationId = uint256(attestationId);

            // Extract revealed data (3 elements for passport)
            for (uint256 i = 0; i < 3; i++) {
                passportOutput.revealedDataPacked[i] = vcAndDiscloseProof.pubSignals[indices.revealedDataPackedIndex + i];
            }

            passportOutput.userIdentifier = vcAndDiscloseProof.pubSignals[indices.userIdentifierIndex];
            passportOutput.nullifier = vcAndDiscloseProof.pubSignals[indices.nullifierIndex];

            // Extract forbidden countries list (4 elements)
            for (uint256 i = 0; i < 4; i++) {
                passportOutput.forbiddenCountriesListPacked[i] = vcAndDiscloseProof.pubSignals[indices.forbiddenCountriesListPackedIndex + i];
            }

            return abi.encode(passportOutput);

        } else if (attestationId == AttestationId.EU_ID_CARD) {
            // Create EuIdOutput struct
            SelfStructs.EuIdOutput memory euIdOutput;
            euIdOutput.attestationId = uint256(attestationId);

            // Extract revealed data (4 elements for EU ID)
            for (uint256 i = 0; i < 4; i++) {
                euIdOutput.revealedDataPacked[i] = vcAndDiscloseProof.pubSignals[indices.revealedDataPackedIndex + i];
            }

            euIdOutput.userIdentifier = vcAndDiscloseProof.pubSignals[indices.userIdentifierIndex];
            euIdOutput.nullifier = vcAndDiscloseProof.pubSignals[indices.nullifierIndex];

            // Extract forbidden countries list (4 elements)
            for (uint256 i = 0; i < 4; i++) {
                euIdOutput.forbiddenCountriesListPacked[i] = vcAndDiscloseProof.pubSignals[indices.forbiddenCountriesListPackedIndex + i];
            }

            return abi.encode(euIdOutput);
        }

        revert InvalidAttestationId();
    }

    function _decodeVcAndDiscloseProof(bytes memory data) internal pure returns (VcAndDiscloseProof memory) {
        return abi.decode(data, (VcAndDiscloseProof));
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
