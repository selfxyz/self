pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "../utils/validatePassport.circom";
include "../utils/validateCountry.circom";

template ProveCountryNotInSCList(nLevels) {
    signal input secret;
    signal input attestation_id;
    signal input pubkey_leaf;
    signal input mrz[93];
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
    ValidatePassport(nLevels)(secret, attestation_id, pubkey_leaf, mrz, merkle_root, merkletree_size, path, siblings, current_date);

    // User Country 
    var host_user[6] = [hostCountry[0],hostCountry[1],hostCountry[2],mrz[7],mrz[8],mrz[9]];
    ValidateCountry(256)(host_user, closest_leaf, smt_root, smt_siblings);
}

component main { public [ merkle_root,smt_root,hostCountry ] } = ProveCountryNotInSCList(16);
