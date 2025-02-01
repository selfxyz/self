// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "./constants/CircuitConstants.sol";
import "./constants/AttestationId.sol";
import "./libraries/Formatter.sol";
import "./libraries/CircuitAttributeHandler.sol";
import "./interfaces/IIdentityVerificationHubV1.sol";
import "./interfaces/IIdentityRegistryV1.sol";
import "./interfaces/IRegisterCircuitVerifier.sol";
import "./interfaces/IVcAndDiscloseCircuitVerifier.sol";
import "./interfaces/IDscCircuitVerifier.sol";
import "./upgradeable/ImplRoot.sol";

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
abstract contract IdentityVerificationHubStorageV1 is 
    ImplRoot 
{
    address internal _registry;
    address internal _vcAndDiscloseCircuitVerifier;

    mapping(uint256 => address) internal _sigTypeToRegisterCircuitVerifiers;
    mapping(uint256 => address) internal _sigTypeToDscCircuitVerifiers;
}

contract IdentityVerificationHubImplV1 is 
    IdentityVerificationHubStorageV1, 
    IIdentityVerificationHubV1 
{
    using Formatter for uint256;

    uint256 constant MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH = 10;

    // Events
    event HubInitialized(
        address registry, 
        address vcAndDiscloseCircuitVerifier,
        uint256[] registerCircuitVerifierIds,
        address[] registerCircuitVerifiers,
        uint256[] dscCircuitVerifierIds,
        address[] dscCircuitVerifiers
    );
    event RegistryUpdated(address registry);
    event VcAndDiscloseCircuitUpdated(address vcAndDiscloseCircuitVerifier);
    event RegisterCircuitVerifierUpdated(uint256 typeId, address verifier);
    event DscCircuitVerifierUpdated(uint256 typeId, address verifier);

    // Errors
    error LENGTH_MISMATCH();
    error NO_VERIFIER_SET();
    error VERIFIER_CALL_FAILED();
    error UNEQUAL_GLUE();
    error CURRENT_DATE_NOT_IN_VALID_RANGE();

    error INVALID_OLDER_THAN();
    error INVALID_FORBIDDEN_COUNTRIES();
    error INVALID_OFAC();

    error INVALID_REGISTER_PROOF();
    error INVALID_DSC_PROOF();
    error INVALID_VC_AND_DISCLOSE_PROOF();

    error INVALID_COMMITMENT_ROOT();
    error INVALID_OFAC_ROOT();
    error INVALID_CSCA_ROOT();

    // Constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address registryAddress, 
        address vcAndDiscloseCircuitVerifierAddress,
        uint256[] memory registerCircuitVerifierIds,
        address[] memory registerCircuitVerifierAddresses, 
        uint256[] memory dscCircuitVerifierIds,
        address[] memory dscCircuitVerifierAddresses
    ) external initializer {
        __ImplRoot_init();
        _registry = registryAddress;
        _vcAndDiscloseCircuitVerifier = vcAndDiscloseCircuitVerifierAddress;
        if (registerCircuitVerifierIds.length != registerCircuitVerifierAddresses.length) {
            revert LENGTH_MISMATCH();
        }
        if (dscCircuitVerifierIds.length != dscCircuitVerifierAddresses.length) {
            revert LENGTH_MISMATCH();
        }
        for (uint256 i = 0; i < registerCircuitVerifierIds.length; i++) {
            _sigTypeToRegisterCircuitVerifiers[registerCircuitVerifierIds[i]] = registerCircuitVerifierAddresses[i];
        }
        for (uint256 i = 0; i < dscCircuitVerifierIds.length; i++) {
            _sigTypeToDscCircuitVerifiers[dscCircuitVerifierIds[i]] = dscCircuitVerifierAddresses[i];
        }
        emit HubInitialized(
            registryAddress, 
            vcAndDiscloseCircuitVerifierAddress,
            registerCircuitVerifierIds,
            registerCircuitVerifierAddresses,
            dscCircuitVerifierIds,
            dscCircuitVerifierAddresses
        );
    }

    ///////////////////////////////////////////////////////////////////
    ///                     EXTERNAL FUNCTIONS                      ///
    ///////////////////////////////////////////////////////////////////

    // view
    // tested
    function registry() 
        external
        virtual
        onlyProxy
        view 
        returns (address) 
    {
        return _registry;
    }

    // tested
    function vcAndDiscloseCircuitVerifier() 
        external
        virtual
        onlyProxy
        view 
        returns (address) 
    {
        return _vcAndDiscloseCircuitVerifier;
    }

    // tested
    function sigTypeToRegisterCircuitVerifiers(
        uint256 typeId
    ) 
        external
        virtual
        onlyProxy
        view 
        returns (address) 
    {
        return _sigTypeToRegisterCircuitVerifiers[typeId];
    }

    // tested
    function sigTypeToDscCircuitVerifiers(
        uint256 typeId
    ) 
        external
        virtual
        onlyProxy
        view 
        returns (address) 
    {
        return _sigTypeToDscCircuitVerifiers[typeId];
    }

    // test in vc and disclose.ts
    function getReadableRevealedData(
        uint256[3] memory revealedDataPacked,
        RevealedDataType[] memory types
    )
        external
        view
        returns (ReadableRevealedData memory)
    {
        bytes memory charcodes = Formatter.fieldElementsToBytes(
            revealedDataPacked
        );

        ReadableRevealedData memory attrs;

        for (uint256 i = 0; i < types.length; i++) {
            RevealedDataType dataType = types[i];
            if (dataType == RevealedDataType.ISSUING_STATE) {
                attrs.issuingState = CircuitAttributeHandler.getIssuingState(charcodes);
            } else if (dataType == RevealedDataType.NAME) {
                attrs.name = CircuitAttributeHandler.getName(charcodes);
            } else if (dataType == RevealedDataType.PASSPORT_NUMBER) {
                attrs.passportNumber = CircuitAttributeHandler.getPassportNumber(charcodes);
            } else if (dataType == RevealedDataType.NATIONALITY) {
                attrs.nationality = CircuitAttributeHandler.getNationality(charcodes);
            } else if (dataType == RevealedDataType.DATE_OF_BIRTH) {
                attrs.dateOfBirth = CircuitAttributeHandler.getDateOfBirth(charcodes);
            } else if (dataType == RevealedDataType.GENDER) {
                attrs.gender = CircuitAttributeHandler.getGender(charcodes);
            } else if (dataType == RevealedDataType.EXPIRY_DATE) {
                attrs.expiryDate = CircuitAttributeHandler.getExpiryDate(charcodes);
            } else if (dataType == RevealedDataType.OLDER_THAN) {
                attrs.olderThan = CircuitAttributeHandler.getOlderThan(charcodes);
            } else if (dataType == RevealedDataType.OFAC) {
                attrs.ofac = CircuitAttributeHandler.getOfac(charcodes);
            }
        }

        return attrs;
    }

    // will test in vc and disclose.ts
    function getReadableForbiddenCountries(
        uint256 forbiddenCountriesListPacked
    )
        external
        view
        returns (string[MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH] memory)
    {
        return Formatter.extractForbiddenCountriesFromPacked(forbiddenCountriesListPacked);
    }

    // verify and view

    // will test in vc and disclose.ts
    // tested
    function verifyVcAndDisclose(
        VcAndDiscloseHubProof memory proof
    )
        external
        view
        onlyProxy
        returns (VcAndDiscloseVerificationResult memory)
    {
        VcAndDiscloseVerificationResult memory result;
        
        result.identityCommitmentRoot = verifyVcAndDiscloseProof(proof);

        for (uint256 i = 0; i < 3; i++) {
            result.revealedDataPacked[i] = proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_REVEALED_DATA_PACKED_INDEX + i];
        }
        result.forbiddenCountriesListPacked = proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX];
        result.nullifier = proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_NULLIFIER_INDEX];
        result.attestationId = proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX];
        result.userIdentifier = proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX];
        result.scope = proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_SCOPE_INDEX];
        return result;
    }

    // updates
    // tested
    function updateRegistry(
        address registryAddress
    ) 
        external 
        onlyProxy
        onlyOwner 
    {
        _registry = registryAddress;
        emit RegistryUpdated(registryAddress);
    }

    // tested
    function updateVcAndDiscloseCircuit(
        address vcAndDiscloseCircuitVerifierAddress
    ) 
        external 
        onlyProxy
        onlyOwner 
    {
        _vcAndDiscloseCircuitVerifier = vcAndDiscloseCircuitVerifierAddress;
        emit VcAndDiscloseCircuitUpdated(vcAndDiscloseCircuitVerifierAddress);
    }

    // tested
    function updateRegisterCircuitVerifier(
        uint256 typeId, 
        address verifierAddress
    ) 
        external 
        onlyProxy
        onlyOwner 
    {
        _sigTypeToRegisterCircuitVerifiers[typeId] = verifierAddress;
        emit RegisterCircuitVerifierUpdated(typeId, verifierAddress);
    }

    // tested
    function updateDscVerifier(
        uint256 typeId, 
        address verifierAddress
    ) 
        external 
        onlyProxy
        onlyOwner 
    {
        _sigTypeToDscCircuitVerifiers[typeId] = verifierAddress;
        emit DscCircuitVerifierUpdated(typeId, verifierAddress);
    }

    // tested
    function batchUpdateRegisterCircuitVerifiers(
        uint256[] calldata typeIds,
        address[] calldata verifierAddresses
    ) 
        external 
        onlyProxy
        onlyOwner 
    {
        if (typeIds.length != verifierAddresses.length) {
            revert LENGTH_MISMATCH();
        }
        for (uint256 i = 0; i < typeIds.length; i++) {
            _sigTypeToRegisterCircuitVerifiers[typeIds[i]] = verifierAddresses[i];
            emit RegisterCircuitVerifierUpdated(typeIds[i], verifierAddresses[i]);
        }
    }

    // tested
    function batchUpdateDscCircuitVerifiers(
        uint256[] calldata typeIds,
        address[] calldata verifierAddresses
    ) 
        external
        onlyProxy
        onlyOwner 
    {
        if (typeIds.length != verifierAddresses.length) {
            revert LENGTH_MISMATCH();
        }
        for (uint256 i = 0; i < typeIds.length; i++) {
            _sigTypeToDscCircuitVerifiers[typeIds[i]] = verifierAddresses[i];
            emit DscCircuitVerifierUpdated(typeIds[i], verifierAddresses[i]);
        }
    }

    // register
    // tested
    function registerPassportCommitment(
        uint256 registerCircuitVerifierId,
        IRegisterCircuitVerifier.RegisterCircuitProof memory registerCircuitProof
    ) 
        external
        onlyProxy
    {
        verifyPassportRegisterProof(registerCircuitVerifierId, registerCircuitProof);
        IIdentityRegistryV1(_registry).registerCommitment(
            AttestationId.E_PASSPORT,
            registerCircuitProof.pubSignals[CircuitConstants.REGISTER_NULLIFIER_INDEX],
            registerCircuitProof.pubSignals[CircuitConstants.REGISTER_COMMITMENT_INDEX]
        );
    }

    // will test in commitmentRegistration.ts
    // tested
    function registerDscKeyCommitment(
        uint256 dscCircuitVerifierId,
        IDscCircuitVerifier.DscCircuitProof memory dscCircuitProof
    )
        external
        onlyProxy
    {
        verifyPassportDscProof(dscCircuitVerifierId, dscCircuitProof);
        IIdentityRegistryV1(_registry).registerDscKeyCommitment(
            dscCircuitProof.pubSignals[CircuitConstants.DSC_TREE_LEAF_INDEX]
        );
    }

    ///////////////////////////////////////////////////////////////////
    ///                     INTERNAL FUNCTIONS                        ///
    ///////////////////////////////////////////////////////////////////

    // Functions for vc and disclose circuit
    function verifyVcAndDiscloseProof(
        VcAndDiscloseHubProof memory proof
    ) 
        internal
        view
        returns (uint256 identityCommitmentRoot)
    {
        // verify identity commitment root
        if (!IIdentityRegistryV1(_registry).checkIdentityCommitmentRoot(proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_MERKLE_ROOT_INDEX])) {
            revert INVALID_COMMITMENT_ROOT();
        }

        // verify ofac root
        if (!IIdentityRegistryV1(_registry).checkOfacRoot(proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_SMT_ROOT_INDEX])) {
            revert INVALID_OFAC_ROOT();
        }

        // verify current date
        uint[6] memory dateNum;
        for (uint256 i = 0; i < 6; i++) {
            dateNum[i] = proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_CURRENT_DATE_INDEX + i];
        }
        uint currentTimestamp = Formatter.proofDateToUnixTimestamp(dateNum);
        if(
            currentTimestamp < block.timestamp - 1 days ||
            currentTimestamp > block.timestamp + 1 days
        ) {
            revert CURRENT_DATE_NOT_IN_VALID_RANGE();
        }

        // verify attributes
        uint256[3] memory revealedDataPacked;
        for (uint256 i = 0; i < 3; i++) {
            revealedDataPacked[i] = proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_REVEALED_DATA_PACKED_INDEX + i];
        }
        if (proof.olderThanEnabled) {
            if (!CircuitAttributeHandler.compareOlderThan(Formatter.fieldElementsToBytes(revealedDataPacked), proof.olderThan)) {
                revert INVALID_OLDER_THAN();
            }
        }
        if (proof.ofacEnabled) {
            if (!CircuitAttributeHandler.compareOfac(Formatter.fieldElementsToBytes(revealedDataPacked))) {
                revert INVALID_OFAC();
            }
        }
        if (proof.forbiddenCountriesEnabled) {
            if (proof.forbiddenCountriesListPacked != proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX]) {
                revert INVALID_FORBIDDEN_COUNTRIES();
            }
        }

        // verify the proof
        if (!IVcAndDiscloseCircuitVerifier(_vcAndDiscloseCircuitVerifier).verifyProof(proof.vcAndDiscloseProof.a, proof.vcAndDiscloseProof.b, proof.vcAndDiscloseProof.c, proof.vcAndDiscloseProof.pubSignals)) {
            revert INVALID_VC_AND_DISCLOSE_PROOF();
        }

        return proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_MERKLE_ROOT_INDEX];
    }

    // Functions for register commitment
    function verifyPassportRegisterProof(
        uint256 registerCircuitVerifierId,
        IRegisterCircuitVerifier.RegisterCircuitProof memory registerCircuitProof
    ) 
        internal
        view
    {
        address verifier = _sigTypeToRegisterCircuitVerifiers[registerCircuitVerifierId];
        if (verifier == address(0)) {
            revert NO_VERIFIER_SET();
        }

        if (!IIdentityRegistryV1(_registry).checkDscKeyCommitmentMerkleRoot(registerCircuitProof.pubSignals[CircuitConstants.REGISTER_MERKLE_ROOT_INDEX])) {
            revert INVALID_COMMITMENT_ROOT();
        }

        if(!IRegisterCircuitVerifier(verifier).verifyProof(
            registerCircuitProof.a,
            registerCircuitProof.b,
            registerCircuitProof.c,
            registerCircuitProof.pubSignals
        )) {
            revert INVALID_REGISTER_PROOF();
        }
    }

    function verifyPassportDscProof(
        uint256 dscCircuitVerifierId,
        IDscCircuitVerifier.DscCircuitProof memory dscCircuitProof
    ) 
        internal
        view
    {

        address verifier = _sigTypeToDscCircuitVerifiers[dscCircuitVerifierId];
        if (verifier == address(0)) {
            revert NO_VERIFIER_SET();
        }

        if (!IIdentityRegistryV1(_registry).checkCscaRoot(dscCircuitProof.pubSignals[CircuitConstants.DSC_CSCA_ROOT_INDEX])) {
            revert INVALID_CSCA_ROOT();
        }

        if(!IDscCircuitVerifier(verifier).verifyProof(
            dscCircuitProof.a,
            dscCircuitProof.b,
            dscCircuitProof.c,
            dscCircuitProof.pubSignals
        )) {
            revert INVALID_DSC_PROOF();
        }
    }

}