pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "binary-merkle-root.circom";
include "./utils/getCommonLength.circom";
include "validatePassport.circom";

template ProveNameDobNotInOfac(nLevels) {
    signal input secret;
    signal input attestation_id;
    signal input pubkey_leaf;
    signal input mrz[93];
    signal input merkle_root;
    signal input merkletree_size;
    signal input path[nLevels];
    signal input siblings[nLevels];
    signal input current_date[6]; 

    signal input leaf_value;
    signal input smt_root;
    signal input smt_size;
    signal input smt_path[256];
    signal input smt_siblings[256];
    signal input membership;
    signal output proofType;
    signal output proofLevel;
    signal out1;

    // Validate passport
    ValidatePassport(nLevels)(secret, attestation_id, pubkey_leaf, mrz, merkle_root, merkletree_size, path, siblings, current_date);

    // Name Hash
    component poseidon_hasher[3];
    for (var j = 0; j < 3; j++) {
        poseidon_hasher[j] = Poseidon(13);
        for (var i = 0; i < 13; i++) {
            poseidon_hasher[j].inputs[i] <== mrz[10 + 13 * j + i];
        }
    }
    signal name_hash <== Poseidon(3)([poseidon_hasher[0].out, poseidon_hasher[1].out, poseidon_hasher[2].out]);

    // Dob hash
    component pos_dob = Poseidon(6);
    for(var i = 0; i < 6; i++) {
        pos_dob.inputs[i] <== mrz[62 + i];
    }
    
    // NameDob hash
    signal name_dob_hash <== Poseidon(2)([pos_dob.out, name_hash]);

    // Leaf hash
    signal smtleaf_hash <== Poseidon(3)([leaf_value, 1,1]);

    signal computedRoot <== BinaryMerkleRoot(256)(smtleaf_hash, smt_size, smt_path, smt_siblings);
    computedRoot === smt_root; // correct path given assertion 

    proofType <== IsEqual()([leaf_value,name_dob_hash]); 
    proofType === 0; // non-membership assertion

    component lt = LessEqThan(9);
    lt.in[0] <== smt_size;
    lt.in[1] <== PoseidonHashesCommonLength()(leaf_value,name_dob_hash);
    out1 <== lt.out;

    signal check;
    check <== IsZero()(proofType+out1);
    check === 0; // if non-membership then, closest sibling assertion
    proofLevel <== 2;
    
}

component main { public [ merkle_root,smt_root ] } = ProveNameDobNotInOfac(16);
