// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {IGenericVerifier} from "./interfaces/IGenericVerifier.sol";
import {IOpenPassportVerifier} from "./interfaces/IOpenPassportVerifier.sol";
import "./constants/Constants.sol";
import "./libraries/Formatter.sol";
import "./libraries/Dg1Disclosure.sol";
import "./libraries/OpenPassportAttributeSelector.sol";

contract OpenPassportVerifier is IOpenPassportVerifier {

    IGenericVerifier public genericVerifier;

    constructor (address _genericVerifier) {
        genericVerifier = IGenericVerifier(_genericVerifier);
    }

    function discloseIssuingState(
        uint256 proveVerifierId,
        uint256 dscVerifierId,
        IGenericVerifier.ProveCircuitProof memory pProof,
        IGenericVerifier.DscCircuitProof memory dProof
    ) public returns (string memory) {
        uint256 selector = OpenPassportAttributeSelector.ISSUING_STATE_SELECTOR;

        PassportAttributes memory attrs = verifyAndDiscloseAttributes(
            proveVerifierId,
            dscVerifierId,
            pProof,
            dProof,
            selector
        );

        return attrs.issuingState;
    }

    function discloseName(
        uint256 proveVerifierId,
        uint256 dscVerifierId,
        IGenericVerifier.ProveCircuitProof memory pProof,
        IGenericVerifier.DscCircuitProof memory dProof
    ) public returns (string memory) {
        uint256 selector = OpenPassportAttributeSelector.NAME_SELECTOR;

        PassportAttributes memory attrs = verifyAndDiscloseAttributes(
            proveVerifierId,
            dscVerifierId,
            pProof,
            dProof,
            selector
        );

        return attrs.name;
    }

    function disclosePassportNumber(
        uint256 proveVerifierId,
        uint256 dscVerifierId,
        IGenericVerifier.ProveCircuitProof memory pProof,
        IGenericVerifier.DscCircuitProof memory dProof
    ) public returns (string memory) {
        uint256 selector = OpenPassportAttributeSelector.PASSPORT_NUMBER_SELECTOR;

        PassportAttributes memory attrs = verifyAndDiscloseAttributes(
            proveVerifierId,
            dscVerifierId,
            pProof,
            dProof,
            selector
        );

        return attrs.passportNumber;
    }   

    function discloseNationality(
        uint256 proveVerifierId,
        uint256 dscVerifierId,
        IGenericVerifier.ProveCircuitProof memory pProof,
        IGenericVerifier.DscCircuitProof memory dProof
    ) public returns (string memory) {
        uint256 selector = OpenPassportAttributeSelector.NATIONALITY_SELECTOR;

        PassportAttributes memory attrs = verifyAndDiscloseAttributes(
            proveVerifierId,
            dscVerifierId,
            pProof,
            dProof,
            selector
        );

        return attrs.nationality;
    }

    function discloseDateOfBirth(
        uint256 proveVerifierId,
        uint256 dscVerifierId,
        IGenericVerifier.ProveCircuitProof memory pProof,
        IGenericVerifier.DscCircuitProof memory dProof
    ) public returns (string memory) {
        uint256 selector = OpenPassportAttributeSelector.DATE_OF_BIRTH_SELECTOR;

        PassportAttributes memory attrs = verifyAndDiscloseAttributes(
            proveVerifierId,
            dscVerifierId,
            pProof,
            dProof,
            selector
        );

        return attrs.dateOfBirth;
    }

    function discloseGender(
        uint256 proveVerifierId,
        uint256 dscVerifierId,
        IGenericVerifier.ProveCircuitProof memory pProof,
        IGenericVerifier.DscCircuitProof memory dProof
    ) public returns (string memory) {
        uint256 selector = OpenPassportAttributeSelector.GENDER_SELECTOR;

        PassportAttributes memory attrs = verifyAndDiscloseAttributes(
            proveVerifierId,
            dscVerifierId,
            pProof,
            dProof,
            selector
        );

        return attrs.gender;
    }

    function discloseExpiryDate(
        uint256 proveVerifierId,
        uint256 dscVerifierId,
        IGenericVerifier.ProveCircuitProof memory pProof,
        IGenericVerifier.DscCircuitProof memory dProof
    ) public returns (string memory) {
        uint256 selector = OpenPassportAttributeSelector.EXPIRY_DATE_SELECTOR;

        PassportAttributes memory attrs = verifyAndDiscloseAttributes(
            proveVerifierId,
            dscVerifierId,
            pProof,
            dProof,
            selector
        );
        
        return attrs.expiryDate;
    }

    function discloseOlderThan(
        uint256 proveVerifierId,
        uint256 dscVerifierId,
        IGenericVerifier.ProveCircuitProof memory pProof,
        IGenericVerifier.DscCircuitProof memory dProof
    ) public returns (uint256) {
        uint256 selector = OpenPassportAttributeSelector.OLDER_THAN_SELECTOR;

        PassportAttributes memory attrs = verifyAndDiscloseAttributes(
            proveVerifierId,
            dscVerifierId,
            pProof,
            dProof,
            selector
        );

        return attrs.olderThan;
    }

    function discloseOfacResult(
        uint256 proveVerifierId,
        uint256 dscVerifierId,
        IGenericVerifier.ProveCircuitProof memory pProof,
        IGenericVerifier.DscCircuitProof memory dProof
    ) public returns (bool) {
        uint256 selector = OpenPassportAttributeSelector.OFAC_RESULT_SELECTOR;

        PassportAttributes memory attrs = verifyAndDiscloseAttributes(
            proveVerifierId,
            dscVerifierId,
            pProof,
            dProof,
            selector
        );

        return attrs.ofacResult;
    }

    function discloseForbiddenCountries(
        uint256 proveVerifierId,
        uint256 dscVerifierId,
        IGenericVerifier.ProveCircuitProof memory pProof,
        IGenericVerifier.DscCircuitProof memory dProof
    ) public returns (bytes3[OpenPassportFormatter.FORBIDDEN_COUNTRIES_LIST_LENGTH] memory) {
        uint256 selector = OpenPassportAttributeSelector.FORBIDDEN_COUNTRIES_SELECTOR;

        PassportAttributes memory attrs = verifyAndDiscloseAttributes(
            proveVerifierId,
            dscVerifierId,
            pProof,
            dProof,
            selector
        );

        return attrs.forbiddenCountries;
    }

    function verifyAndDiscloseAttributes(
        uint256 proveVerifierId,
        uint256 dscVerifierId,
        IGenericVerifier.ProveCircuitProof memory pProof,
        IGenericVerifier.DscCircuitProof memory dProof,
        uint256 attributeSelector
    ) public returns (PassportAttributes memory) {
        verify(proveVerifierId, dscVerifierId, pProof, dProof);
        uint[3] memory revealedData_packed;
        for (uint256 i = 0; i < 3; i++) {
            if (pProof.signatureType == IGenericVerifier.SignatureType.RSA) {
                revealedData_packed[i] = pProof.pubSignalsRSA[PROVE_RSA_REVEALED_DATA_PACKED_INDEX + i];
            } else if (pProof.signatureType == IGenericVerifier.SignatureType.ECDSA) {
                revealedData_packed[i] = pProof.pubSignalsECDSA[PROVE_ECDSA_REVEALED_DATA_PACKED_INDEX + i];
            } else {
                revert INVALID_SIGNATURE_TYPE();
            }
        }
        bytes memory charcodes = OpenPassportFormatter.fieldElementsToBytes(
            revealedData_packed
        );

        PassportAttributes memory attrs;

        if ((attributeSelector & OpenPassportAttributeSelector.ISSUING_STATE_SELECTOR) != 0) {
            attrs.issuingState = Dg1Disclosure.getIssuingState(charcodes);
        }

        if ((attributeSelector & OpenPassportAttributeSelector.NAME_SELECTOR) != 0) {
            attrs.name = Dg1Disclosure.getName(charcodes);
        }

        if ((attributeSelector & OpenPassportAttributeSelector.PASSPORT_NUMBER_SELECTOR) != 0) {
            attrs.passportNumber = Dg1Disclosure.getPassportNumber(charcodes);
        }

        if ((attributeSelector & OpenPassportAttributeSelector.NATIONALITY_SELECTOR) != 0) {
            attrs.nationality = Dg1Disclosure.getNationality(charcodes);
        }

        if ((attributeSelector & OpenPassportAttributeSelector.DATE_OF_BIRTH_SELECTOR) != 0) {
            attrs.dateOfBirth = Dg1Disclosure.getDateOfBirth(charcodes);
        }

        if ((attributeSelector & OpenPassportAttributeSelector.GENDER_SELECTOR) != 0) {
            attrs.gender = Dg1Disclosure.getGender(charcodes);
        }

        if ((attributeSelector & OpenPassportAttributeSelector.EXPIRY_DATE_SELECTOR) != 0) {
            attrs.expiryDate = Dg1Disclosure.getExpiryDate(charcodes);
        }
 
        if ((attributeSelector & OpenPassportAttributeSelector.OLDER_THAN_SELECTOR) != 0) {
            if (pProof.signatureType == IGenericVerifier.SignatureType.RSA) {
                attrs.olderThan =
                    OpenPassportFormatter.numAsciiToUint(pProof.pubSignalsRSA[PROVE_RSA_OLDER_THAN_INDEX])*10
                        + OpenPassportFormatter.numAsciiToUint(pProof.pubSignalsRSA[PROVE_RSA_OLDER_THAN_INDEX + 1]);
            } else if (pProof.signatureType == IGenericVerifier.SignatureType.ECDSA) {
                attrs.olderThan =
                    OpenPassportFormatter.numAsciiToUint(pProof.pubSignalsECDSA[PROVE_ECDSA_OLDER_THAN_INDEX])*10
                        + OpenPassportFormatter.numAsciiToUint(pProof.pubSignalsECDSA[PROVE_ECDSA_OLDER_THAN_INDEX + 1]);
            } else {
                revert INVALID_SIGNATURE_TYPE();
            }
        }

        if ((attributeSelector & OpenPassportAttributeSelector.OFAC_RESULT_SELECTOR) != 0) {
            if (pProof.signatureType == IGenericVerifier.SignatureType.RSA) {
                attrs.ofacResult = (pProof.publicSignalsRSA[PROVE_RSA_OFAC_RESULT_INDEX] != 0);
            } else if (pProof.signatureType == IGenericVerifier.SignatureType.ECDSA) {
                attrs.ofacResult = (pProof.publicSignalsECDSA[PROVE_ECDSA_OFAC_RESULT_INDEX] != 0);
            } else {
                revert INVALID_SIGNATURE_TYPE();
            }
        }

        if ((attribute_selector & AttributeSelector.FORBIDDEN_COUNTRIES_SELECTOR) != 0) {
            if (pProof.signatureType == IGenericVerifier.SignatureType.RSA) {
                attrs.forbiddenCountries
                    = OpenPassportFormatter.extractForbiddenCountriesFromPacked(
                        pProof.publicSignalsRSA[PROVE_RSA_FORBIDDEN_COUNTRIES_INDEX],
                        pProof.pubSignalsRSA[PROVE_RSA_FORBIDDEN_COUNTRIES_INDEX + 1]
                    );
            } else if (pProof.signatureType == IGenericVerifier.SignatureType.ECDSA) {
                attrs.forbiddenCountries
                    = OpenPassportFormatter.extractForbiddenCountriesFromPacked(
                        pProof.publicSignalsECDSA[PROVE_ECDSA_FORBIDDEN_COUNTRIES_INDEX],
                        pProof.pubSignalsECDSA[PROVE_ECDSA_FORBIDDEN_COUNTRIES_INDEX + 1]
                    );
            } else {
                revert INVALID_SIGNATURE_TYPE();
            }
        }

        return attrs;
    }

    function verify(
        uint256 proveVerifierId,
        uint256 dscVerifierId,
        IGenericVerifier.ProveCircuitProof memory pProof,
        IGenericVerifier.DscCircuitProof memory dProof
    ) public returns (IGenericVerifier.ProveCircuitProof memory) {

        uint[6] memory dateNum;
        for (uint i = 0; i < 6; i++) {
            dateNum[i] = pProof.pubSignalsRSA[PROVE_RSA_CURRENT_DATE_INDEX + i];
        }
        uint currentTimestamp = OpenPassportFormatter.proofDateToUnixTimestamp(dateNum);

        // Check that the current date is within a +/- 1 day range
        if(
            currentTimestamp < block.timestamp - 1 days ||
            currentTimestamp > block.timestamp + 1 days
        ) {
            revert CURRENT_DATE_NOT_IN_VALID_RANGE();
        }

        // check blinded dcs
        bytes memory blindedDscCommitment;
        if (pProof.signatureType == IGenericVerifier.SignatureType.RSA) {
            blindedDscCommitment = abi.encodePacked(pProof.pubSignalsRSA[PROVE_RSA_BLINDED_DSC_COMMITMENT_INDEX]);
        } else if (pProof.signatureType == IGenericVerifier.SignatureType.ECDSA) {
            blindedDscCommitment = abi.encodePacked(pProof.pubSignalsECDSA[PROVE_ECDSA_BLINDED_DSC_COMMITMENT_INDEX]);
        } else {
            revert INVALID_SIGNATURE_TYPE();
        }
        if (
            keccak256(blindedDscCommitment) !=
            keccak256(abi.encodePacked(dProof.pubSignals[DSC_BLINDED_DSC_COMMITMENT_INDEX]))
        ) {
            revert UNEQUAL_BLINDED_DSC_COMMITMENT();
        }

        if (!genericVerifier.verifyWithProveVerifier(proveVerifierId, pProof)) {
            revert INVALID_PROVE_PROOF();
        }

        if (!genericVerifier.verifyWithDscVerifier(dscVerifierId, dProof)) {
            revert INVALID_DSC_PROOF();
        }

        return pProof;
    }

}

