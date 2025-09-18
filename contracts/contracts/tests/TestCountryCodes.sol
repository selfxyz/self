// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "../libraries/CountryCode.sol";

contract TestCountryCodes {
    function getAfghanistan() external pure returns (string memory) {
        return CountryCodes.AFGHANISTAN;
    }

    function getUnitedStates() external pure returns (string memory) {
        return CountryCodes.UNITED_STATES;
    }

    function getChina() external pure returns (string memory) {
        return CountryCodes.CHINA;
    }

    function getRussia() external pure returns (string memory) {
        return CountryCodes.RUSSIA;
    }

    function getIran() external pure returns (string memory) {
        return CountryCodes.IRAN;
    }

    function getCuba() external pure returns (string memory) {
        return CountryCodes.CUBA;
    }

    function getSyria() external pure returns (string memory) {
        return CountryCodes.SYRIA;
    }

    function getNorthKorea() external pure returns (string memory) {
        return CountryCodes.NORTH_KOREA;
    }

    // Test function to verify multiple country codes in an array
    function getSampleForbiddenCountries() external pure returns (string[] memory) {
        string[] memory countries = new string[](6);
        countries[0] = CountryCodes.CHINA;
        countries[1] = CountryCodes.RUSSIA;
        countries[2] = CountryCodes.IRAN;
        countries[3] = CountryCodes.NORTH_KOREA;
        countries[4] = CountryCodes.CUBA;
        countries[5] = CountryCodes.SYRIA;
        return countries;
    }
}
