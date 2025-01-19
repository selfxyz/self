// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./constants/CircuitConstants.sol";
import "./libraries/Formatter.sol";
import "./libraries/Dg1Disclosure.sol";
import "./libraries/CircuitAttributeHandler.sol";
import "./interfaces/IIdentityVerificationHubV1.sol";
import "./interfaces/IIdentityCommitmentRegistryV1.sol";
import "./interfaces/IProveCircuitVerifier.sol";
import "./interfaces/IVcAndDiscloseCircuitVerifier.sol";
import "./interfaces/IDscCircuitVerifier.sol";
// This is the contract to implement external callable logics

// here I would implement
// - register function
// - verify inclusion
// - manage nullifiers <- need to consider the architecture of this

contract IdentityVerificationHubImplV1 is UUPSUpgradeable, OwnableUpgradeable, IIdentityVerificationHubV1 {

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

    IIdentityCommitmentRegistryV1 public registry;
    IVcAndDiscloseCircuitVerifier public vcAndDiscloseCircuitVerifier;

    mapping(uint256 => address) public signatureTypeToProveVerifiers;
    mapping(uint256 => address) public signatureTypeToDscVerifiers;

    enum AttributeType {
        ISSUING_STATE,
        NAME,
        PASSPORT_NUMBER,
        NATIONALITY,
        DATE_OF_BIRTH,
        GENDER,
        EXPIRY_DATE,
        OLDER_THAN,
        OFAC_RESULT,
        FORBIDDEN_COUNTRIES
    }

    error LENGTH_MISMATCH();
    error NO_VERIFIER_SET();
    error VERIFIER_CALL_FAILED();
    error INVALID_SIGNATURE_TYPE();
    error UNEQUAL_BLINDED_DSC_COMMITMENT();
    error CURRENT_DATE_NOT_IN_VALID_RANGE();
    error INVALID_PROVE_PROOF();
    error INVALID_DSC_PROOF();
    error INVALID_MERKLE_ROOT();
    event ProveVerifierUpdated(uint256 typeId, address verifier);
    event DscVerifierUpdated(uint256 typeId, address verifier);

    function initialize(
        address _registry, 
        address _vcAndDiscloseCircuitVerifier
    ) external initializer {
        __Ownable_init(msg.sender);
        registry = IIdentityCommitmentRegistryV1(_registry);
        vcAndDiscloseCircuitVerifier = IVcAndDiscloseCircuitVerifier(_vcAndDiscloseCircuitVerifier);
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
        registry = IIdentityCommitmentRegistryV1(_registry);
    }

    function updateVcAndDiscloseCircuit(
        address _vcAndDiscloseCircuitVerifier
    ) 
        external 
        onlyOwner 
    {
        vcAndDiscloseCircuitVerifier = IVcAndDiscloseCircuitVerifier(_vcAndDiscloseCircuitVerifier);
    }

    function updateProveVerifier(
        uint256 typeId, 
        address verifier
    ) 
        external 
        onlyOwner 
    {
        signatureTypeToProveVerifiers[typeId] = verifier;
        emit ProveVerifierUpdated(typeId, verifier);
    }

    function updateDscVerifier(
        uint256 typeId, 
        address verifier
    ) 
        external 
        onlyOwner 
    {
        signatureTypeToDscVerifiers[typeId] = verifier;
        emit DscVerifierUpdated(typeId, verifier);
    }

    function batchUpdateProveVerifiers(
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
            signatureTypeToProveVerifiers[typeIds[i]] = verifiers[i];
            emit ProveVerifierUpdated(typeIds[i], verifiers[i]);
        }
    }

    function batchUpdateDscVerifiers(
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
            signatureTypeToDscVerifiers[typeIds[i]] = verifiers[i];
            emit DscVerifierUpdated(typeIds[i], verifiers[i]);
        }
    }

    ///////////////////////////////////////////////////////////////////
    ///                     VERIFY FUNCTIONS                        ///
    ///////////////////////////////////////////////////////////////////

    function verifyVcAndDiscloseCircuit(
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory proof
    ) 
        external 
        view
        returns (bool) 
    {
        if (!registry.checkRoot(proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_MERKLE_ROOT_INDEX])) {
            revert INVALID_MERKLE_ROOT();
        }

        // TODO: add smt root verification

        uint[6] memory dateNum;
        dateNum[0] = proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_CURRENT_DATE_INDEX];
        uint currentTimestamp = Formatter.proofDateToUnixTimestamp(dateNum);

        // Check that the current date is within a +/- 1 day range
        if(
            currentTimestamp < block.timestamp - 1 days ||
            currentTimestamp > block.timestamp + 1 days
        ) {
            revert CURRENT_DATE_NOT_IN_VALID_RANGE();
        }

        return vcAndDiscloseCircuitVerifier.verifyProof(proof);
    }

    function verifyProveCircuit(
        uint256 proveVerifierId,
        ProveCircuitProof memory proveCircuitProof
    ) 
        public 
        view 
        returns (bool result) 
    {
        address verifier = signatureTypeToProveVerifiers[proveVerifierId];
        if (verifier == address(0)) {
            revert NO_VERIFIER_SET();
        }
        if (proveCircuitProof.signatureType == SignatureType.RSA) {
            result = IRSAProveVerifier(verifier).verifyProof(
                proveCircuitProof.a,
                proveCircuitProof.b,
                proveCircuitProof.c,
                proveCircuitProof.pubSignalsRSA
            );
        } else if (proveCircuitProof.signatureType == SignatureType.ECDSA) {
            result = IECDSAProveVerifier(verifier).verifyProof(
                proveCircuitProof.a,
                proveCircuitProof.b,
                proveCircuitProof.c,
                proveCircuitProof.pubSignalsECDSA
            );
        } else {
            revert INVALID_SIGNATURE_TYPE();
        }
        return result;
    }

    function verifyDscCircuit(
        uint256 dscVerifierId,
        IDscCircuitVerifier.DscCircuitProof memory dscCircuitProof
    ) 
        public 
        view 
        returns (bool result) 
    {
        address verifier = signatureTypeToDscVerifiers[dscVerifierId];
        if (verifier == address(0)) {
            revert NO_VERIFIER_SET();
        }
        result = IDscCircuitVerifier(verifier).verifyProof(
            dscCircuitProof.a,
            dscCircuitProof.b,
            dscCircuitProof.c,
            dscCircuitProof.pubSignals
        );
        return result;
    }

    function verify(
        PassportProof memory proof
    )
        public
        view
        returns (ProveCircuitProof memory)
    {
        uint[6] memory dateNum;
        if (proof.proveCircuitProof.signatureType == SignatureType.RSA) {
            for (uint i = 0; i < 6; i++) {
                dateNum[i] = proof.proveCircuitProof.pubSignalsRSA[CircuitConstants.PROVE_RSA_CURRENT_DATE_INDEX + i];
            }
        } else if (proof.proveCircuitProof.signatureType == SignatureType.ECDSA) {
            for (uint i = 0; i < 6; i++) {
                dateNum[i] = proof.proveCircuitProof.pubSignalsECDSA[CircuitConstants.PROVE_ECDSA_CURRENT_DATE_INDEX + i];
            }
        }
        uint currentTimestamp = Formatter.proofDateToUnixTimestamp(dateNum);

        // Check that the current date is within a +/- 1 day range
        if(
            currentTimestamp < block.timestamp - 1 days ||
            currentTimestamp > block.timestamp + 1 days
        ) {
            revert CURRENT_DATE_NOT_IN_VALID_RANGE();
        }

        // check blinded dcs
        bytes memory blindedDscCommitment;
        if (proof.proveCircuitProof.signatureType == SignatureType.RSA) {
            blindedDscCommitment = abi.encodePacked(proof.proveCircuitProof.pubSignalsRSA[CircuitConstants.PROVE_RSA_BLINDED_DSC_COMMITMENT_INDEX]);
        } else if (proof.proveCircuitProof.signatureType == SignatureType.ECDSA) {
            blindedDscCommitment = abi.encodePacked(proof.proveCircuitProof.pubSignalsECDSA[CircuitConstants.PROVE_ECDSA_BLINDED_DSC_COMMITMENT_INDEX]);
        }

        if (
            keccak256(blindedDscCommitment) !=
            keccak256(abi.encodePacked(proof.dscCircuitProof.pubSignals[CircuitConstants.DSC_BLINDED_DSC_COMMITMENT_INDEX]))
        ) {
            revert UNEQUAL_BLINDED_DSC_COMMITMENT();
        }

        if (!verifyProveCircuit(proof.proveVerifierId, proof.proveCircuitProof)) {
            revert INVALID_PROVE_PROOF();
        }

        if (!verifyDscCircuit(proof.dscVerifierId, proof.dscCircuitProof)) {
            revert INVALID_DSC_PROOF();
        }

        return proof.proveCircuitProof;
    }

    function verifyAndRegisterCommitment(
        PassportProof memory proof
    ) 
        external 
    {
        verify(proof);
        if (proof.proveCircuitProof.signatureType == SignatureType.RSA) {  
            registry.registerCommitment(proof.proveCircuitProof.pubSignalsRSA[CircuitConstants.PROVE_RSA_COMMITMENT_INDEX]);
        } else if (proof.proveCircuitProof.signatureType == SignatureType.ECDSA) {
            registry.registerCommitment(proof.proveCircuitProof.pubSignalsECDSA[CircuitConstants.PROVE_ECDSA_COMMITMENT_INDEX]);
        } else {
            revert INVALID_SIGNATURE_TYPE();
        }
    }

    function verifyAndDiscloseAttributes(
        PassportProof memory proof,
        AttributeType[] memory attributeTypes
    )
        public
        view
        returns (PassportAttributes memory) 
    {
        verify(proof);
        uint[3] memory revealedData_packed;
        for (uint256 i = 0; i < 3; i++) {
            if (proof.proveCircuitProof.signatureType == SignatureType.RSA) {
                revealedData_packed[i] = proof.proveCircuitProof.pubSignalsRSA[CircuitConstants.PROVE_RSA_REVEALED_DATA_PACKED_INDEX + i];
            } else if (proof.proveCircuitProof.signatureType == SignatureType.ECDSA) {
                revealedData_packed[i] = proof.proveCircuitProof.pubSignalsECDSA[CircuitConstants.PROVE_ECDSA_REVEALED_DATA_PACKED_INDEX + i];
            } else {
                revert INVALID_SIGNATURE_TYPE();
            }
        }
        bytes memory charcodes = Formatter.fieldElementsToBytes(
            revealedData_packed
        );

        PassportAttributes memory attrs;

        for (uint256 i = 0; i < attributeTypes.length; i++) {
            AttributeType attr = attributeTypes[i];
            
            if (attr == AttributeType.ISSUING_STATE) {
                attrs.issuingState = Dg1Disclosure.getIssuingState(charcodes);
            } else if (attr == AttributeType.NAME) {
                attrs.name = Dg1Disclosure.getName(charcodes);
            } else if (attr == AttributeType.PASSPORT_NUMBER) {
                attrs.passportNumber = Dg1Disclosure.getPassportNumber(charcodes);
            } else if (attr == AttributeType.NATIONALITY) {
                attrs.nationality = Dg1Disclosure.getNationality(charcodes);
            } else if (attr == AttributeType.DATE_OF_BIRTH) {
                attrs.dateOfBirth = Dg1Disclosure.getDateOfBirth(charcodes);
            } else if (attr == AttributeType.GENDER) {
                attrs.gender = Dg1Disclosure.getGender(charcodes);
            } else if (attr == AttributeType.EXPIRY_DATE) {
                attrs.expiryDate = Dg1Disclosure.getExpiryDate(charcodes);
            } else if (attr == AttributeType.OLDER_THAN) {
                attrs.olderThan = CircuitAttributeHandler.extractOlderThan(proof.proveCircuitProof);
            } else if (attr == AttributeType.OFAC_RESULT) {
                attrs.ofacResult = CircuitAttributeHandler.extractOfacResult(proof.proveCircuitProof);
            } else if (attr == AttributeType.FORBIDDEN_COUNTRIES) {
                attrs.forbiddenCountries = CircuitAttributeHandler.extractForbiddenCountries(proof.proveCircuitProof);
            }
        }

        return attrs;
    }
}