// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ImplRoot} from "./upgradeable/ImplRoot.sol";
import {SelfStructs} from "./libraries/SelfStructs.sol";
import {CustomVerifier} from "./libraries/CustomVerifier.sol";
import {GenericFormatter} from "./libraries/GenericFormatter.sol";
import {AttestationId} from "./constants/AttestationId.sol";
import {IVcAndDiscloseCircuitVerifier} from "./interfaces/IVcAndDiscloseCircuitVerifier.sol";
import {ISelfVerificationRoot} from "./interfaces/ISelfVerificationRoot.sol";
import {IIdentityRegistryV1} from "./interfaces/IIdentityRegistryV1.sol";
import {IIdentityRegistryIdCardV1} from "./interfaces/IIdentityRegistryIdCardV1.sol";
import {IRegisterCircuitVerifier} from "./interfaces/IRegisterCircuitVerifier.sol";
import {IDscCircuitVerifier} from "./interfaces/IDscCircuitVerifier.sol";
import {CircuitConstantsV2} from "./constants/CircuitConstantsV2.sol";
import {Formatter} from "./libraries/Formatter.sol";

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

    event HubInitializedV2();
    /**
     * @notice Emitted when a verification config V2 is set.
     * @param configId The configuration identifier (generated from config hash).
     * @param config The verification configuration that was set.
     */
    event VerificationConfigV2Set(bytes32 indexed configId, SelfStructs.VerificationConfigV2 config);
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

    /// @notice Thrown when the provided CSCA root is invalid.
    /// @dev Indicates that the CSCA root from the DSC proof does not match the expected CSCA root.
    error InvalidCscaRoot();

    error InvalidAttestationId();

    /// @notice Thrown when the scope in the header doesn't match the scope in the proof.
    /// @dev Ensures that the scope value in the header matches the scope value in the proof.
    error ScopeMismatch();

    error CrossChainIsNotSupportedYet();

    /// @notice Thrown when the input data is too short for decoding.
    /// @dev The input data must be at least 97 bytes (1 + 31 + 32 + 32 + 1 minimum).
    error InputTooShort();

    /// @notice Thrown when the user context data is too short for decoding.
    /// @dev The user context data must be at least 96 bytes (32 + 32 + 32 minimum).
    error UserContextDataTooShort();

    /// @notice Thrown when the user identifier hash does not match the proof user identifier.
    /// @dev Ensures that the user context data hash matches the user identifier in the proof.
    error InvalidUserIdentifierInProof();

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

    function initialize() external initializer {
        __ImplRoot_init();

        // Initialize circuit version to 2 for V2 hub
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        $._circuitVersion = 2;

        emit HubInitializedV2();
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

    function rootTimestamp(bytes32 attestationId, uint256 root) external view virtual onlyProxy returns (uint256) {
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        address registryAddress = $._registries[attestationId];

        if (attestationId == AttestationId.E_PASSPORT) {
            return IIdentityRegistryV1(registryAddress).rootTimestamps(root);
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            return IIdentityRegistryIdCardV1(registryAddress).rootTimestamps(root);
        } else {
            revert InvalidAttestationId();
        }
    }

    function getIdentityCommitmentMerkleRoot(bytes32 attestationId) external view virtual onlyProxy returns (uint256) {
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        address registryAddress = $._registries[attestationId];

        if (attestationId == AttestationId.E_PASSPORT) {
            return IIdentityRegistryV1(registryAddress).getIdentityCommitmentMerkleRoot();
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            return IIdentityRegistryIdCardV1(registryAddress).getIdentityCommitmentMerkleRoot();
        } else {
            revert InvalidAttestationId();
        }
    }

    // ====================================================
    // External Functions - Verification
    // ====================================================

    function _decodeInput(bytes calldata baseVerificationInput) internal pure returns (SelfStructs.HubInputHeader memory header, bytes calldata proofData) {
        if (baseVerificationInput.length < 97) {
            revert InputTooShort();
        }
        header.contractVersion = uint8(baseVerificationInput[0]);
        header.scope = uint256(bytes32(baseVerificationInput[32:64]));
        header.attestationId = bytes32(baseVerificationInput[64:96]);
        proofData = baseVerificationInput[96:];
    }

    /**
     * @notice Decodes userContextData to extract configId, destChainId, and userIdentifier
     * @param userContextData User-defined data in format: | 32 bytes configId | 32 bytes destChainId | 32 bytes userIdentifier | data |
     * @return configId The configuration identifier
     * @return destChainId The destination chain identifier
     * @return userIdentifier The user identifier
     * @return remainingData The remaining data after the first 96 bytes
     */
    function _decodeUserContextData(bytes calldata userContextData) internal pure returns (
        bytes32 configId,
        uint256 destChainId,
        uint256 userIdentifier,
        bytes calldata remainingData
    ) {
        if (userContextData.length < 96) {
            revert UserContextDataTooShort();
        }
        configId = bytes32(userContextData[0:32]);
        destChainId = uint256(bytes32(userContextData[32:64]));
        userIdentifier = uint256(bytes32(userContextData[64:96]));
        remainingData = userContextData[96:];
    }

    /**
     * @notice Gets verification config from V2 storage
     * @param configId The configuration identifier
     * @return The verification configuration
     */
    function getVerificationConfigV2(bytes32 configId) internal view virtual onlyProxy returns (SelfStructs.VerificationConfigV2 memory) {
        IdentityVerificationHubV2Storage storage $v2 = _getIdentityVerificationHubV2Storage();
        return $v2._v2VerificationConfigs[configId];
    }

    /**
     * @notice Generates a config ID from a verification config
     * @param config The verification configuration
     * @return The generated config ID (sha256 hash of encoded config)
     */
    function generateConfigId(SelfStructs.VerificationConfigV2 memory config) public pure returns (bytes32) {
        return sha256(abi.encode(config));
    }

    /**
     * @notice Sets verification config in V2 storage (owner only)
     * @dev The configId is automatically generated from the config content using sha256(abi.encode(config))
     * @param config The verification configuration
     * @return configId The generated config ID
     */
    function setVerificationConfigV2(SelfStructs.VerificationConfigV2 memory config) external virtual onlyProxy onlyOwner returns (bytes32 configId) {
        configId = generateConfigId(config);
        IdentityVerificationHubV2Storage storage $v2 = _getIdentityVerificationHubV2Storage();
        $v2._v2VerificationConfigs[configId] = config;

        emit VerificationConfigV2Set(configId, config);
    }

    /**
     * @notice Checks if a verification config exists
     * @param configId The configuration identifier
     * @return exists Whether the config exists
     */
    function verificationConfigV2Exists(bytes32 configId) external view virtual onlyProxy returns (bool exists) {
        SelfStructs.VerificationConfigV2 memory config = getVerificationConfigV2(configId);
        return generateConfigId(config) == configId;
    }

    /**
     * @notice Main verification function with new structured input format
     */
    function verify(
        bytes calldata baseVerificationInput,
        bytes calldata userContextData
    ) external virtual onlyProxy {
        (SelfStructs.HubInputHeader memory header, bytes calldata proofData) = _decodeInput(baseVerificationInput);

        // Perform verification and get output along with user data
        (bytes memory output, uint256 destChainId, bytes memory userDataToPass) = _executeVerificationFlow(header, proofData, userContextData);

        // Use destChainId and userDataToPass returned from _executeVerificationFlow
        _handleVerificationResult(destChainId, output, userDataToPass);
    }

    /**
     * @notice Gets verification config by configId
     */
    function _getVerificationConfigById(bytes32 configId) internal view returns (bytes memory config) {
        IdentityVerificationHubV2Storage storage $v2 = _getIdentityVerificationHubV2Storage();
        SelfStructs.VerificationConfigV2 memory verificationConfig = $v2._v2VerificationConfigs[configId];
        config = GenericFormatter.formatV2Config(verificationConfig);
    }

    /**
     * @notice Executes the complete verification flow
     */
    function _executeVerificationFlow(
        SelfStructs.HubInputHeader memory header,
        bytes memory proofData,
        bytes calldata userContextData
    ) internal returns (bytes memory output, uint256 destChainId, bytes memory userDataToPass) {
        bytes32 configId;
        uint256 userIdentifier;
        bytes calldata remainingData;
        {
            uint256 _destChainId;
            (configId, _destChainId, userIdentifier, remainingData) = _decodeUserContextData(userContextData);
            destChainId = _destChainId;
        }

        {
            bytes memory config = _getVerificationConfigById(configId);

            bytes memory proofOutput = _basicVerification(header, _decodeVcAndDiscloseProof(proofData), userContextData, userIdentifier);

            SelfStructs.GenericDiscloseOutputV2 memory genericDiscloseOutput = CustomVerifier.customVerify(
                header.attestationId,
                config,
                proofOutput
            );

            output = _formatVerificationOutput(header.contractVersion, genericDiscloseOutput);
        }

        userDataToPass = abi.encodePacked(bytes32(userIdentifier), remainingData);
    }

    /**
     * @notice Formats verification output based on contract version
     */
    function _formatVerificationOutput(
        uint256 contractVersion,
        SelfStructs.GenericDiscloseOutputV2 memory genericDiscloseOutput
    ) internal pure returns (bytes memory output) {
        if (contractVersion == 2) {
            output = GenericFormatter.toV2Struct(genericDiscloseOutput);
        }
    }

    /**
     * @notice Handles verification result based on destination chain
     */
    function _handleVerificationResult(uint256 destChainId, bytes memory output, bytes memory userDataToPass) internal {
        if (destChainId == block.chainid) {
            ISelfVerificationRoot(msg.sender).onVerificationSuccess(output, userDataToPass);
        } else {
            // Call external bridge
            // _handleBridge()
            revert CrossChainIsNotSupportedYet();
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
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        if (attestationId == AttestationId.E_PASSPORT) {
            IIdentityRegistryV1($._registries[attestationId]).registerDscKeyCommitment(
                dscCircuitProof.pubSignals[CircuitConstantsV2.DSC_TREE_LEAF_INDEX]
            );
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            IIdentityRegistryIdCardV1($._registries[attestationId]).registerDscKeyCommitment(
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
     * @dev Performs four core verification steps: scopeCheck, rootCheck, currentDateCheck, groth16 proof verification
     * @param header The hub input header containing scope and attestation information
     * @param vcAndDiscloseProof The VC and Disclose proof data
     * @return output The verification result encoded as bytes (PassportOutput or EuIdOutput)
     */
    function _basicVerification(
        SelfStructs.HubInputHeader memory header,
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory vcAndDiscloseProof,
        bytes calldata userContextData,
        uint256 userIdentifier
    ) internal returns (bytes memory output) {
        // Scope 1: Basic checks (scope and user identifier)
        {
            CircuitConstantsV2.DiscloseIndices memory indices = CircuitConstantsV2.getDiscloseIndices(header.attestationId);
            _performScopeCheck(header.scope, vcAndDiscloseProof, indices);
            _performUserIdentifierCheck(userContextData, vcAndDiscloseProof, header.attestationId, indices);
        }

        // Scope 2: Root and date checks
        {
            CircuitConstantsV2.DiscloseIndices memory indices = CircuitConstantsV2.getDiscloseIndices(header.attestationId);
            _performRootCheck(header.attestationId, vcAndDiscloseProof, indices);
            _performCurrentDateCheck(vcAndDiscloseProof, indices);
        }

        // Scope 3: Groth16 proof verification
        _performGroth16ProofVerification(header.attestationId, vcAndDiscloseProof);

        // Scope 4: Create and return output
        {
            CircuitConstantsV2.DiscloseIndices memory indices = CircuitConstantsV2.getDiscloseIndices(header.attestationId);
            return _createVerificationOutput(header.attestationId, vcAndDiscloseProof, indices, userIdentifier);
        }
    }

    /**
     * @notice Performs scope validation
     */
    function _performScopeCheck(
        uint256 headerScope,
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory vcAndDiscloseProof,
        CircuitConstantsV2.DiscloseIndices memory indices
    ) internal view {
        // Get scope from proof using the scope index from indices
        uint256 proofScope = vcAndDiscloseProof.pubSignals[indices.scopeIndex];

        if (headerScope != proofScope) {
            revert ScopeMismatch();
        }
    }

    /**
     * @notice Performs identity commitment root verification
     */
    function _performRootCheck(
        bytes32 attestationId,
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory vcAndDiscloseProof,
        CircuitConstantsV2.DiscloseIndices memory indices
    ) internal view {
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        uint256 merkleRoot = vcAndDiscloseProof.pubSignals[indices.merkleRootIndex];

        address registryAddress = $._registries[attestationId];

        if (registryAddress == address(0)) {
            revert("Registry not set for attestation ID");
        }

        if (attestationId == AttestationId.E_PASSPORT) {
            if (!IIdentityRegistryV1($._registries[attestationId]).checkIdentityCommitmentRoot(merkleRoot)) {
                revert InvalidIdentityCommitmentRoot();
            }
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            if (!IIdentityRegistryIdCardV1($._registries[attestationId]).checkIdentityCommitmentRoot(merkleRoot)) {
                revert InvalidIdentityCommitmentRoot();
            }
        } else {
            revert InvalidAttestationId();
        }
    }

    /**
     * @notice Performs current date validation
     */
    function _performCurrentDateCheck(
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory vcAndDiscloseProof,
        CircuitConstantsV2.DiscloseIndices memory indices
    ) internal view {
        uint[6] memory dateNum;
        for (uint256 i = 0; i < 6; i++) {
            dateNum[i] = vcAndDiscloseProof.pubSignals[indices.currentDateIndex + i];
        }

        uint currentTimestamp = Formatter.proofDateToUnixTimestamp(dateNum);
        uint startOfDay = _getStartOfDayTimestamp();

        if (currentTimestamp < startOfDay - 1 days + 1 || currentTimestamp > startOfDay + 1 days - 1) {
            revert CurrentDateNotInValidRange();
        }
    }

    /**
     * @notice Performs Groth16 proof verification
     */
    function _performGroth16ProofVerification(
        bytes32 attestationId,
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory vcAndDiscloseProof
    ) internal view {
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();

        if (!IVcAndDiscloseCircuitVerifier($._discloseVerifiers[attestationId]).verifyProof(
            vcAndDiscloseProof.a,
            vcAndDiscloseProof.b,
            vcAndDiscloseProof.c,
            vcAndDiscloseProof.pubSignals
        )) {
            revert InvalidVcAndDiscloseProof();
        }
    }

    /**
     * @notice Creates verification output based on attestation type
     */
    function _createVerificationOutput(
        bytes32 attestationId,
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory vcAndDiscloseProof,
        CircuitConstantsV2.DiscloseIndices memory indices,
        uint256 userIdentifier
    ) internal pure returns (bytes memory) {
        if (attestationId == AttestationId.E_PASSPORT) {
            return _createPassportOutput(vcAndDiscloseProof, indices, attestationId, userIdentifier);
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            return _createEuIdOutput(vcAndDiscloseProof, indices, attestationId, userIdentifier);
        } else {
            revert InvalidAttestationId();
        }
    }

    /**
     * @notice Creates passport output struct
     */
    function _createPassportOutput(
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory vcAndDiscloseProof,
        CircuitConstantsV2.DiscloseIndices memory indices,
        bytes32 attestationId,
        uint256 userIdentifier
    ) internal pure returns (bytes memory) {
        SelfStructs.PassportOutput memory passportOutput;
        passportOutput.attestationId = uint256(attestationId);
        passportOutput.userIdentifier = userIdentifier;
        passportOutput.nullifier = vcAndDiscloseProof.pubSignals[indices.nullifierIndex];

        // Extract revealed data
        uint256[3] memory revealedDataPacked;
        for (uint256 i = 0; i < 3; i++) {
            revealedDataPacked[i] = vcAndDiscloseProof.pubSignals[indices.revealedDataPackedIndex + i];
        }
        passportOutput.revealedDataPacked = Formatter.fieldElementsToBytes(revealedDataPacked);

        // Extract forbidden countries list
        for (uint256 i = 0; i < 4; i++) {
            passportOutput.forbiddenCountriesListPacked[i] = vcAndDiscloseProof.pubSignals[indices.forbiddenCountriesListPackedIndex + i];
        }

        return abi.encode(passportOutput);
    }

    /**
     * @notice Creates EU ID output struct
     */
    function _createEuIdOutput(
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory vcAndDiscloseProof,
        CircuitConstantsV2.DiscloseIndices memory indices,
        bytes32 attestationId,
        uint256 userIdentifier
    ) internal pure returns (bytes memory) {
        SelfStructs.EuIdOutput memory euIdOutput;
        euIdOutput.attestationId = uint256(attestationId);
        euIdOutput.userIdentifier = userIdentifier;
        euIdOutput.nullifier = vcAndDiscloseProof.pubSignals[indices.nullifierIndex];

        // Extract revealed data
        uint256[4] memory revealedDataPacked;
        for (uint256 i = 0; i < 4; i++) {
            revealedDataPacked[i] = vcAndDiscloseProof.pubSignals[indices.revealedDataPackedIndex + i];
        }
        euIdOutput.revealedDataPacked = Formatter.fieldElementsToBytesIdCard(revealedDataPacked);

        // Extract forbidden countries list
        for (uint256 i = 0; i < 4; i++) {
            euIdOutput.forbiddenCountriesListPacked[i] = vcAndDiscloseProof.pubSignals[indices.forbiddenCountriesListPackedIndex + i];
        }

        return abi.encode(euIdOutput);
    }

    function _decodeVcAndDiscloseProof(bytes memory data) internal pure returns (IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory) {
        return abi.decode(data, (IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof));
    }

    /**
     * @notice Performs user identifier validation
     */
    function _performUserIdentifierCheck(
        bytes calldata userContextData,
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory vcAndDiscloseProof,
        bytes32 attestationId,
        CircuitConstantsV2.DiscloseIndices memory indices
    ) internal pure {
        // Get the user identifier index for this attestation type
        uint256 proofUserIdentifier = vcAndDiscloseProof.pubSignals[indices.userIdentifierIndex];

        bytes32 sha256Hash = sha256(userContextData);
        bytes20 ripemdHash = ripemd160(abi.encodePacked(sha256Hash));
        uint256 hashedValue = uint256(uint160(ripemdHash));

        if (hashedValue != proofUserIdentifier) {
            revert InvalidUserIdentifierInProof();
        }
    }
}
