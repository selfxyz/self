// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
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
 * - Changing address to address payable
 * - Changing bytes32 to bytes
 * - Changing array type to mapping
 * 
 * For more detailed information about forbidden changes, please refer to:
 * https://docs.openzeppelin.com/upgrades-plugins/writing-upgradeable#modifying-your-contracts
 * 
 * ⚠️ VIOLATION OF THESE RULES WILL CAUSE CATASTROPHIC STORAGE COLLISIONS IN FUTURE UPGRADES ⚠️
 * =============================================
 */
contract IdentityVerificationHubStorageV1{
    address internal registry;
    address internal vcAndDiscloseCircuitVerifier;

    mapping(uint256 => address) internal sigTypeToRegisterCircuitVerifiers;
    mapping(uint256 => address) internal sigTypeToDscCircuitVerifiers;
}

contract IdentityVerificationHubImplV1 is UUPSUpgradeable, OwnableUpgradeable, IdentityVerificationHubStorageV1, IIdentityVerificationHubV1 {

    ///////////////////////////////////////////////////////////////////////////////
    ///                   A NOTE ON IMPLEMENTATION CONTRACTS                    ///
    ///////////////////////////////////////////////////////////////////////////////

    // This contract is designed explicitly to operate from behind a proxy contract. As a result,
    // there are a few important implementation considerations:
    //
    // - All updates made after deploying a given version of the implementation should inherit from
    //   the latest version of the implementation. This prevents storage clashes.
    // - All functions that are less access-restricted than `private` should be marked `virtual` in
    //   order to enable the fixing of bugs in the existing interface.
    // - Any function that reads from or modifies state (i.e. is not marked `pure`) must be
    //   annotated with the `onlyProxy` and `onlyInitialized` modifiers. This ensures that it can
    //   only be called when it has access to the data in the proxy, otherwise results are likely to
    //   be nonsensical.
    // - This contract deals with important data for the WorldID system. Ensure that all newly-added
    //   functionality is carefully access controlled using `onlyOwner`, or a more granular access
    //   mechanism.
    // - Do not assign any contract-level variables at the definition site unless they are
    //   `constant`.
    //
    // Additionally, the following notes apply:
    //
    // - Initialisation and ownership management are not protected behind `onlyProxy` intentionally.
    //   This ensures that the contract can safely be disposed of after it is no longer used.
    // - Carefully consider what data recovery options are presented as new functionality is added.
    //   Care must be taken to ensure that a migration plan can exist for cases where upgrades
    //   cannot recover from an issue or vulnerability.


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
    error UNEQUAL_BLINDED_DSC_COMMITMENT();
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
    event RegisterCircuitVerifierUpdated(uint256 typeId, address verifier);
    event DscCircuitVerifierUpdated(uint256 typeId, address verifier);

    function initialize(
        address _registry, 
        address _vcAndDiscloseCircuitVerifier,
        uint256[] memory _registerCircuitVerifierIds,
        address[] memory _registerCircuitVerifiers, 
        uint256[] memory _dscCircuitVerifierIds,
        address[] memory _dscCircuitVerifiers
    ) external initializer {
        __Ownable_init(msg.sender);
        registry = _registry;
        vcAndDiscloseCircuitVerifier = _vcAndDiscloseCircuitVerifier;
        if (_registerCircuitVerifierIds.length != _registerCircuitVerifiers.length) {
            revert LENGTH_MISMATCH();
        }
        if (_dscCircuitVerifierIds.length != _dscCircuitVerifiers.length) {
            revert LENGTH_MISMATCH();
        }
        for (uint256 i = 0; i < _registerCircuitVerifierIds.length; i++) {
            sigTypeToRegisterCircuitVerifiers[_registerCircuitVerifierIds[i]] = _registerCircuitVerifiers[i];
        }
        for (uint256 i = 0; i < _dscCircuitVerifierIds.length; i++) {
            sigTypeToDscCircuitVerifiers[_dscCircuitVerifierIds[i]] = _dscCircuitVerifiers[i];
        }
    }

    function _authorizeUpgrade(
        address newImplementation
    ) 
        internal 
        override 
        onlyOwner
    {}

    ///////////////////////////////////////////////////////////////////
    ///                     UPDATE FUNCTIONS                        ///
    ///////////////////////////////////////////////////////////////////
    function updateRegistry(
        address _registry
    ) 
        external 
        onlyOwner 
    {
        registry = _registry;
    }

    function updateVcAndDiscloseCircuit(
        address _vcAndDiscloseCircuitVerifier
    ) 
        external 
        onlyOwner 
    {
        vcAndDiscloseCircuitVerifier = _vcAndDiscloseCircuitVerifier;
    }

    function updateRegisterCircuitVerifier(
        uint256 typeId, 
        address verifier
    ) 
        external 
        onlyOwner 
    {
        sigTypeToRegisterCircuitVerifiers[typeId] = verifier;
        emit RegisterCircuitVerifierUpdated(typeId, verifier);
    }

    function updateDscVerifier(
        uint256 typeId, 
        address verifier
    ) 
        external 
        onlyOwner 
    {
        sigTypeToDscCircuitVerifiers[typeId] = verifier;
        emit DscCircuitVerifierUpdated(typeId, verifier);
    }

    function batchUpdateRegisterCircuitVerifiers(
        uint256[] calldata typeIds,
        address[] calldata verifiers
    ) 
        external 
        onlyOwner 
    {
        if (typeIds.length != verifiers.length) {
            revert LENGTH_MISMATCH();
        }
        for (uint256 i = 0; i < typeIds.length; i++) {
            sigTypeToRegisterCircuitVerifiers[typeIds[i]] = verifiers[i];
            emit RegisterCircuitVerifierUpdated(typeIds[i], verifiers[i]);
        }
    }

    function batchUpdateDscCircuitVerifiers(
        uint256[] calldata typeIds,
        address[] calldata verifiers
    ) 
        external 
        onlyOwner 
    {
        if (typeIds.length != verifiers.length) {
            revert LENGTH_MISMATCH();
        }
        for (uint256 i = 0; i < typeIds.length; i++) {
            sigTypeToDscCircuitVerifiers[typeIds[i]] = verifiers[i];
            emit DscCircuitVerifierUpdated(typeIds[i], verifiers[i]);
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
        if (!IIdentityRegistryV1(registry).checkIdentityCommitmentRoot(bytes32(proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_MERKLE_ROOT_INDEX]))) {
            revert INVALID_IDENTITY_COMMITMENT_ROOT();
        }

        if (!IIdentityRegistryV1(registry).checkOfacRoot(bytes32(proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_SMT_ROOT_INDEX]))) {
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

        if (!IVcAndDiscloseCircuitVerifier(vcAndDiscloseCircuitVerifier).verifyProof(proof)) {
            revert INVALID_VC_AND_DISCLOSE_PROOF();
        }
    }

    function verifyVcAndDiscloseAttributes(
        VcAndDiscloseHubProof memory proof
    ) 
        internal
        view 
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
        returns (VcAndDiscloseVerificationMinimumResult memory)
    {
        verifyVcAndDiscloseCircuit(proof.vcAndDiscloseProof);
        verifyVcAndDiscloseAttributes(proof);

        VcAndDiscloseVerificationMinimumResult memory result;
        result.attestationId = bytes32(proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX]);
        result.scope = bytes32(proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_SCOPE_INDEX]);
        result.userIdentifier = bytes32(proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX]);
        result.nullifier = bytes32(proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_NULLIFIER_INDEX]);
        return result;
    }

    function verifyVcAndDiscloseAndGetFullResult(
        VcAndDiscloseHubProof memory proof
    )
        external
        view
        returns (VcAndDiscloseVerificationFullResult memory)
    {
        verifyVcAndDiscloseCircuit(proof.vcAndDiscloseProof);
        verifyVcAndDiscloseAttributes(proof);

        VcAndDiscloseVerificationFullResult memory result;
        result.attestationId = bytes32(proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX]);
        result.scope = bytes32(proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_SCOPE_INDEX]);
        result.userIdentifier = bytes32(proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX]);
        result.nullifier = bytes32(proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_NULLIFIER_INDEX]);
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
        address verifier = sigTypeToRegisterCircuitVerifiers[registerCircuitVerifierId];
        if (verifier == address(0)) {
            revert NO_VERIFIER_SET();
        }

        result = IRegisterCircuitVerifier(verifier).verifyProof(
            registerCircuitProof
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

        address verifier = sigTypeToDscCircuitVerifiers[dscCircuitVerifierId];
        if (verifier == address(0)) {
            revert NO_VERIFIER_SET();
        }

        if (!IIdentityRegistryV1(registry).checkCscaRoot(bytes32(dscCircuitProof.pubSignals[CircuitConstants.DSC_CSCA_ROOT_INDEX]))) {
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
            keccak256(abi.encodePacked(proof.registerCircuitProof.pubSignals[CircuitConstants.REGISTER_BLINDED_DSC_COMMITMENT_INDEX])) !=
            keccak256(abi.encodePacked(proof.dscCircuitProof.pubSignals[CircuitConstants.DSC_BLINDED_DSC_COMMITMENT_INDEX]))
        ) {
            revert UNEQUAL_BLINDED_DSC_COMMITMENT();
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
    {
        verifyPassport(proof);
        IIdentityRegistryV1(registry).registerCommitment(
            AttestationId.E_PASSPORT,
            bytes32(proof.registerCircuitProof.pubSignals[CircuitConstants.REGISTER_COMMITMENT_INDEX]),
            bytes32(proof.registerCircuitProof.pubSignals[CircuitConstants.REGISTER_NULLIFIER_INDEX])
        );
    }

}