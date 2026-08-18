// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ImplRoot} from "./upgradeable/ImplRoot.sol";
import {SelfStructs} from "./libraries/SelfStructs.sol";
import {GenericProofStruct} from "./interfaces/IRegisterCircuitVerifier.sol";
import {CustomVerifier} from "./libraries/CustomVerifier.sol";
import {GenericFormatter} from "./libraries/GenericFormatter.sol";
import {AttestationId} from "./constants/AttestationId.sol";
import {ISelfVerificationRoot} from "./interfaces/ISelfVerificationRoot.sol";
import {IIdentityRegistryV1} from "./interfaces/IIdentityRegistryV1.sol";
import {IIdentityRegistryIdCardV1} from "./interfaces/IIdentityRegistryIdCardV1.sol";
import {IIdentityRegistryAadhaarV1} from "./interfaces/IIdentityRegistryAadhaarV1.sol";
import {IIdentityRegistryKycV1} from "./interfaces/IIdentityRegistryKycV1.sol";
import {IDscCircuitVerifier} from "./interfaces/IDscCircuitVerifier.sol";
import {CircuitConstantsV2} from "./constants/CircuitConstantsV2.sol";
import {Formatter} from "./libraries/Formatter.sol";
import {OutputFormatterLib} from "./libraries/OutputFormatterLib.sol";
import {ProofVerifierLib} from "./libraries/ProofVerifierLib.sol";
import {RegisterProofVerifierLib} from "./libraries/RegisterProofVerifierLib.sol";
import {DscProofVerifierLib} from "./libraries/DscProofVerifierLib.sol";
import {RootCheckLib} from "./libraries/RootCheckLib.sol";
import {OfacCheckLib} from "./libraries/OfacCheckLib.sol";
import {GCPJWTHelper} from "./libraries/GCPJWTHelper.sol";
import {IGCPJWTVerifier, IPCR0Manager} from "./registry/IdentityRegistryKycImplV1.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {console} from "hardhat/console.sol";

