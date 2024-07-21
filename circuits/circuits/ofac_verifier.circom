pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "binary-merkle-root.circom";
include "./utils/getCommonLength.circom";
include "validatePassport.circom";

template ProvePassportNotInOfac(nLevels) {
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
    signal output proofValidity;
    signal output proofType;
    signal out1;
    signal out2;
    signal out3;

    // Validate passport
    ValidatePassport(nLevels)(secret, attestation_id, pubkey_leaf, mrz, merkle_root, merkletree_size, path, siblings, current_date);

    component poseidon_hasher = Poseidon(9);
    for (var i = 0; i < 9; i++) {
        poseidon_hasher.inputs[i] <== mrz[49 + i];
    } 

    component poseidon_hash = Poseidon(3);
    poseidon_hash.inputs[0] <== leaf_value;
    poseidon_hash.inputs[1] <== 1;
    poseidon_hash.inputs[2] <== 1;

    signal computedRoot <== BinaryMerkleRoot(256)(poseidon_hash.proofValidity, smt_size, smt_path, smt_siblings);
    out1 <== IsEqual()([computedRoot,smt_root]);
    
    // if proofValidity == false ; then proof failed as path and siblings do not compute to root
    // now if proofValidity == 1; path and siblings are true but the leaf_value given might be closest or might be actual
    // check if leaf_value = posiedon_hasher.proofValidity
    // if it is, proof == true (as it's a membership proof)
    // if check is false, then the given path and siblings are correct but for closest leaf (non-membership proof)
    // now we need to prove it is the closest leaf, i.e siblings length < first common bits of hashes
    // if it is , then proof == true or else == false
    // signal output commonLength;

    // true if leaf given = leaf calulated
    out2 <== IsEqual()([leaf_value,poseidon_hasher.proofValidity]);
    proofType <== out2;

    component lt = LessEqThan(9);
    lt.in[0] <== smt_size;
    lt.in[1] <== PoseidonHashesCommonLength()(leaf_value,poseidon_hasher.proofValidity);
    out3 <== lt.proofValidity; // true if depth <= matchingbits.length

    // if 0,(any),(any) = 0 {out1,out2,out3}
    // if 1,1(any) = 1
    // if 1,0,1 = 1
    // if 1,0,0 = 0

    signal inv;
    signal mid;
    signal in <== out2+out3;
    inv <-- in!=0 ? 1/in : 0;
    mid <== in*inv;
    proofValidity <== mid*out1;
    
}

component main { public [ merkle_root,smt_root ] } = ProvePassportNotInOfac(16);
