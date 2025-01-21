pragma circom 2.1.5;

include "circomlib/circuits/comparators.circom";
include "@openpassport/zk-email-circuits/utils/bytes.circom";

template ProveCountryIsNotInList(forbiddenCountriesListLength) {
    signal input dg1[93];
    signal input forbidden_countries_list[forbiddenCountriesListLength * 3]; 

    signal equality_results[forbiddenCountriesListLength][4];
    
    for (var i = 0; i < forbiddenCountriesListLength; i++) {
            equality_results[i][0] <== IsEqual()([dg1[7], forbidden_countries_list[i ]]);
            equality_results[i][1] <== IsEqual()([dg1[8], forbidden_countries_list[i + 1]]); 
            equality_results[i][2] <== IsEqual()([dg1[9], forbidden_countries_list[i + 2]]);
            equality_results[i][3] <==  equality_results[i][0] * equality_results[i][1];
            0 ===  equality_results[i][3] * equality_results[i][2];
    }

    signal output forbidden_countries_list_packed[2];
    forbidden_countries_list_packed  <== PackBytes(forbiddenCountriesListLength * 3)(forbidden_countries_list);
}
