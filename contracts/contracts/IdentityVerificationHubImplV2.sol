// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ImplRoot} from "./upgradeable/ImplRoot.sol";
import {SelfStructs} from "./libraries/SelfStructs.sol";
import {GenericProofStruct} from "./interfaces/IRegisterCircuitVerifier.sol";
import {CustomVerifier} from "./libraries/CustomVerifier.sol";
import {GenericFormatter} from "./libraries/GenericFormatter.sol";
import {AttestationId} from "./constants/AttestationId.sol";
import {IVcAndDiscloseCircuitVerifier} from "./interfaces/IVcAndDiscloseCircuitVerifier.sol";
import {IVcAndDiscloseAadhaarCircuitVerifier} from "./interfaces/IVcAndDiscloseCircuitVerifier.sol";
import {ISelfVerificationRoot} from "./interfaces/ISelfVerificationRoot.sol";
import {IIdentityRegistryV1} from "./interfaces/IIdentityRegistryV1.sol";
import {IIdentityRegistryIdCardV1} from "./interfaces/IIdentityRegistryIdCardV1.sol";
import {IIdentityRegistryAadhaarV1} from "./interfaces/IIdentityRegistryAadhaarV1.sol";
import {IRegisterCircuitVerifier} from "./interfaces/IRegisterCircuitVerifier.sol";
import {IAadhaarRegisterCircuitVerifier} from "./interfaces/IRegisterCircuitVerifier.sol";
import {IDscCircuitVerifier} from "./interfaces/IDscCircuitVerifier.sol";
import {CircuitConstantsV2} from "./constants/CircuitConstantsV2.sol";
import {Formatter} from "./libraries/Formatter.sol";

