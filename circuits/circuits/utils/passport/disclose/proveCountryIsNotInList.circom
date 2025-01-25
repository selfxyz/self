pragma circom 2.1.5;

include "circomlib/circuits/comparators.circom";
include "@openpassport/zk-email-circuits/utils/bytes.circom";

template ProveCountryIsNotInList(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH) {
    signal input dg1[93];
    signal input forbidden_countries_list[MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH * 3]; 

    signal equality_results[MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH][4];
    
    for (var i = 0; i < MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH; i++) {
            equality_results[i][0] <== IsEqual()([dg1[7], forbidden_countries_list[i ]]);
            equality_results[i][1] <== IsEqual()([dg1[8], forbidden_countries_list[i + 1]]); 
            equality_results[i][2] <== IsEqual()([dg1[9], forbidden_countries_list[i + 2]]);
            equality_results[i][3] <==  equality_results[i][0] * equality_results[i][1];
            0 ===  equality_results[i][3] * equality_results[i][2];
    }

    var chunkLength = computeIntChunkLength(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH * 3);
    signal output forbidden_countries_list_packed[chunkLength]  <== PackBytes(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH * 3)(forbidden_countries_list);
}
