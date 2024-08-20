pragma circom 2.1.5;

include "./verify_commitment.circom";
include "./disclose.circom";

template VC_AND_DISCLOSE(nLevels) {
    signal input secret;
    signal input attestation_id;
    signal input pubkey_leaf;
    signal input mrz[93];

    signal input merkle_root;
    signal input merkletree_size;
    signal input path[nLevels];
    signal input siblings[nLevels];

    signal input bitmap[90]; // 88 for MRZ + 2 for majority
    signal input scope;
    signal input current_date[6]; // YYMMDD - num
    signal input majority[2]; // YY - ASCII
    signal input user_identifier;

    // verify commitment is part of the merkle tree
    VERIFY_COMMITMENT(nLevels)(secret, attestation_id, pubkey_leaf, mrz, merkle_root, merkletree_size, path, siblings);

    // verify passport validity and disclose optional data
    component disclose = DISCLOSE();
    disclose.mrz <== mrz;
    disclose.bitmap <== bitmap;
    disclose.current_date <== current_date;
    disclose.majority <== majority;
    
    // generate scope nullifier
    component poseidon_nullifier = Poseidon(2);
    poseidon_nullifier.inputs[0] <== secret;
    poseidon_nullifier.inputs[1] <== scope;
    signal output nullifier <== poseidon_nullifier.out;
    signal output revealedData_packed[3] <== disclose.revealedData_packed;
}

component main { public [ merkle_root, scope, user_identifier, current_date, attestation_id] } = VC_AND_DISCLOSE(16);