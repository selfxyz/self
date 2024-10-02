pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "./verify_commitment.circom";
include "../utils/passport/ofac/validateCountry.circom";

template ProveCountryNotInList() {

    signal input dg1[93];

    signal input hostCountry[3];
    signal input smt_leaf_value;
    signal input smt_root;
    signal input smt_siblings[256];
    signal output proofLevel;

    // User Country 
    var host_user[6] = [hostCountry[0],hostCountry[1],hostCountry[2],dg1[7],dg1[8],dg1[9]];
    ValidateCountry(256)(host_user, smt_leaf_value, smt_root, smt_siblings);
}