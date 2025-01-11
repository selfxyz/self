// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../constants/OpenPassportConstants.sol";
import "../libraries/OpenPassportFormatter.sol";
import "../libraries/Dg1Disclosure.sol";
import "../libraries/OpenPassportAttributeHandler.sol";
import "../interfaces/IOpenPassportVerifierRouterV1.sol";
import "../interfaces/IOpenPassportPortalV1.sol";
import "../interfaces/IVcAndDiscloseCircuitVerifier.sol";
// This is the contract to implement external callable logics

// here I would implement
// - register function
// - verify inclusion
// - manage nullifiers <- need to consider the architecture of this

contract OpenPassportPortalV1 is UUPSUpgradeable, OwnableUpgradeable, IOpenPassportPortalV1 {

    IOpenPassportVerifierRouterV1 public verifierRouter;
    address public registry;
    IVcAndDiscloseCircuitVerifier public vcAndDiscloseCircuitVerifier;

    mapping(uint256 => bool) public nullifiers;

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

    error INVALID_SIGNATURE_TYPE();

    function initialize(address _verifierRouter, address _registry, address _vcAndDiscloseCircuitVerifier) external initializer {
        __Ownable_init(msg.sender);
        verifierRouter = _verifierRouter;
        registry = _registry;
        vcAndDiscloseCircuitVerifier = _vcAndDiscloseCircuitVerifier;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function updateVerifierRouter(address _verifierRouter) external onlyOwner {
        verifierRouter = _verifierRouter;
    }

    function updateRegistry(address _registry) external onlyOwner {
        registry = _registry;
    }

    function updateVcAndDiscloseCircuit(address _vcAndDiscloseCircuitVerifier) external onlyOwner {
        vcAndDiscloseCircuitVerifier = _vcAndDiscloseCircuitVerifier;
    }

    function verifyVcAndDiscloseCircuit(
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory proof
    ) external returns (bool) {
        return vcAndDiscloseCircuitVerifier.verifyProof(proof);
    }

    function verifyAndDiscloseAttributes(
        IOpenPassportVerifierRouterV1.OpenPassportProof memory proof,
        AttributeType[] memory attributeTypes
    ) public returns (PassportAttributes memory) {
        verifierRouter.verify(proof);
        uint[3] memory revealedData_packed;
        for (uint256 i = 0; i < 3; i++) {
            if (proof.signatureType == IGenericVerifier.SignatureType.RSA) {
                revealedData_packed[i] = proof.pubSignalsRSA[OpenPassportConstants.PROVE_RSA_REVEALED_DATA_PACKED_INDEX + i];
            } else if (proof.signatureType == IGenericVerifier.SignatureType.ECDSA) {
                revealedData_packed[i] = proof.pubSignalsECDSA[OpenPassportConstants.PROVE_ECDSA_REVEALED_DATA_PACKED_INDEX + i];
            } else {
                revert INVALID_SIGNATURE_TYPE();
            }
        }
        bytes memory charcodes = OpenPassportFormatter.fieldElementsToBytes(
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
                attrs.olderThan = OpenPassportAttributeHandler.extractOlderThan(attestation);
            } else if (attr == AttributeType.OFAC_RESULT) {
                attrs.ofacResult = OpenPassportAttributeHandler.extractOfacResult(attestation);
            } else if (attr == AttributeType.FORBIDDEN_COUNTRIES) {
                attrs.forbiddenCountries = OpenPassportAttributeHandler.extractForbiddenCountries(attestation);
            }
        }

        return attrs;
    }
}