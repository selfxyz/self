// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IOpenPassportPortalV1 {

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

    function register(uint256 _typeId, bytes calldata _proof) external;
} 