/**
 * @title IdentityVerificationHubImplV2
 * @notice Main hub for identity verification in the Self Protocol
 * @dev This contract orchestrates multi-step verification processes including document attestation,
 * zero-knowledge proofs, OFAC compliance, and attribute disclosure control.
 *
 * @custom:version 2.12.0
 */
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
    }
    // We should consider to add bridge address
    // address bridgeAddress;

    /// @dev keccak256(abi.encode(uint256(keccak256("self.storage.IdentityVerificationHub")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant IDENTITYVERIFICATIONHUB_STORAGE_LOCATION =
        0x2ade7eace21710c689ddef374add52ace9783e33bac626e58e73a9d190173d00;

    /// @dev keccak256(abi.encode(uint256(keccak256("self.storage.IdentityVerificationHubV2")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant IDENTITYVERIFICATIONHUBV2_STORAGE_LOCATION =
        0xf9b5980dcec1a8b0609576a1f453bb2cad4732a0ea02bb89154d44b14a306c00;

    /// @notice The AADHAAR registration window around the current block timestamp.
    uint256 public AADHAAR_REGISTRATION_WINDOW;

    /**
     * @notice Returns the storage struct for the main IdentityVerificationHub.
     * @dev Uses ERC-7201 storage pattern for upgradeable contracts.
     * @return $ The storage struct reference.
     */
    function _getIdentityVerificationHubStorage() private pure returns (IdentityVerificationHubStorage storage $) {
        assembly {
            $.slot := IDENTITYVERIFICATIONHUB_STORAGE_LOCATION
        }
    }

    /**
     * @notice Returns the storage struct for IdentityVerificationHub V2 features.
     * @dev Uses ERC-7201 storage pattern for upgradeable contracts.
     * @return $ The V2 storage struct reference.
     */
    function _getIdentityVerificationHubV2Storage() private pure returns (IdentityVerificationHubV2Storage storage $) {
        assembly {
            $.slot := IDENTITYVERIFICATIONHUBV2_STORAGE_LOCATION
        }
    }

    /**
     * @notice Emitted when the Hub V2 is successfully initialized.
     */
    event HubInitializedV2();
    /**
     * @notice Emitted when a verification config V2 is set.
     * @param configId The configuration identifier (generated from config hash).
     * @param config The verification configuration that was set.
     */
    event VerificationConfigV2Set(bytes32 indexed configId, SelfStructs.VerificationConfigV2 config);
    /**
     * @notice Emitted when the registry address is updated.
     * @param attestationId The attestation identifier.
     * @param registry The new registry address.
     */
    event RegistryUpdated(bytes32 attestationId, address registry);
    /**
     * @notice Emitted when the VC and Disclose circuit verifier is updated.
     * @param attestationId The attestation identifier.
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

    /**
     * @notice Emitted when a verification is performed.
     * @param requestor The contract that initiated the verification request.
     * @param contractVersion The contract version used for verification output formatting.
     * @param attestationId The attestation identifier (E_PASSPORT or EU_ID_CARD).
     * @param destChainId The destination chain ID.
     * @param configId The configuration ID.
     * @param userIdentifier The user identifier.
     * @param output The formatted verification output containing proof results.
     * @param userDataToPass The user data passed through to the verification result handler.
     */
    event DisclosureVerified(
        address indexed requestor,
        uint8 indexed contractVersion,
        bytes32 indexed attestationId,
        uint256 destChainId,
        bytes32 configId,
        uint256 userIdentifier,
        bytes output,
        bytes userDataToPass
    );

    // ====================================================
    // Errors
    // ====================================================

    /// @notice Thrown when arrays have mismatched lengths in batch operations.
    /// @dev Ensures that all input arrays have the same length for batch updates.
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

    /// @notice Thrown when the provided identity commitment root is invalid.
    /// @dev Used in proofs to ensure that the identity commitment root matches the expected value in the registry.
    error InvalidIdentityCommitmentRoot();

    /// @notice Thrown when the provided DSC commitment root is invalid.
    /// @dev Used in proofs to ensure that the DSC commitment root matches the expected value in the registry.
    error InvalidDscCommitmentRoot();

    /// @notice Thrown when the provided CSCA root is invalid.
    /// @dev Indicates that the CSCA root from the DSC proof does not match the expected CSCA root.
    error InvalidCscaRoot();

    /// @notice Thrown when an invalid attestation ID is provided.
    /// @dev The attestation ID must be a supported type (e.g., E_PASSPORT or EU_ID_CARD).
    error InvalidAttestationId();

    /// @notice Thrown when the scope in the header doesn't match the scope in the proof.
    /// @dev Ensures that the scope value in the header matches the scope value in the proof.
    error ScopeMismatch();

    /// @notice Thrown when cross-chain verification is attempted but not yet supported.
    /// @dev Cross-chain bridging functionality is not implemented yet.
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

    /// @notice Thrown when the verification config is not set.
    /// @dev Ensures that the verification config is set before performing verification.
    error ConfigNotSet();

    /// @notice Thrown when the pubkey is not valid.
    /// @dev Ensures that the pubkey is valid.
    error InvalidPubkey();

    /// @notice Thrown when the timestamp is invalid.
    /// @dev Ensures that the timestamp is within 20 minutes of the current block timestamp.
    error InvalidUidaiTimestamp(uint256 blockTimestamp, uint256 timestamp);

    /// @notice Thrown when the attestationId in the proof doesn't match the header.
    /// @dev Ensures that the attestationId in the proof matches the header.
    error AttestationIdMismatch();

    /// @notice Thrown when the ofac roots don't match.
    /// @dev Ensures that the ofac roots match.
    error InvalidOfacRoots();

    // ====================================================
    // Constructor
    // ====================================================

    /**
     * @notice Constructor that disables initializers for the implementation contract.
     * @dev This prevents the implementation contract from being initialized directly.
     * The actual initialization should only happen through the proxy.
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor() {
        _disableInitializers();
    }

    // ====================================================
    // Initializer
    // ====================================================

    /**
     * @notice Initializes the Identity Verification Hub V2 contract for upgrade.
     * @dev Sets up the contract state including circuit version and emits initialization event.
     * This function is used when upgrading from V1 to V2, hence uses reinitializer(2).
     * The circuit version is set to 2 for V2 hub compatibility.
     */
    function initialize() external reinitializer(11) {
        __ImplRoot_init();

        // Initialize circuit version to 2 for V2 hub
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        $._circuitVersion = 2;

        // Initialize Aadhaar registration window
        AADHAAR_REGISTRATION_WINDOW = 20;

        emit HubInitializedV2();
    }

    /**
     * @notice Initializes governance for upgraded contracts.
     * @dev Used when upgrading from Ownable to AccessControl governance.
     * This function sets up AccessControl roles on an already-initialized contract.
     * It does NOT modify existing state (hub, roots, etc.).
     *
     * SECURITY: This function can only be called once - enforced by reinitializer(12).
     * The previous version used reinitializer(11), so this upgrade uses version 12.
     */
    function initializeGovernance() external reinitializer(12) {
        __ImplRoot_init();
    }

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
        GenericProofStruct memory registerCircuitProof
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
        } else if (attestationId == AttestationId.AADHAAR) {
            IIdentityRegistryAadhaarV1($._registries[attestationId]).registerCommitment(
                registerCircuitProof.pubSignals[CircuitConstantsV2.AADHAAR_NULLIFIER_INDEX],
                registerCircuitProof.pubSignals[CircuitConstantsV2.AADHAAR_COMMITMENT_INDEX]
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

    /**
     * @notice Sets verification config in V2 storage (owner only)
     * @dev The configId is automatically generated from the config content using sha256(abi.encode(config))
     * @param config The verification configuration
     * @return configId The generated config ID
     */
    function setVerificationConfigV2(
        SelfStructs.VerificationConfigV2 memory config
    ) external virtual onlyProxy returns (bytes32 configId) {
        configId = generateConfigId(config);
        IdentityVerificationHubV2Storage storage $v2 = _getIdentityVerificationHubV2Storage();
        $v2._v2VerificationConfigs[configId] = config;

        emit VerificationConfigV2Set(configId, config);
    }

    /**
     * @notice Updates the AADHAAR registration window.
     * @param window The new AADHAAR registration window.
     */
    function setAadhaarRegistrationWindow(uint256 window) external virtual onlyProxy onlyRole(SECURITY_ROLE) {
        AADHAAR_REGISTRATION_WINDOW = window;
    }

    /**
     * @notice Main verification function with new structured input format.
     * @dev Orchestrates the complete verification process including proof validation and result handling.
     * This function decodes the input, executes the verification flow, and handles the result based on destination chain.
     * @param baseVerificationInput The base verification input containing header and proof data.
     * @param userContextData The user context data containing config ID, destination chain ID, user identifier, and additional data.
     */
    function verify(bytes calldata baseVerificationInput, bytes calldata userContextData) external virtual onlyProxy {
        (SelfStructs.HubInputHeader memory header, bytes calldata proofData) = _decodeInput(baseVerificationInput);

        // Perform verification and get output along with user data
        (
            bytes memory output,
            uint256 destChainId,
            bytes memory userDataToPass,
            bytes32 configId,
            uint256 userIdentifier
        ) = _executeVerificationFlow(header, proofData, userContextData);

        // Use destChainId and userDataToPass returned from _executeVerificationFlow
        _handleVerificationResult(destChainId, output, userDataToPass);

        // Emit verification event for tracking
        emit DisclosureVerified(
            msg.sender,
            header.contractVersion,
            header.attestationId,
            destChainId,
            configId,
            userIdentifier,
            output,
            userDataToPass
        );
    }

    /**
     * @notice Updates the registry address.
     * @param registryAddress The new registry address.
     */
    function updateRegistry(
        bytes32 attestationId,
        address registryAddress
    ) external virtual onlyProxy onlyRole(SECURITY_ROLE) {
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
    ) external virtual onlyProxy onlyRole(SECURITY_ROLE) {
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
    ) external virtual onlyProxy onlyRole(SECURITY_ROLE) {
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
    ) external virtual onlyProxy onlyRole(SECURITY_ROLE) {
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
    ) external virtual onlyProxy onlyRole(SECURITY_ROLE) {
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
    ) external virtual onlyProxy onlyRole(SECURITY_ROLE) {
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
    // External View Functions
    // ====================================================

    /**
     * @notice Returns the registry address for a given attestation ID.
     * @param attestationId The attestation ID to query.
     * @return The registry address associated with the attestation ID.
     */
    function registry(bytes32 attestationId) external view virtual onlyProxy returns (address) {
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        return $._registries[attestationId];
    }

    /**
     * @notice Returns the disclose verifier address for a given attestation ID.
     * @param attestationId The attestation ID to query.
     * @return The disclose verifier address associated with the attestation ID.
     */
    function discloseVerifier(bytes32 attestationId) external view virtual onlyProxy returns (address) {
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        return $._discloseVerifiers[attestationId];
    }

    /**
     * @notice Returns the register circuit verifier address for a given attestation ID and type ID.
     * @param attestationId The attestation ID to query.
     * @param typeId The type ID to query.
     * @return The register circuit verifier address associated with the attestation ID and type ID.
     */
    function registerCircuitVerifiers(
        bytes32 attestationId,
        uint256 typeId
    ) external view virtual onlyProxy returns (address) {
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        return $._registerCircuitVerifiers[attestationId][typeId];
    }

    /**
     * @notice Returns the DSC circuit verifier address for a given attestation ID and type ID.
     * @param attestationId The attestation ID to query.
     * @param typeId The type ID to query.
     * @return The DSC circuit verifier address associated with the attestation ID and type ID.
     */
    function dscCircuitVerifiers(
        bytes32 attestationId,
        uint256 typeId
    ) external view virtual onlyProxy returns (address) {
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        return $._dscCircuitVerifiers[attestationId][typeId];
    }

    /**
     * @notice Returns the merkle root timestamp for a given attestation ID and root.
     * @param attestationId The attestation ID to query.
     * @param root The merkle root to query.
     * @return The merkle root timestamp associated with the attestation ID and root.
     */
    function rootTimestamp(bytes32 attestationId, uint256 root) external view virtual onlyProxy returns (uint256) {
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        address registryAddress = $._registries[attestationId];
        if (attestationId == AttestationId.E_PASSPORT) {
            return IIdentityRegistryV1(registryAddress).rootTimestamps(root);
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            return IIdentityRegistryIdCardV1(registryAddress).rootTimestamps(root);
        } else if (attestationId == AttestationId.AADHAAR) {
            return IIdentityRegistryAadhaarV1(registryAddress).rootTimestamps(root);
        } else {
            revert InvalidAttestationId();
        }
    }

    /**
     * @notice Returns the identity commitment merkle root for a given attestation ID.
     * @param attestationId The attestation ID to query.
     * @return The identity commitment merkle root associated with the attestation ID.
     */
    function getIdentityCommitmentMerkleRoot(bytes32 attestationId) external view virtual onlyProxy returns (uint256) {
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        address registryAddress = $._registries[attestationId];

        if (attestationId == AttestationId.E_PASSPORT) {
            return IIdentityRegistryV1(registryAddress).getIdentityCommitmentMerkleRoot();
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            return IIdentityRegistryIdCardV1(registryAddress).getIdentityCommitmentMerkleRoot();
        } else if (attestationId == AttestationId.AADHAAR) {
            return IIdentityRegistryAadhaarV1(registryAddress).getIdentityCommitmentMerkleRoot();
        } else {
            revert InvalidAttestationId();
        }
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

    // ====================================================
    // Public Functions
    // ====================================================

    /**
     * @notice Generates a config ID from a verification config
     * @param config The verification configuration
     * @return The generated config ID (sha256 hash of encoded config)
     */
    function generateConfigId(SelfStructs.VerificationConfigV2 memory config) public pure returns (bytes32) {
        return sha256(abi.encode(config));
    }

    // ====================================================
    // Internal Functions
    // ====================================================

    /**
     * @notice Executes the complete verification flow.
     * @dev Processes user context data, retrieves verification config, performs basic verification,
     * executes custom verification logic, and formats the output.
     * @param header The decoded hub input header containing verification parameters.
     * @param proofData The raw proof data to be decoded and verified.
     * @param userContextData The user-provided context data.
     * @return output The formatted verification output.
     * @return destChainId The destination chain identifier.
     * @return userDataToPass The remaining user data to pass through.
     */
    function _executeVerificationFlow(
        SelfStructs.HubInputHeader memory header,
        bytes memory proofData,
        bytes calldata userContextData
    )
        internal
        returns (
            bytes memory output,
            uint256 destChainId,
            bytes memory userDataToPass,
            bytes32 configId,
            uint256 userIdentifier
        )
    {
        bytes calldata remainingData;
        {
            (configId, destChainId, userIdentifier, remainingData) = _decodeUserContextData(userContextData);
        }

        {
            bytes memory config = _getVerificationConfigById(configId);

            bytes memory proofOutput = _basicVerification(
                header,
                _decodeVcAndDiscloseProof(proofData),
                userContextData,
                userIdentifier
            );

            SelfStructs.GenericDiscloseOutputV2 memory genericDiscloseOutput = CustomVerifier.customVerify(
                header.attestationId,
                config,
                proofOutput
            );

            output = _formatVerificationOutput(header.contractVersion, genericDiscloseOutput);
        }

        userDataToPass = remainingData;
    }

    /**
     * @notice Handles verification result based on destination chain.
     * @dev Routes the verification result to the appropriate handler based on whether
     * the destination is the current chain or requires cross-chain bridging.
     * @param destChainId The destination chain identifier.
     * @param output The verification output data.
     * @param userDataToPass The user data to pass to the result handler.
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

    /**
     * @notice Unified basic verification function for both passport and ID card proofs.
     * @dev Performs four core verification steps: scopeCheck, rootCheck, currentDateCheck, groth16 proof verification
     * @param header The hub input header containing scope and attestation information
     * @param vcAndDiscloseProof The VC and Disclose proof data
     * @param userContextData The user context data for validation
     * @param userIdentifier The user identifier for proof validation
     * @return output The verification result encoded as bytes (PassportOutput or EuIdOutput)
     */
    function _basicVerification(
        SelfStructs.HubInputHeader memory header,
        GenericProofStruct memory vcAndDiscloseProof,
        bytes calldata userContextData,
        uint256 userIdentifier
    ) internal returns (bytes memory output) {
        // Scope 1: Basic checks (scope and user identifier)
        CircuitConstantsV2.DiscloseIndices memory indices = CircuitConstantsV2.getDiscloseIndices(header.attestationId);
        {
            _performAttestationIdCheck(header.attestationId, vcAndDiscloseProof, indices);
            _performScopeCheck(header.scope, vcAndDiscloseProof, indices);
            _performUserIdentifierCheck(userContextData, vcAndDiscloseProof, header.attestationId, indices);
        }

        // Scope 2: Root, OFAC, and current date checks
        {
            _performRootCheck(header.attestationId, vcAndDiscloseProof, indices);
            _performOfacCheck(header.attestationId, vcAndDiscloseProof, indices);
            _performCurrentDateCheck(header.attestationId, vcAndDiscloseProof, indices);
        }

        // Scope 3: Groth16 proof verification
        _performGroth16ProofVerification(header.attestationId, vcAndDiscloseProof);

        // Scope 4: Create and return output
        {
            return _createVerificationOutput(header.attestationId, vcAndDiscloseProof, indices, userIdentifier);
        }
    }

    // ====================================================
    // Internal View Functions
    // ====================================================

    /**
     * @notice Gets verification config from V2 storage
     * @param configId The configuration identifier
     * @return The verification configuration
     */
    function getVerificationConfigV2(
        bytes32 configId
    ) public view virtual onlyProxy returns (SelfStructs.VerificationConfigV2 memory) {
        IdentityVerificationHubV2Storage storage $v2 = _getIdentityVerificationHubV2Storage();
        return $v2._v2VerificationConfigs[configId];
    }

    /**
     * @notice Gets verification config by configId
     */
    function _getVerificationConfigById(bytes32 configId) internal view returns (bytes memory config) {
        IdentityVerificationHubV2Storage storage $v2 = _getIdentityVerificationHubV2Storage();
        SelfStructs.VerificationConfigV2 memory verificationConfig = $v2._v2VerificationConfigs[configId];
        config = GenericFormatter.formatV2Config(verificationConfig);
        if (generateConfigId(verificationConfig) != configId) {
            revert ConfigNotSet();
        }
        return config;
    }

    /**
     * @notice Verifies the register circuit proof.
     * @dev Uses the register circuit verifier specified by registerCircuitVerifierId.
     * @param attestationId The attestation ID.
     * @param registerCircuitVerifierId The identifier for the register circuit verifier.
     * @param registerCircuitProof The register circuit proof data.
     */
    function _verifyRegisterProof(
        bytes32 attestationId,
        uint256 registerCircuitVerifierId,
        GenericProofStruct memory registerCircuitProof
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
        } else if (attestationId == AttestationId.AADHAAR) {
            uint256 timestamp = registerCircuitProof.pubSignals[CircuitConstantsV2.AADHAAR_TIMESTAMP_INDEX];
            if (timestamp < (block.timestamp - (AADHAAR_REGISTRATION_WINDOW * 1 minutes))) {
                revert InvalidUidaiTimestamp(block.timestamp, timestamp);
            }
            if (timestamp > (block.timestamp + (AADHAAR_REGISTRATION_WINDOW * 1 minutes))) {
                revert InvalidUidaiTimestamp(block.timestamp, timestamp);
            }

            if (
                !IIdentityRegistryAadhaarV1($._registries[attestationId]).checkUidaiPubkey(
                    registerCircuitProof.pubSignals[CircuitConstantsV2.AADHAAR_UIDAI_PUBKEY_COMMITMENT_INDEX]
                )
            ) {
                revert InvalidPubkey();
            }
        } else {
            revert InvalidAttestationId();
        }

        if (attestationId == AttestationId.E_PASSPORT || attestationId == AttestationId.EU_ID_CARD) {
            require(registerCircuitProof.pubSignals.length == 3, "Invalid pubSignals length");
            uint256[3] memory pubSignals = [
                registerCircuitProof.pubSignals[0],
                registerCircuitProof.pubSignals[1],
                registerCircuitProof.pubSignals[2]
            ];
            if (
                !IRegisterCircuitVerifier(verifier).verifyProof(
                    registerCircuitProof.a,
                    registerCircuitProof.b,
                    registerCircuitProof.c,
                    pubSignals
                )
            ) {
                revert InvalidRegisterProof();
            }
        } else if (attestationId == AttestationId.AADHAAR) {
            require(registerCircuitProof.pubSignals.length == 4, "Invalid pubSignals length");
            uint256[4] memory pubSignals = [
                registerCircuitProof.pubSignals[0],
                registerCircuitProof.pubSignals[1],
                registerCircuitProof.pubSignals[2],
                registerCircuitProof.pubSignals[3]
            ];

            if (
                !IAadhaarRegisterCircuitVerifier(verifier).verifyProof(
                    registerCircuitProof.a,
                    registerCircuitProof.b,
                    registerCircuitProof.c,
                    pubSignals
                )
            ) {
                revert InvalidRegisterProof();
            }
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
     * @notice Performs attestationId check
     */
    function _performAttestationIdCheck(
        bytes32 attestationId,
        GenericProofStruct memory vcAndDiscloseProof,
        CircuitConstantsV2.DiscloseIndices memory indices
    ) internal pure {
        if (vcAndDiscloseProof.pubSignals[indices.attestationIdIndex] != uint256(attestationId)) {
            revert AttestationIdMismatch();
        }
    }

    /**
     * @notice Performs scope validation
     */
    function _performScopeCheck(
        uint256 headerScope,
        GenericProofStruct memory vcAndDiscloseProof,
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
        GenericProofStruct memory vcAndDiscloseProof,
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
        } else if (attestationId == AttestationId.AADHAAR) {
            if (!IIdentityRegistryAadhaarV1($._registries[attestationId]).checkIdentityCommitmentRoot(merkleRoot)) {
                revert InvalidIdentityCommitmentRoot();
            }
        } else {
            revert InvalidAttestationId();
        }
    }

    function _performOfacCheck(
        bytes32 attestationId,
        GenericProofStruct memory vcAndDiscloseProof,
        CircuitConstantsV2.DiscloseIndices memory indices
    ) internal view {
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();

        if (attestationId == AttestationId.E_PASSPORT) {
            if (
                !IIdentityRegistryV1($._registries[attestationId]).checkOfacRoots(
                    vcAndDiscloseProof.pubSignals[indices.passportNoSmtRootIndex],
                    vcAndDiscloseProof.pubSignals[indices.namedobSmtRootIndex],
                    vcAndDiscloseProof.pubSignals[indices.nameyobSmtRootIndex]
                )
            ) {
                revert InvalidOfacRoots();
            }
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            if (
                !IIdentityRegistryIdCardV1($._registries[attestationId]).checkOfacRoots(
                    vcAndDiscloseProof.pubSignals[indices.namedobSmtRootIndex],
                    vcAndDiscloseProof.pubSignals[indices.nameyobSmtRootIndex]
                )
            ) {
                revert InvalidOfacRoots();
            }
        } else if (attestationId == AttestationId.AADHAAR) {
            if (
                !IIdentityRegistryAadhaarV1($._registries[attestationId]).checkOfacRoots(
                    vcAndDiscloseProof.pubSignals[indices.namedobSmtRootIndex],
                    vcAndDiscloseProof.pubSignals[indices.nameyobSmtRootIndex]
                )
            ) {
                revert InvalidOfacRoots();
            }
        } else {
            revert InvalidAttestationId();
        }
    }

    /**
     * @notice Performs current date validation with format-aware parsing
     * @dev Handles three date formats:
     * - E_PASSPORT/EU_ID_CARD: 6 ASCII chars (YYMMDD)
     * - SELFRICA_ID_CARD: 8 ASCII digits (YYYYMMDD)
     * - AADHAAR: 3 numeric signals (year, month, day)
     * @param attestationId The attestation type to determine date format
     * @param vcAndDiscloseProof The proof containing date information
     * @param indices Circuit-specific indices for extracting date values
     */
    function _performCurrentDateCheck(
        bytes32 attestationId,
        GenericProofStruct memory vcAndDiscloseProof,
        CircuitConstantsV2.DiscloseIndices memory indices
    ) internal view {
        uint256 currentTimestamp;
        uint256 startIndex = indices.currentDateIndex;

        if (attestationId == AttestationId.E_PASSPORT || attestationId == AttestationId.EU_ID_CARD) {
            // E_PASSPORT, EU_ID_CARD: 6 ASCII chars (YYMMDD)
            uint256[6] memory dateNum;
            unchecked {
                for (uint256 i; i < 6; ++i) {
                    dateNum[i] = vcAndDiscloseProof.pubSignals[startIndex + i];
                }
            }
            currentTimestamp = Formatter.proofDateToUnixTimestamp(dateNum);
        } else {
            // AADHAAR: 3 numeric signals [year, month, day]
            currentTimestamp = Formatter.proofDateToUnixTimestampNumeric(
                [
                    vcAndDiscloseProof.pubSignals[startIndex],
                    vcAndDiscloseProof.pubSignals[startIndex + 1],
                    vcAndDiscloseProof.pubSignals[startIndex + 2]
                ]
            );
        }

        _validateDateInRange(currentTimestamp);
    }

    /**
     * @notice Validates that a timestamp is within the acceptable range
     * @param currentTimestamp The timestamp to validate
     */
    function _validateDateInRange(uint256 currentTimestamp) internal view {
        // Calculate the timestamp for the start of current date by subtracting the remainder of block.timestamp modulo 1 day
        uint256 startOfDay = block.timestamp - (block.timestamp % 1 days);

        // Check if timestamp is within range
        if (currentTimestamp < startOfDay - 1 days + 1 || currentTimestamp > startOfDay + 1 days - 1) {
            revert CurrentDateNotInValidRange();
        }
    }

    /**
     * @notice Performs Groth16 proof verification
     */
    function _performGroth16ProofVerification(
        bytes32 attestationId,
        GenericProofStruct memory vcAndDiscloseProof
    ) internal view {
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();

        if (attestationId == AttestationId.E_PASSPORT || attestationId == AttestationId.EU_ID_CARD) {
            uint256[21] memory pubSignals;
            for (uint256 i = 0; i < 21; i++) {
                pubSignals[i] = vcAndDiscloseProof.pubSignals[i];
            }
            if (
                !IVcAndDiscloseCircuitVerifier($._discloseVerifiers[attestationId]).verifyProof(
                    vcAndDiscloseProof.a,
                    vcAndDiscloseProof.b,
                    vcAndDiscloseProof.c,
                    pubSignals
                )
            ) {
                revert InvalidVcAndDiscloseProof();
            }
        } else if (attestationId == AttestationId.AADHAAR) {
            uint256[19] memory pubSignals;
            for (uint256 i = 0; i < 19; i++) {
                pubSignals[i] = vcAndDiscloseProof.pubSignals[i];
            }

            if (
                !IVcAndDiscloseAadhaarCircuitVerifier($._discloseVerifiers[attestationId]).verifyProof(
                    vcAndDiscloseProof.a,
                    vcAndDiscloseProof.b,
                    vcAndDiscloseProof.c,
                    pubSignals
                )
            ) {
                revert InvalidVcAndDiscloseProof();
            }
        } else {
            revert InvalidAttestationId();
        }
    }

    // ====================================================
    // Internal Pure Functions
    // ====================================================

    /**
     * @notice Decodes the input data to extract the header and proof data.
     * @param baseVerificationInput The input data to decode. Format: | 1 byte contractVersion | 31 bytes buffer | 32 bytes scope | 32 bytes attestationId | user defined data |
     * @return header The header of the input data.
     * @return proofData The proof data of the input data.
     */
    function _decodeInput(
        bytes calldata baseVerificationInput
    ) internal pure returns (SelfStructs.HubInputHeader memory header, bytes calldata proofData) {
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
    function _decodeUserContextData(
        bytes calldata userContextData
    )
        internal
        pure
        returns (bytes32 configId, uint256 destChainId, uint256 userIdentifier, bytes calldata remainingData)
    {
        if (userContextData.length < 96) {
            revert UserContextDataTooShort();
        }
        configId = bytes32(userContextData[0:32]);
        destChainId = uint256(bytes32(userContextData[32:64]));
        userIdentifier = uint256(bytes32(userContextData[64:96]));
        remainingData = userContextData[96:];
    }

    /**
     * @notice Formats verification output based on contract version.
     * @dev Converts the generic disclosure output to the appropriate struct format based on version.
     * @param contractVersion The contract version to determine output format.
     * @param genericDiscloseOutput The generic disclosure output to format.
     * @return output The formatted output as bytes.
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
     * @notice Creates verification output based on attestation type.
     * @dev Routes to the appropriate output creation function based on the attestation ID.
     * @param attestationId The attestation identifier (passport or EU ID card).
     * @param vcAndDiscloseProof The VC and Disclose proof data.
     * @param indices The circuit-specific indices for extracting proof values.
     * @param userIdentifier The user identifier to include in the output.
     * @return The encoded verification output.
     */
    function _createVerificationOutput(
        bytes32 attestationId,
        GenericProofStruct memory vcAndDiscloseProof,
        CircuitConstantsV2.DiscloseIndices memory indices,
        uint256 userIdentifier
    ) internal pure returns (bytes memory) {
        if (attestationId == AttestationId.E_PASSPORT) {
            return _createPassportOutput(vcAndDiscloseProof, indices, attestationId, userIdentifier);
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            return _createEuIdOutput(vcAndDiscloseProof, indices, attestationId, userIdentifier);
        } else if (attestationId == AttestationId.AADHAAR) {
            return _createAadhaarOutput(vcAndDiscloseProof, indices, attestationId, userIdentifier);
        } else {
            revert InvalidAttestationId();
        }
    }

    /**
     * @notice Creates passport output struct.
     * @dev Constructs a PassportOutput struct from the proof data and encodes it.
     * @param vcAndDiscloseProof The VC and Disclose proof containing passport data.
     * @param indices The circuit-specific indices for extracting proof values.
     * @param attestationId The attestation identifier.
     * @param userIdentifier The user identifier.
     * @return The encoded PassportOutput struct.
     */
    function _createPassportOutput(
        GenericProofStruct memory vcAndDiscloseProof,
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
            passportOutput.forbiddenCountriesListPacked[i] = vcAndDiscloseProof.pubSignals[
                indices.forbiddenCountriesListPackedIndex + i
            ];
        }

        return abi.encode(passportOutput);
    }

    /**
     * @notice Creates EU ID output struct.
     * @dev Constructs an EuIdOutput struct from the proof data and encodes it.
     * @param vcAndDiscloseProof The VC and Disclose proof containing EU ID card data.
     * @param indices The circuit-specific indices for extracting proof values.
     * @param attestationId The attestation identifier.
     * @param userIdentifier The user identifier.
     * @return The encoded EuIdOutput struct.
     */
    function _createEuIdOutput(
        GenericProofStruct memory vcAndDiscloseProof,
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
            euIdOutput.forbiddenCountriesListPacked[i] = vcAndDiscloseProof.pubSignals[
                indices.forbiddenCountriesListPackedIndex + i
            ];
        }

        return abi.encode(euIdOutput);
    }

    function _createAadhaarOutput(
        GenericProofStruct memory vcAndDiscloseProof,
        CircuitConstantsV2.DiscloseIndices memory indices,
        bytes32 attestationId,
        uint256 userIdentifier
    ) internal pure returns (bytes memory) {
        SelfStructs.AadhaarOutput memory aadhaarOutput;
        aadhaarOutput.attestationId = uint256(attestationId);
        aadhaarOutput.userIdentifier = userIdentifier;
        aadhaarOutput.nullifier = vcAndDiscloseProof.pubSignals[indices.nullifierIndex];

        uint256[4] memory revealedDataPacked;
        for (uint256 i = 0; i < 4; i++) {
            revealedDataPacked[i] = vcAndDiscloseProof.pubSignals[indices.revealedDataPackedIndex + i];
        }
        aadhaarOutput.revealedDataPacked = Formatter.fieldElementsToBytesAadhaar(revealedDataPacked);

        for (uint256 i = 0; i < 4; i++) {
            aadhaarOutput.forbiddenCountriesListPacked[i] = vcAndDiscloseProof.pubSignals[
                indices.forbiddenCountriesListPackedIndex + i
            ];
        }

        return abi.encode(aadhaarOutput);
    }

    /**
     * @notice Decodes VC and Disclose proof from bytes data.
     * @dev Simple wrapper around abi.decode for type safety and clarity.
     * @param data The encoded proof data.
     * @return The decoded VcAndDiscloseProof struct.
     */
    function _decodeVcAndDiscloseProof(bytes memory data) internal pure returns (GenericProofStruct memory) {
        return abi.decode(data, (GenericProofStruct));
    }

    /**
     * @notice Performs user identifier validation.
     * @dev Validates that the user identifier in the proof matches the hash of the user context data.
     * Uses SHA256 followed by RIPEMD160 hashing for consistency with circuit implementation.
     * @param userContextData The user context data to hash and compare.
     * @param vcAndDiscloseProof The VC and Disclose proof containing the user identifier.
     * @param attestationId The attestation identifier (used for getting correct indices).
     * @param indices The circuit-specific indices for extracting the user identifier from proof.
     */
    function _performUserIdentifierCheck(
        bytes calldata userContextData,
        GenericProofStruct memory vcAndDiscloseProof,
        bytes32 attestationId,
        CircuitConstantsV2.DiscloseIndices memory indices
    ) internal pure {
        // Get the user identifier index for this attestation type
        uint256 proofUserIdentifier = vcAndDiscloseProof.pubSignals[indices.userIdentifierIndex];

        bytes memory userContextDataWithoutConfigId = userContextData[32:];
        bytes32 sha256Hash = sha256(userContextDataWithoutConfigId);
        bytes20 ripemdHash = ripemd160(abi.encodePacked(sha256Hash));
        uint256 hashedValue = uint256(uint160(ripemdHash));

        if (hashedValue != proofUserIdentifier) {
            revert InvalidUserIdentifierInProof();
        }
    }
}
