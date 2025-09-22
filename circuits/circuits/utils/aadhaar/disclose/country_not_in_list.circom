pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";
include "@openpassport/zk-email-circuits/utils/bytes.circom";

/// @notice CountryNotInList template — used to prove that the user is not from a list of forbidden countries
/// @param MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH Maximum number of countries present in the forbidden countries list
/// @input country Country of the user
/// @input forbidden_countries_list Forbidden countries list user wants to prove he is not from
/// @output forbidden_countries_list_packed Packed forbidden countries list — gas optimized

template CountryNotInList(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH) {
    signal input country[3];
    signal input forbidden_countries_list[MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH * 3];

    //Range-check for forbidden_countries_list
    AssertBytes(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH * 3)(forbidden_countries_list);

    signal equality_result[MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH][4];
    signal is_equal[MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH][3];
    for (var i = 0; i < MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH; i++) {
        equality_result[i][0] <== 1;
        for (var j = 1; j < 3 + 1; j++) {
            is_equal[i][j - 1] <== IsEqual()([country[j - 1], forbidden_countries_list[i * 3 + j - 1]]);
            equality_result[i][j] <== is_equal[i][j - 1] * equality_result[i][j - 1];
        }
        0 === equality_result[i][3];
    }

    var chunkLength = computeIntChunkLength(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH * 3);
    signal output forbidden_countries_list_packed[chunkLength]  <== PackBytes(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH * 3)(forbidden_countries_list);
}
