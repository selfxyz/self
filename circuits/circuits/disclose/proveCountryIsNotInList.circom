pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "./verify_commitment.circom";
include "../utils/passport/ofac/validateCountry.circom";

template ProveCountryNotInList(nLevels) {
    signal input secret;
    signal input attestation_id;
    signal input pubkey_leaf;
    signal input dg1[93];
    signal input dg2_hash[64];
    signal input merkle_root;
    signal input merkletree_size;
    signal input path[nLevels];
    signal input siblings[nLevels];
    signal input current_date[6]; 

    signal input hostCountry[3];
    signal input closest_leaf;
    signal input smt_root;
    signal input smt_siblings[256];
    signal output proofLevel;

    // Validate passport
    //ValidatePassport(nLevels)(secret, attestation_id, pubkey_leaf, dg1, merkle_root, merkletree_size, path, siblings, current_date);
    VERIFY_COMMITMENT(nLevels)(secret, attestation_id, pubkey_leaf, dg1, dg2_hash, merkle_root, merkletree_size, path, siblings);

    // User Country 
    var host_user[6] = [hostCountry[0],hostCountry[1],hostCountry[2],dg1[7],dg1[8],dg1[9]];
    ValidateCountry(256)(host_user, closest_leaf, smt_root, smt_siblings);
}