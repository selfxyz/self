// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library OpenPassportAttributeSelector {

    uint256 public constant ISSUING_STATE_SELECTOR = 1 << 0;
    uint256 public constant NAME_SELECTOR = 1 << 1;
    uint256 public constant PASSPORT_NUMBER_SELECTOR = 1 << 2;
    uint256 public constant NATIONALITY_SELECTOR = 1 << 3;
    uint256 public constant DATE_OF_BIRTH_SELECTOR = 1 << 4;
    uint256 public constant GENDER_SELECTOR = 1 << 5;
    uint256 public constant EXPIRY_DATE_SELECTOR = 1 << 6;
    uint256 public constant OLDER_THAN_SELECTOR = 1 << 7;
    uint256 public constant OFAC_RESULT_SELECTOR = 1 << 8;
    uint256 public constant FORBIDDEN_COUNTRIES_SELECTOR = 1 << 9;


    function combineAttributeSelectors(uint256[] memory selectors) internal pure returns (uint256) {
        uint256 combinedSelector = 0;
        for (uint256 i = 0; i < selectors.length; i++) {
            combinedSelector |= selectors[i];
        }
        return combinedSelector;
    }

}
