// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "../libraries/SelfUtils.sol";
import "../libraries/CountryCode.sol";

contract TestSelfUtils {
    function testPackForbiddenCountriesList(
        string[] memory forbiddenCountries
    ) external pure returns (uint256[4] memory) {
        return SelfUtils.packForbiddenCountriesList(forbiddenCountries);
    }

    /**
     * @dev Test function that uses CountryCodes constants to build an array
     *      and then packs it using SelfUtils.packForbiddenCountriesList
     */
    function testPackUsingCountryCodes() external pure returns (uint256[4] memory) {
        // Build array using CountryCodes constants
        string[] memory forbiddenCountries = new string[](8);
        forbiddenCountries[0] = CountryCodes.CHINA;
        forbiddenCountries[1] = CountryCodes.RUSSIA;
        forbiddenCountries[2] = CountryCodes.IRAN;
        forbiddenCountries[3] = CountryCodes.NORTH_KOREA;
        forbiddenCountries[4] = CountryCodes.CUBA;
        forbiddenCountries[5] = CountryCodes.SYRIA;
        forbiddenCountries[6] = CountryCodes.AFGHANISTAN;
        forbiddenCountries[7] = CountryCodes.SOMALIA;

        // Pack using SelfUtils
        return SelfUtils.packForbiddenCountriesList(forbiddenCountries);
    }

    /**
     * @dev Test function that demonstrates building arrays with different country combinations
     */
    function testPackHighRiskCountries() external pure returns (uint256[4] memory) {
        string[] memory highRiskCountries = new string[](4);
        highRiskCountries[0] = CountryCodes.AFGHANISTAN;
        highRiskCountries[1] = CountryCodes.SOMALIA;
        highRiskCountries[2] = CountryCodes.SUDAN;
        highRiskCountries[3] = CountryCodes.YEMEN;

        return SelfUtils.packForbiddenCountriesList(highRiskCountries);
    }

    /**
     * @dev Test function that demonstrates EU countries (for positive testing)
     */
    function testPackEUCountries() external pure returns (uint256[4] memory) {
        string[] memory euCountries = new string[](5);
        euCountries[0] = CountryCodes.GERMANY;
        euCountries[1] = CountryCodes.FRANCE;
        euCountries[2] = CountryCodes.ITALY;
        euCountries[3] = CountryCodes.SPAIN;
        euCountries[4] = CountryCodes.NETHERLANDS;

        return SelfUtils.packForbiddenCountriesList(euCountries);
    }
}
