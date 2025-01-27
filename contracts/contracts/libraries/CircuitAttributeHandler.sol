// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.28;

// import {Formatter} from "./Formatter.sol";
// import {IVcAndDiscloseCircuitVerifier} from "../interfaces/IVcAndDiscloseCircuitVerifier.sol";
// import {CircuitConstants} from "../constants/CircuitConstants.sol";

// library CircuitAttributeHandler {

    // function extractOlderThan(
    //     IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory proof
    // ) internal pure returns (uint256) {
    //     return Formatter.numAsciiToUint(proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_OLDER_THAN_INDEX])*10
    //         + Formatter.numAsciiToUint(proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_OLDER_THAN_INDEX + 1]);
    // }

    // function compareOlderThan(
    //     uint256 olderThan,
    //     IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory proof
    // ) internal pure returns (bool) {
    //     return extractOlderThan(proof) >= olderThan;
    // }

//     function extractForbiddenCountries(
//         IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory proof
//     ) internal pure returns (bytes3[20] memory) {
//         return Formatter.extractForbiddenCountriesFromPacked(
//             [
//                 proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_DISCLOSED_INDEX],
//                 proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_DISCLOSED_INDEX + 1]
//             ]
//         );
//     }

//     function compareForbiddenCountries(
//         uint256[2] memory forbiddenCountriesList,
//         IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory proof
//     ) internal pure returns (bool) {
//         uint256[2] memory publicforbiddenCountriesList = [
//                 proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_DISCLOSED_INDEX],
//                 proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_DISCLOSED_INDEX + 1]
//             ];
//         return (
//             publicforbiddenCountriesList[0] == forbiddenCountriesList[0] &&
//             publicforbiddenCountriesList[1] == forbiddenCountriesList[1]
//         );
//     }

// }