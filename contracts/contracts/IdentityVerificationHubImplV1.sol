// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "./constants/CircuitConstants.sol";
import "./constants/AttestationId.sol";
import "./libraries/Formatter.sol";
import "./libraries/Dg1Disclosure.sol";
import "./libraries/CircuitAttributeHandler.sol";
import "./interfaces/IIdentityVerificationHubV1.sol";
import "./interfaces/IIdentityRegistryV1.sol";
import "./interfaces/IRegisterCircuitVerifier.sol";
import "./interfaces/IVcAndDiscloseCircuitVerifier.sol";
import "./interfaces/IDscCircuitVerifier.sol";
import "./proxy/ImplRoot.sol";

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

    enum Dg1AttributeType {
        ISSUING_STATE,
        NAME,
        PASSPORT_NUMBER,
        NATIONALITY,
        DATE_OF_BIRTH,
        GENDER,
        EXPIRY_DATE
    }

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

    error INVALID_IDENTITY_COMMITMENT_ROOT();
    error INVALID_OFAC_ROOT();
    error INVALID_CSCA_ROOT();

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
    ///                     VIEW FUNCTIONS                        ///
    ///////////////////////////////////////////////////////////////////

    function registry() 
        external
        virtual
        onlyProxy
        view 
        returns (address) 
    {
        return _registry;
    }

    function vcAndDiscloseCircuitVerifier() 
        external
        virtual
        onlyProxy
        view 
        returns (address) 
    {
        return _vcAndDiscloseCircuitVerifier;
    }

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

    ///////////////////////////////////////////////////////////////////
    ///                 UPDATE FUNCTIONS                        ///
    ///////////////////////////////////////////////////////////////////
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

    ///////////////////////////////////////////////////////////////////
    ///                     VERIFY FUNCTIONS                        ///
    ///////////////////////////////////////////////////////////////////

    // Functions for vc and disclose circuit
    function verifyVcAndDiscloseCircuit(
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory proof
    ) 
        internal
        view
    {
        if (!IIdentityRegistryV1(_registry).checkIdentityCommitmentRoot(proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_MERKLE_ROOT_INDEX])) {
            revert INVALID_IDENTITY_COMMITMENT_ROOT();
        }

        if (!IIdentityRegistryV1(_registry).checkOfacRoot(proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_SMT_ROOT_INDEX])) {
            revert INVALID_OFAC_ROOT();
        }

        uint[6] memory dateNum;
        dateNum[0] = proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_CURRENT_DATE_INDEX];
        uint currentTimestamp = Formatter.proofDateToUnixTimestamp(dateNum);
        if(
            currentTimestamp < block.timestamp - 1 days ||
            currentTimestamp > block.timestamp + 1 days
        ) {
            revert CURRENT_DATE_NOT_IN_VALID_RANGE();
        }

        if (!IVcAndDiscloseCircuitVerifier(_vcAndDiscloseCircuitVerifier).verifyProof(proof.pA, proof.pB, proof.pC, proof.pubSignals)) {
            revert INVALID_VC_AND_DISCLOSE_PROOF();
        }
    }

    function verifyVcAndDiscloseAttributes(
        VcAndDiscloseHubProof memory proof
    ) 
        internal
        pure
    {
        if (proof.olderThanEnabled) {
            if (!CircuitAttributeHandler.compareOlderThan(proof.olderThan, proof.vcAndDiscloseProof)) {
                revert INVALID_OLDER_THAN();
            }
        }

        if (proof.forbiddenCountriesEnabled) {
            if (!CircuitAttributeHandler.compareForbiddenCountries(proof.forbiddenCountriesList, proof.vcAndDiscloseProof)) {
                revert INVALID_FORBIDDEN_COUNTRIES();
            }
        }

        if (proof.ofacEnabled) {
            if (proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_OFAC_RESULT_INDEX] != 0) {
                revert INVALID_OFAC();
            }
        }
    }

    function verifyVcAndDiscloseAndGetMinimumResult(
        VcAndDiscloseHubProof memory proof
    ) 
        external
        view
        onlyProxy
        returns (VcAndDiscloseVerificationMinimumResult memory)
    {
        verifyVcAndDiscloseCircuit(proof.vcAndDiscloseProof);
        verifyVcAndDiscloseAttributes(proof);

        VcAndDiscloseVerificationMinimumResult memory result;
        result.attestationId = proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX];
        result.scope = proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_SCOPE_INDEX];
        result.userIdentifier = proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX];
        result.nullifier = proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_NULLIFIER_INDEX];
        return result;
    }

    function verifyVcAndDiscloseAndGetFullResult(
        VcAndDiscloseHubProof memory proof
    )
        external
        view
        onlyProxy
        returns (VcAndDiscloseVerificationFullResult memory)
    {
        verifyVcAndDiscloseCircuit(proof.vcAndDiscloseProof);
        verifyVcAndDiscloseAttributes(proof);

        VcAndDiscloseVerificationFullResult memory result;
        result.attestationId = proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX];
        result.scope = proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_SCOPE_INDEX];
        result.userIdentifier = proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX];
        result.nullifier = proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_NULLIFIER_INDEX];
        for (uint256 i = 0; i < 3; i++) {
            result.revealedDataPacked[i] = proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_REVEALED_DATA_PACKED_INDEX + i];
        }
        result.olderThan = proof.olderThan;
        for (uint256 i = 0; i < 2; i++) {
            result.forbiddenCountriesList[i] = proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_DISCLOSED_INDEX + i];
        }
        result.ofacResult = proof.ofacEnabled;
        return result;
    }

    function getReadableDg1Attributes(
        uint256[3] memory revealedDataPacked,
        Dg1AttributeType[] memory attributeTypes
    )
        public
        view
        onlyProxy
        returns (Dg1Attributes memory) 
    {   
        
        bytes memory charcodes = Formatter.fieldElementsToBytes(
            revealedDataPacked
        );

        Dg1Attributes memory attrs;

        for (uint256 i = 0; i < attributeTypes.length; i++) {
            Dg1AttributeType attr = attributeTypes[i];
            if (attr == Dg1AttributeType.ISSUING_STATE) {
                attrs.issuingState = Dg1Disclosure.getIssuingState(charcodes);
            } else if (attr == Dg1AttributeType.NAME) {
                attrs.name = Dg1Disclosure.getName(charcodes);
            } else if (attr == Dg1AttributeType.PASSPORT_NUMBER) {
                attrs.passportNumber = Dg1Disclosure.getPassportNumber(charcodes);
            } else if (attr == Dg1AttributeType.NATIONALITY) {
                attrs.nationality = Dg1Disclosure.getNationality(charcodes);
            } else if (attr == Dg1AttributeType.DATE_OF_BIRTH) {
                attrs.dateOfBirth = Dg1Disclosure.getDateOfBirth(charcodes);
            } else if (attr == Dg1AttributeType.GENDER) {
                attrs.gender = Dg1Disclosure.getGender(charcodes);
            } else if (attr == Dg1AttributeType.EXPIRY_DATE) {
                attrs.expiryDate = Dg1Disclosure.getExpiryDate(charcodes);
            }
        }

        return attrs;
    }


    // Functions for register commitment
    function verifyPassportRegisterCircuit(
        uint256 registerCircuitVerifierId,
        IRegisterCircuitVerifier.RegisterCircuitProof memory registerCircuitProof
    ) 
        internal
        view
        returns (bool result) 
    {
        address verifier = _sigTypeToRegisterCircuitVerifiers[registerCircuitVerifierId];
        if (verifier == address(0)) {
            revert NO_VERIFIER_SET();
        }

        result = IRegisterCircuitVerifier(verifier).verifyProof(
            registerCircuitProof.a,
            registerCircuitProof.b,
            registerCircuitProof.c,
            registerCircuitProof.pubSignals
        );
        return result;
    }

    function verifyPassportDscCircuit(
        uint256 dscCircuitVerifierId,
        IDscCircuitVerifier.DscCircuitProof memory dscCircuitProof
    ) 
        internal
        view
        returns (bool result) 
    {

        address verifier = _sigTypeToDscCircuitVerifiers[dscCircuitVerifierId];
        if (verifier == address(0)) {
            revert NO_VERIFIER_SET();
        }

        if (!IIdentityRegistryV1(_registry).checkCscaRoot(dscCircuitProof.pubSignals[CircuitConstants.DSC_CSCA_ROOT_INDEX])) {
            revert INVALID_CSCA_ROOT();
        }

        result = IDscCircuitVerifier(verifier).verifyProof(
            dscCircuitProof.a,
            dscCircuitProof.b,
            dscCircuitProof.c,
            dscCircuitProof.pubSignals
        );
        return result;
    }

    function verifyPassport(
        PassportProof memory proof
    )
        internal
        view
    {
        if (
            keccak256(abi.encodePacked(proof.registerCircuitProof.pubSignals[CircuitConstants.REGISTER_GLUE_INDEX])) !=
            keccak256(abi.encodePacked(proof.dscCircuitProof.pubSignals[CircuitConstants.DSC_GLUE_INDEX]))
        ) {
            revert UNEQUAL_GLUE();
        }

        if (!verifyPassportRegisterCircuit(proof.registerCircuitVerifierId, proof.registerCircuitProof)) {
            revert INVALID_REGISTER_PROOF();
        }

        if (!verifyPassportDscCircuit(proof.dscCircuitVerifierId, proof.dscCircuitProof)) {
            revert INVALID_DSC_PROOF();
        }
    }

    function verifyAndRegisterPassportCommitment(
        PassportProof memory proof
    ) 
        external
        onlyProxy
    {
        verifyPassport(proof);
        IIdentityRegistryV1(_registry).registerCommitment(
            AttestationId.E_PASSPORT,
            proof.registerCircuitProof.pubSignals[CircuitConstants.REGISTER_NULLIFIER_INDEX],
            proof.registerCircuitProof.pubSignals[CircuitConstants.REGISTER_COMMITMENT_INDEX]
        );
    }

}