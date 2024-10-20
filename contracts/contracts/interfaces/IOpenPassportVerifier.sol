// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {IGenericVerifier} from "./IGenericVerifier.sol";

interface IOpenPassportVerifier {

    error MINIMUM_AGE_TOO_LOW();
    error MINIMUM_AGE_TOO_HIGH();
    error INVALID_SIGNATURE_TYPE();
    error CURRENT_DATE_NOT_IN_VALID_RANGE();
    error UNEQUAL_BLINDED_DSC_COMMITMENT();
    error INVALID_PROVE_PROOF();
    error INVALID_DSC_PROOF();

    // TODO: Need to define data types for ofac, pubkey, forbidden countries after converters are defined
    struct PassportAttributes {
        string issuingState;
        string name;
        string passportNumber;
        string nationality;
        string dateOfBirth;
        string gender;
        string expiryDate;
        uint256 olderThan;
        bool ofacResult;
        address pubkey;
        bytes3[20] forbiddenCountries;
    }

    function verifyAndDiscloseAttributes(
        uint256 proveVerifierId,
        uint256 dscVerifierId,
        IGenericVerifier.ProveCircuitProof memory pProof,
        IGenericVerifier.DscCircuitProof memory dProof,
        uint256 attributeSelector
    ) external returns (PassportAttributes memory);


    function verify(
        uint256 proveVerifierId,
        uint256 dscVerifierId,
        IGenericVerifier.ProveCircuitProof memory pProof,
        IGenericVerifier.DscCircuitProof memory dProof
    ) external returns (IGenericVerifier.ProveCircuitProof memory);

}