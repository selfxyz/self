pragma circom 2.1.5;

include "circomlib/circuits/comparators.circom";
template ProveCountryIsNotInList(forbiddenCountriesListLength) {

    signal input dg1[93];
    signal input forbidden_countries_list[forbiddenCountriesListLength];
    signal userCountryConcatenedBytes_0 <==  dg1[8] * 1000 + dg1[9];
    signal userCountryConcatenedBytes_1 <==  dg1[7] * 1000000 + userCountryConcatenedBytes_0;
    component areCountryEquals[forbiddenCountriesListLength];

    for (var i = 0; i < forbiddenCountriesListLength; i++) {
        areCountryEquals[i] = IsEqual();
        areCountryEquals[i].in[0] <== forbidden_countries_list[i];
        areCountryEquals[i].in[1] <== userCountryConcatenedBytes_1;
        areCountryEquals[i].out === 0;
    }
}