/**
 * @title IdentityVerificationHubImplV2
 * @notice Main hub for identity verification in the Self Protocol
 * @dev This contract orchestrates multi-step verification processes including document attestation,
 * zero-knowledge proofs, OFAC compliance, and attribute disclosure control.
 *
 * @custom:version 2.15.0
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

    /// @custom:storage-location erc7201:self.storage.IdentityVerificationHubProver
    struct IdentityVerificationHubProverStorage {
        address _gcpJwtVerifier;
        address _pcr0Manager;
        uint256 _gcpRootCAPubkeyHash;
        address _proverTee;
        mapping(address proverKey => bool) _isRegisteredProverKey;
    }

    /// @dev keccak256(abi.encode(uint256(keccak256("self.storage.IdentityVerificationHub")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant IDENTITYVERIFICATIONHUB_STORAGE_LOCATION =
        0x2ade7eace21710c689ddef374add52ace9783e33bac626e58e73a9d190173d00;

    /// @dev keccak256(abi.encode(uint256(keccak256("self.storage.IdentityVerificationHubV2")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant IDENTITYVERIFICATIONHUBV2_STORAGE_LOCATION =
        0xf9b5980dcec1a8b0609576a1f453bb2cad4732a0ea02bb89154d44b14a306c00;

    /// @dev keccak256(abi.encode(uint256(keccak256("self.storage.IdentityVerificationHubProver")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant IDENTITYVERIFICATIONHUBPROVER_STORAGE_LOCATION =
        0x76afff5e6fcbd388aa8aee87a47ca8d919948df285010f5bede324c9e7235300;

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
     * @notice Returns the storage struct for the Hub's prover key configuration.
     * @dev Uses ERC-7201 storage pattern for upgradeable contracts.
     * @return $ The prover storage struct reference.
     */
    function _getProverStorage() private pure returns (IdentityVerificationHubProverStorage storage $) {
        assembly {
            $.slot := IDENTITYVERIFICATIONHUBPROVER_STORAGE_LOCATION
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
     * @notice Emitted when the prover GCP JWT verifier address is updated.
     * @param verifier The new GCP JWT verifier address.
     */
    event ProverGCPJWTVerifierUpdated(address indexed verifier);
    /**
     * @notice Emitted when the prover PCR0 manager address is updated.
     * @param pcr0Manager The new PCR0 manager address.
     */
    event ProverPCR0ManagerUpdated(address indexed pcr0Manager);
    /**
     * @notice Emitted when the prover GCP root CA pubkey hash is updated.
     * @param rootCAPubkeyHash The new GCP root CA pubkey hash.
     */
    event ProverGCPRootCAPubkeyHashUpdated(uint256 rootCAPubkeyHash);
    /**
     * @notice Emitted when the prover TEE address is updated.
     * @param proverTee The new prover TEE address.
     */
    event ProverTEEUpdated(address indexed proverTee);
    /**
     * @notice Emitted when a prover key is registered via GCP JWT proof.
     * @param proverKey The decoded prover address that was registered.
     */
    event ProverKeyRegistered(address indexed proverKey);
    /**
     * @notice Emitted when a prover key is revoked.
     * @param proverKey The prover address that was revoked.
     */
    event ProverKeyRevoked(address indexed proverKey);

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

    /// @notice Thrown when the provided signature is not exactly 65 bytes.
    error InvalidSignatureLength();

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

    /// @notice Thrown when the pubkey commitment is invalid.
    /// @dev Ensures that the pubkey commitment is valid.
    error InvalidPubkeyCommitment();

    /// @notice Thrown when a required prover config value (verifier, PCR0Manager, or root CA hash) is unset.
    /// @dev An unset config value must never be silently treated as "skip verification".
    error ProverConfigNotSet();

    /// @notice Thrown when a function restricted to the prover TEE is called by any other address.
    error OnlyProverTEECanAccess();

    /// @notice Thrown when the GCP JWT proof verification fails for a prover key registration.
    error InvalidProverProof();

    /// @notice Thrown when the GCP root CA public key hash does not match the expected value.
    error InvalidProverRootCA();

    /// @notice Thrown when the TEE image hash is not registered in the PCR0Manager.
    error InvalidProverImage();

    /// @notice Thrown when the attested nonce carries content beyond the 40 hex characters
    ///         that encode the prover address, i.e. pubSignals[3] or pubSignals[4] is non-zero.
    error InvalidProverNoncePadding();

    /// @notice Thrown when the attestation's current-date signal is more than 1 hour away
    ///         from the block timestamp, in either direction.
    error InvalidProverTimestamp();

    /// @notice Thrown when the decoded prover address is the zero address.
    /// @dev 40 ASCII '0' characters decode to address(0). Not reachable without a genuine
    ///      attestation over an all-zeros eat_nonce, but the registered-key mapping is consumed
    ///      as an authorization oracle, and address(0) is also what a malformed ecrecover
    ///      returns — so a consumer checking isRegisteredProverKey(ecrecover(...)) would have
    ///      an auth bypass if address(0) were ever registered here.
    error InvalidProverAddress();

    /// @notice Thrown when the proof's signature does not recover to a registered prover key.
    /// @dev The digest is keccak256(abi.encode(a, b, c, pubSignals)) — the exact bytes the TEE
    ///      prover signs (raw prehash secp256k1, no EIP-191 prefix, v in {27, 28}).
    error UnauthorizedProverSigner();

    // ====================================================
    // Modifiers
    // ====================================================

    /**
     * @notice Modifier to restrict access to functions to only the prover TEE.
     * @dev Reverts if the prover TEE is not set or if the caller is not the prover TEE.
     */
    modifier onlyProverTEE() {
        address tee = _getProverStorage()._proverTee;
        if (tee == address(0)) revert ProverConfigNotSet();
        if (msg.sender != tee) revert OnlyProverTEECanAccess();
        _;
    }

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
     * @param signature The 65-byte TEE prover signature over keccak256(abi.encode(a, b, c, pubSignals)).
     */
    function registerCommitment(
        bytes32 attestationId,
        uint256 registerCircuitVerifierId,
        GenericProofStruct memory registerCircuitProof,
        bytes calldata signature
    ) external virtual onlyProxy {
        if (signature.length != 65) {
            revert InvalidSignatureLength();
        }
        _verifyProverSignature(
            registerCircuitProof.a,
            registerCircuitProof.b,
            registerCircuitProof.c,
            registerCircuitProof.pubSignals,
            signature
        );
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
        } else if (attestationId == AttestationId.KYC) {
            IIdentityRegistryKycV1($._registries[attestationId]).registerCommitment(
                registerCircuitProof.pubSignals[CircuitConstantsV2.KYC_NULLIFIER_INDEX],
                registerCircuitProof.pubSignals[CircuitConstantsV2.KYC_COMMITMENT_INDEX]
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
     * @param signature The 65-byte TEE prover signature over keccak256(abi.encode(a, b, c, pubSignals)).
     */
    function registerDscKeyCommitment(
        bytes32 attestationId,
        uint256 dscCircuitVerifierId,
        IDscCircuitVerifier.DscCircuitProof memory dscCircuitProof,
        bytes calldata signature
    ) external virtual onlyProxy {
        if (signature.length != 65) {
            revert InvalidSignatureLength();
        }
        // The TEE signs pubSignals as a dynamic array; the fixed uint256[2] must be widened
        // before hashing or the digest will not match.
        uint256[] memory dscPubSignals = new uint256[](2);
        dscPubSignals[0] = dscCircuitProof.pubSignals[0];
        dscPubSignals[1] = dscCircuitProof.pubSignals[1];
        _verifyProverSignature(dscCircuitProof.a, dscCircuitProof.b, dscCircuitProof.c, dscPubSignals, signature);
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

    /**
     * @notice Updates the prover GCP JWT verifier address.
     * @param verifier The new GCP JWT verifier address.
     */
    function updateProverGCPJWTVerifier(address verifier) external virtual onlyProxy onlyRole(SECURITY_ROLE) {
        _getProverStorage()._gcpJwtVerifier = verifier;
        emit ProverGCPJWTVerifierUpdated(verifier);
    }

    /**
     * @notice Updates the prover PCR0 manager address.
     * @param pcr0Manager The new PCR0 manager address.
     */
    function updateProverPCR0Manager(address pcr0Manager) external virtual onlyProxy onlyRole(SECURITY_ROLE) {
        _getProverStorage()._pcr0Manager = pcr0Manager;
        emit ProverPCR0ManagerUpdated(pcr0Manager);
    }

    /**
     * @notice Updates the prover GCP root CA pubkey hash.
     * @param rootCAPubkeyHash The new GCP root CA pubkey hash.
     */
    function updateProverGCPRootCAPubkeyHash(
        uint256 rootCAPubkeyHash
    ) external virtual onlyProxy onlyRole(SECURITY_ROLE) {
        _getProverStorage()._gcpRootCAPubkeyHash = rootCAPubkeyHash;
        emit ProverGCPRootCAPubkeyHashUpdated(rootCAPubkeyHash);
    }

    /**
     * @notice Updates the prover TEE address.
     * @param proverTee The new prover TEE address.
     */
    function updateProverTEE(address proverTee) external virtual onlyProxy onlyRole(SECURITY_ROLE) {
        _getProverStorage()._proverTee = proverTee;
        emit ProverTEEUpdated(proverTee);
    }

    /// @notice Registers a prover key via GCP JWT attestation proof.
    /// @dev Verifies the proof, checks the root CA hash matches the configured value, validates the
    /// image hash against the PCR0Manager, and decodes the attested address from the eat_nonce chunks.
    /// @param pA Groth16 proof element A.
    /// @param pB Groth16 proof element B.
    /// @param pC Groth16 proof element C.
    /// @param pubSignals Circuit public signals: [rootCAHash, eatNonce[0-3], imageHash[0-2], currentDate[0-11]].
    function registerProverKey(
        uint256[2] calldata pA,
        uint256[2][2] calldata pB,
        uint256[2] calldata pC,
        uint256[20] calldata pubSignals
    ) external virtual onlyProxy onlyProverTEE {
        IdentityVerificationHubProverStorage storage $ = _getProverStorage();

        // An unset verifier must never be read as "skip verification".
        if ($._gcpJwtVerifier == address(0) || $._pcr0Manager == address(0) || $._gcpRootCAPubkeyHash == 0) {
            revert ProverConfigNotSet();
        }

        // Check if the proof is valid
        if (!IGCPJWTVerifier($._gcpJwtVerifier).verifyProof(pA, pB, pC, pubSignals)) revert InvalidProverProof();

        // Check if the root CA pubkey hash is valid
        if (pubSignals[0] != $._gcpRootCAPubkeyHash) revert InvalidProverRootCA();

        // Check if the TEE image hash is valid
        bytes memory imageHash = GCPJWTHelper.unpackAndConvertImageHash(pubSignals[5], pubSignals[6], pubSignals[7]);
        if (!IPCR0Manager($._pcr0Manager).isPCR0Set(imageHash)) revert InvalidProverImage();

        // The circuit always emits 4 nonce chunks; a 40-char address fills only 2. The nonce's
        // declared length is a circuit input, not a public signal, so asserting the trailing
        // chunks are empty is the only on-chain bound on what else the nonce carried.
        if (pubSignals[3] != 0 || pubSignals[4] != 0) revert InvalidProverNoncePadding();

        uint256 currentYear = 2000 + pubSignals[8] * 10 + pubSignals[9];
        uint256 currentMonth = pubSignals[10] * 10 + pubSignals[11];
        uint256 currentDay = pubSignals[12] * 10 + pubSignals[13];
        uint256 currentHour = pubSignals[14] * 10 + pubSignals[15];
        uint256 currentMinute = pubSignals[16] * 10 + pubSignals[17];
        uint256 currentSecond = pubSignals[18] * 10 + pubSignals[19];
        uint256 currentTimestamp = Formatter.toTimeStampWithSeconds(
            currentYear,
            currentMonth,
            currentDay,
            currentHour,
            currentMinute,
            currentSecond
        );

        if (currentTimestamp + 1 hours < block.timestamp) revert InvalidProverTimestamp(); //1 hour in the past
        if (currentTimestamp > block.timestamp + 1 hours) revert InvalidProverTimestamp(); //1 hour in the future

        // Unpack the address and register it
        address proverKey = GCPJWTHelper.unpackAndDecodeAddress(pubSignals[1], pubSignals[2]);
        if (proverKey == address(0)) revert InvalidProverAddress();
        $._isRegisteredProverKey[proverKey] = true;

        emit ProverKeyRegistered(proverKey);
    }

    /// @notice Revokes a registered prover key.
    /// @dev Not a permanent blacklist — re-registration would require a fresh valid attestation
    /// binding the same address, i.e. that key inside a measured enclave.
    /// @param proverKey The prover address to revoke.
    function revokeProverKey(address proverKey) external virtual onlyProxy onlyRole(SECURITY_ROLE) {
        _getProverStorage()._isRegisteredProverKey[proverKey] = false;
        emit ProverKeyRevoked(proverKey);
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

    /**
     * @notice Returns the prover GCP JWT verifier address.
     * @return The GCP JWT verifier address.
     */
    function proverGCPJWTVerifier() external view virtual onlyProxy returns (address) {
        return _getProverStorage()._gcpJwtVerifier;
    }

    /**
     * @notice Returns the prover PCR0 manager address.
     * @return The PCR0 manager address.
     */
    function proverPCR0Manager() external view virtual onlyProxy returns (address) {
        return _getProverStorage()._pcr0Manager;
    }

    /**
     * @notice Returns the prover GCP root CA pubkey hash.
     * @return The GCP root CA pubkey hash.
     */
    function proverGCPRootCAPubkeyHash() external view virtual onlyProxy returns (uint256) {
        return _getProverStorage()._gcpRootCAPubkeyHash;
    }

    /**
     * @notice Returns the prover TEE address.
     * @return The prover TEE address.
     */
    function proverTEE() external view virtual onlyProxy returns (address) {
        return _getProverStorage()._proverTee;
    }

    /**
     * @notice Returns whether a given address is a registered prover key.
     * @param proverKey The address to query.
     * @return True if the address is a registered prover key, false otherwise.
     */
    function isRegisteredProverKey(address proverKey) external view virtual onlyProxy returns (bool) {
        return _getProverStorage()._isRegisteredProverKey[proverKey];
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
        address registryAddress = $._registries[attestationId];

        RegisterProofVerifierLib.verifyRegisterProof(
            attestationId,
            registerCircuitVerifierId,
            registerCircuitProof,
            verifier,
            registryAddress,
            AADHAAR_REGISTRATION_WINDOW
        );
    }

    /**
     * @notice Verifies the passport DSC circuit proof.
     * @dev Uses the DSC circuit verifier specified by dscCircuitVerifierId.
     * @param attestationId The attestation ID.
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
        address registryAddress = $._registries[attestationId];

        DscProofVerifierLib.verifyDscProof(
            attestationId,
            dscCircuitVerifierId,
            dscCircuitProof,
            verifier,
            registryAddress
        );
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
        address registryAddress = $._registries[attestationId];

        RootCheckLib.performRootCheck(attestationId, vcAndDiscloseProof, indices, registryAddress);
    }

    /**
     * @notice Performs OFAC compliance verification
     * @dev Validates OFAC root and performs sanctions screening if required.
     */
    function _performOfacCheck(
        bytes32 attestationId,
        GenericProofStruct memory vcAndDiscloseProof,
        CircuitConstantsV2.DiscloseIndices memory indices
    ) internal view {
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        address registryAddress = $._registries[attestationId];

        OfacCheckLib.performOfacCheck(attestationId, vcAndDiscloseProof, indices, registryAddress);
    }

    /**
     * @notice Performs current date validation with format-aware parsing
     * @dev Handles three date formats:
     * - E_PASSPORT/EU_ID_CARD: 6 ASCII chars (YYMMDD)
     * - KYC: 8 ASCII digits (YYYYMMDD)
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
        } else if (attestationId == AttestationId.KYC) {
            // KYC: 8 ASCII digits (YYYYMMDD)
            uint256[3] memory dateNum; // [year, month, day]
            unchecked {
                for (uint256 i; i < 4; ++i)
                    dateNum[0] = dateNum[0] * 10 + vcAndDiscloseProof.pubSignals[startIndex + i];
                for (uint256 i = 4; i < 6; ++i)
                    dateNum[1] = dateNum[1] * 10 + vcAndDiscloseProof.pubSignals[startIndex + i];
                for (uint256 i = 6; i < 8; ++i)
                    dateNum[2] = dateNum[2] * 10 + vcAndDiscloseProof.pubSignals[startIndex + i];
            }
            currentTimestamp = Formatter.proofDateToUnixTimestampNumeric(dateNum);
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
     * @dev Verifies the zero-knowledge proof using the configured verifier contract.
     */
    function _performGroth16ProofVerification(
        bytes32 attestationId,
        GenericProofStruct memory vcAndDiscloseProof
    ) internal view {
        IdentityVerificationHubStorage storage $ = _getIdentityVerificationHubStorage();
        ProofVerifierLib.verifyGroth16Proof(attestationId, $._discloseVerifiers[attestationId], vcAndDiscloseProof);
    }

    /**
     * @notice Requires the signature to recover to a registered prover key.
     * @dev The digest mirrors the TEE prover byte-for-byte: keccak256(abi.encode(a, b, c, pubSignals))
     *      with pubSignals as a dynamic array, signed raw-prehash (no EIP-191 prefix, v in {27, 28}).
     */
    function _verifyProverSignature(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[] memory pubSignals,
        bytes calldata signature
    ) internal view {
        bytes32 digest = keccak256(abi.encode(a, b, c, pubSignals));
        (address signer, ECDSA.RecoverError err, ) = ECDSA.tryRecover(digest, signature);
        if (err != ECDSA.RecoverError.NoError || !_getProverStorage()._isRegisteredProverKey[signer]) {
            revert UnauthorizedProverSigner();
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
        if (baseVerificationInput.length < 162) {
            revert InputTooShort();
        }
        header.contractVersion = uint8(baseVerificationInput[0]);
        header.scope = uint256(bytes32(baseVerificationInput[32:64]));
        header.attestationId = bytes32(baseVerificationInput[64:96]);
        header.signature = bytes(baseVerificationInput[96:161]);
        proofData = baseVerificationInput[161:];
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
     * @dev Formats proof data into the appropriate output structure for the attestation type.
     * @param attestationId The attestation identifier (passport, EU ID card, Aadhaar, or KYC).
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
            return OutputFormatterLib.createPassportOutput(vcAndDiscloseProof, indices, attestationId, userIdentifier);
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            return OutputFormatterLib.createEuIdOutput(vcAndDiscloseProof, indices, attestationId, userIdentifier);
        } else if (attestationId == AttestationId.AADHAAR) {
            return OutputFormatterLib.createAadhaarOutput(vcAndDiscloseProof, indices, attestationId, userIdentifier);
        } else if (attestationId == AttestationId.KYC) {
            return OutputFormatterLib.createKycOutput(vcAndDiscloseProof, indices, attestationId, userIdentifier);
        } else {
            revert InvalidAttestationId();
        }
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
