// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IGenericVerifier} from "./interfaces/IGenericVerifier.sol";
import {IOpenPassportVerifier} from "./interfaces/IOpenPassportVerifier.sol";
import "./constants/Constants.sol";
import "./libraries/Formatter.sol";
import "./libraries/Dg1Disclosure.sol";

contract OpenPassportVerifier is IOpenPassportVerifier {

    IGenericVerifier public genericVerifier;

    constructor (address _genericVerifier) {
        genericVerifier = IGenericVerifier(_genericVerifier);
    }

    function getAttributes(
        uint256 prove_verifier_id,
        uint256 dsc_verifier_id,
        IGenericVerifier.ProveCircuitProof memory p_proof,
        IGenericVerifier.DscCircuitProof memory d_proof,
        DiscloseSelector memory discloseSelector
    ) public returns (PassportAttributes memory) {
        verifyPassportData(prove_verifier_id, dsc_verifier_id, p_proof, d_proof);
        uint[3] memory revealedData_packed;
        for (uint256 i = 0; i < 3; i++) {
            if (p_proof.signatureType == IGenericVerifier.SignatureType.RSA) {
                revealedData_packed[i] = p_proof.pubSignalsRSA[PROVE_RSA_REVEALED_DATA_PACKED_INDEX + i];
            } else if (p_proof.signatureType == IGenericVerifier.SignatureType.ECDSA) {
                revealedData_packed[i] = p_proof.pubSignalsECDSA[PROVE_ECDSA_REVEALED_DATA_PACKED_INDEX + i];
            } else {
                revert INVALID_SIGNATURE_TYPE();
            }
        }
        bytes memory charcodes = OpenPassportFormatter.fieldElementsToBytes(
            revealedData_packed
        );

        PassportAttributes memory attrs;

        if (discloseSelector.extractIssuingState) {
            attrs.issuingState = Dg1Disclosure.getIssuingState(charcodes);
        }

        if (discloseSelector.extractName) {
            attrs.name = Dg1Disclosure.getName(charcodes);
        }

        if (discloseSelector.extractPassportNumber) {
            attrs.passportNumber = Dg1Disclosure.getPassportNumber(charcodes);
        }

        if (discloseSelector.extractNationality) {
            attrs.nationality = Dg1Disclosure.getNationality(charcodes);
        }

        if (discloseSelector.extractDateOfBirth) {
            attrs.dateOfBirth = Dg1Disclosure.getDateOfBirth(charcodes);
        }

        if (discloseSelector.extractGender) {
            attrs.gender = Dg1Disclosure.getGender(charcodes);
        }

        if (discloseSelector.extractExpiryDate) {
            attrs.expiryDate = Dg1Disclosure.getExpiryDate(charcodes);
        }

        if (discloseSelector.extractOlderThan) {
            if (p_proof.signatureType == IGenericVerifier.SignatureType.RSA) {
                attrs.olderThan =
                    OpenPassportFormatter.numAsciiToUint(p_proof.pubSignalsRSA[PROVE_RSA_OLDER_THAN_INDEX])*10
                    + OpenPassportFormatter.numAsciiToUint(p_proof.pubSignalsRSA[PROVE_RSA_OLDER_THAN_INDEX + 1]);
            } else if (p_proof.signatureType == IGenericVerifier.SignatureType.ECDSA) {
                attrs.olderThan =
                    OpenPassportFormatter.numAsciiToUint(p_proof.pubSignalsECDSA[PROVE_ECDSA_OLDER_THAN_INDEX])*10
                    + OpenPassportFormatter.numAsciiToUint(p_proof.pubSignalsECDSA[PROVE_ECDSA_OLDER_THAN_INDEX + 1]);
            } else {
                revert INVALID_SIGNATURE_TYPE();
            }
        }

        return attrs;
    }

    function verifyPassportData(
        uint256 prove_verifier_id,
        uint256 dsc_verifier_id,
        IGenericVerifier.ProveCircuitProof memory p_proof,
        IGenericVerifier.DscCircuitProof memory d_proof
    ) public returns (IGenericVerifier.ProveCircuitProof memory) {

        uint[6] memory dateNum;
        for (uint i = 0; i < 6; i++) {
            dateNum[i] = p_proof.pubSignalsRSA[PROVE_RSA_CURRENT_DATE_INDEX + i];
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
        if (p_proof.signatureType == IGenericVerifier.SignatureType.RSA) {
            blindedDscCommitment = abi.encodePacked(p_proof.pubSignalsRSA[PROVE_RSA_BLINDED_DSC_COMMITMENT_INDEX]);
        } else if (p_proof.signatureType == IGenericVerifier.SignatureType.ECDSA) {
            blindedDscCommitment = abi.encodePacked(p_proof.pubSignalsECDSA[PROVE_ECDSA_BLINDED_DSC_COMMITMENT_INDEX]);
        } else {
            revert INVALID_SIGNATURE_TYPE();
        }
        if (
            keccak256(blindedDscCommitment) !=
            keccak256(abi.encodePacked(d_proof.pubSignals[DSC_BLINDED_DSC_COMMITMENT_INDEX]))
        ) {
            revert UNEQUAL_BLINDED_DSC_COMMITMENT();
        }

        if (!genericVerifier.verifyWithProveVerifier(prove_verifier_id, p_proof)) {
            revert INVALID_PROVE_PROOF();
        }

        if (!genericVerifier.verifyWithDscVerifier(dsc_verifier_id, d_proof)) {
            revert INVALID_DSC_PROOF();
        }

        return p_proof;
    }

}

