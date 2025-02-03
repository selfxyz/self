// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IPassportAirdropRoot {

    struct VerificationConfig {
        bool olderThanEnabled;
        uint256 olderThan;
        bool forbiddenCountriesEnabled;
        uint256 forbiddenCountriesListPacked;
        bool ofacEnabled;
    }

}