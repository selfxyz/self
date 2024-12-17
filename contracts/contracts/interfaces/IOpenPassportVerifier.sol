// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IGenericVerifier} from "./IGenericVerifier.sol";

interface IOpenPassportVerifier {

    error MINIMUM_AGE_TOO_LOW();
    error MINIMUM_AGE_TOO_HIGH();
    error INVALID_SIGNATURE_TYPE();
    error CURRENT_DATE_NOT_IN_VALID_RANGE();
    error UNEQUAL_BLINDED_DSC_COMMITMENT();
    error INVALID_PROVE_PROOF();
    error INVALID_DSC_PROOF();

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

    struct OpenPassportAttestation {
        uint256 proveVerifierId;
        uint256 dscVerifierId;
        IGenericVerifier.ProveCircuitProof pProof;
        IGenericVerifier.DscCircuitProof dProof;
    }

    function discloseIssuingState(
        OpenPassportAttestation memory attestation
    ) external returns (string memory);

    function discloseName(
        OpenPassportAttestation memory attestation
    ) external returns (string memory);

    function disclosePassportNumber(
        OpenPassportAttestation memory attestation
    ) external returns (string memory);

    function discloseNationality(
        OpenPassportAttestation memory attestation
    ) external returns (string memory);

    function discloseDateOfBirth(
        OpenPassportAttestation memory attestation
    ) external returns (string memory);

    function discloseGender(
        OpenPassportAttestation memory attestation
    ) external returns (string memory);

    function discloseExpiryDate(
        OpenPassportAttestation memory attestation
    ) external returns (string memory);

    function discloseOlderThan(
        OpenPassportAttestation memory attestation
    ) external returns (uint256);

    function discloseOfacResult(
        OpenPassportAttestation memory attestation
    ) external returns (bool);

    function discloseForbiddenCountries(
        OpenPassportAttestation memory attestation
    ) external returns (bytes3[20] memory);

    function verifyAndDiscloseAttributes(
        OpenPassportAttestation memory attestation,
        uint256 attributeSelector
    ) external returns (PassportAttributes memory);

    function verify(
        OpenPassportAttestation memory attestation
    ) external returns (IGenericVerifier.ProveCircuitProof memory);

    event IssuingStateDisclosed(string issuingState);
    event NameDisclosed(string name);
    event PassportNumberDisclosed(string passportNumber);
    event NationalityDisclosed(string nationality);
    event DateOfBirthDisclosed(string dateOfBirth);
    event GenderDisclosed(string gender);
    event ExpiryDateDisclosed(string expiryDate);
    event OlderThanDisclosed(uint256 olderThan);
    event OfacResultDisclosed(bool ofacResult);
    event ForbiddenCountriesDisclosed(bytes3[20] forbiddenCountries);

}