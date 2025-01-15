pragma circom 2.1.9;

include "../utils/passport/disclose/verify_commitment.circom";
include "../utils/passport/disclose/disclose.circom";
include "../utils/passport/disclose/proveCountryIsNotInList.circom";
include "../utils/passport/ofac/ofac_name.circom";

template VC_AND_DISCLOSE( nLevels,FORBIDDEN_COUNTRIES_LIST_LENGTH) {

    signal input secret;
    signal input attestation_id;
    signal input pubkey_leaf;
    signal input dg1[93];
    signal input dg2_hash[64];

    signal input merkle_root;
    signal input merkletree_size;
    signal input path[nLevels];
    signal input siblings[nLevels];

    signal input selector_dg1[88]; // 88 for MRZ
    signal input selector_older_than;
    signal input scope;
    signal input current_date[6]; // YYMMDD - num
    signal input majority[2]; // YY - ASCII
    signal input user_identifier;

    // ofac check
    signal input smt_leaf_key;
    signal input smt_root;
    signal input smt_siblings[256];
    signal input selector_ofac;
    // forbidden countries list
    signal input forbidden_countries_list[FORBIDDEN_COUNTRIES_LIST_LENGTH * 3];

    // verify commitment is part of the merkle tree
    VERIFY_COMMITMENT(nLevels)(secret, attestation_id, pubkey_leaf, dg1, dg2_hash, merkle_root, merkletree_size, path, siblings);

    // verify passport validity and disclose optional data
    component disclose = DISCLOSE();
    disclose.dg1 <== dg1;
    disclose.selector_dg1 <== selector_dg1;
    disclose.selector_older_than <== selector_older_than;
    disclose.current_date <== current_date;
    disclose.majority <== majority;
    
    // generate scope nullifier
    component poseidon_nullifier = Poseidon(2);
    poseidon_nullifier.inputs[0] <== secret;
    poseidon_nullifier.inputs[1] <== scope;
    signal output nullifier <== poseidon_nullifier.out;
    signal output revealedData_packed[3] <== disclose.revealedData_packed;
    signal output older_than[2] <== disclose.older_than;

    // COUNTRY IS IN LIST
    signal output forbidden_countries_list_packed_disclosed[2] <== ProveCountryIsNotInList(FORBIDDEN_COUNTRIES_LIST_LENGTH)(dg1, forbidden_countries_list);

    // OFAC
    signal ofacCheckResult <== OFAC_NAME()(dg1,smt_leaf_key,smt_root,smt_siblings);
    signal ofacIntermediaryOutput <== ofacCheckResult * selector_ofac;
    signal output ofac_result <== ofacIntermediaryOutput;
}

component main { public [ merkle_root, smt_root, scope, user_identifier, current_date, attestation_id] } = VC_AND_DISCLOSE(16,20);