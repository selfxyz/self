// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IGenericVerifier} from "./IGenericVerifier.sol";

interface IOpenPassportVerifier {

    error INVALID_SIGNATURE_TYPE();
    error CURRENT_DATE_NOT_IN_VALID_RANGE();
    error UNEQUAL_BLINDED_DSC_COMMITMENT();
    error INVALID_PROVE_PROOF();
    error INVALID_DSC_PROOF();

    struct DiscloseSelector {
        bool extractIssuingState;
        bool extractName;
        bool extractPassportNumber;
        bool extractNationality;
        bool extractDateOfBirth;
        bool extractGender;
        bool extractExpiryDate;
        bool extractOlderThan;
    }

    struct PassportAttributes {
        string issuingState;
        string name;
        string passportNumber;
        string nationality;
        string dateOfBirth;
        string gender;
        string expiryDate;
        uint256 olderThan;
    }

    function getAttributes(
        uint256 prove_verifier_id,
        uint256 dsc_verifier_id,
        IGenericVerifier.ProveCircuitProof memory p_proof,
        IGenericVerifier.DscCircuitProof memory d_proof,
        DiscloseSelector memory discloseSelector
    ) external returns (PassportAttributes memory);


    function verifyPassportData(
        uint256 prove_verifier_id,
        uint256 dsc_verifier_id,
        IGenericVerifier.ProveCircuitProof memory p_proof,
        IGenericVerifier.DscCircuitProof memory d_proof
    ) external returns (IGenericVerifier.ProveCircuitProof memory);

}