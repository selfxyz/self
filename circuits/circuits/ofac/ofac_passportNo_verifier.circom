pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "binary-merkle-root.circom";
include "../utils/getCommonLength.circom";
include "../utils/validatePassport.circom";

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
    signal output proofType;
    signal output proofLevel;
    signal out1;

    // Validate passport
    ValidatePassport(nLevels)(secret, attestation_id, pubkey_leaf, mrz, merkle_root, merkletree_size, path, siblings, current_date);

    // PassportNoHash
    component poseidon_hasher = Poseidon(9);
    for (var i = 0; i < 9; i++) {
        poseidon_hasher.inputs[i] <== mrz[49 + i];
    } 

    // Leaf hash
    signal smtleaf_hash <== Poseidon(3)([leaf_value, 1,1]);

    // Proof Validation
    signal computedRoot <== BinaryMerkleRoot(256)(smtleaf_hash, smt_size, smt_path, smt_siblings);
    computedRoot === smt_root;

    // If computedRoot != smt_root; the above assertion fails as path and siblings do not compute to root and proof is not generated.
    // If computedRoot == smt_root; path and siblings are true but the proof could be membership or non-membership.

    // If leaf given = leaf calulated ; then membership proof
    proofType <== IsEqual()([leaf_value,poseidon_hasher.out]); // 1 for membership proof, 0 for non-membership proof

    proofType === 0;  // Comment this line to make circuit handle both membership and non-membership proof and returns the type of proof (0 for non-membership, 1 for membership)

    // If proofType if 0, then the given path and siblings are correct but for closest leaf (non-membership proof)
    // now we need to prove it is the closest leaf, i.e siblings length < first common bits of hashes
    // if it is , then proof == true or it is invalid.
    component lt = LessEqThan(9);
    lt.in[0] <== smt_size;
    lt.in[1] <== PoseidonHashesCommonLength()(leaf_value,poseidon_hasher.out);
    out1 <== lt.out; // true if depth <= matchingbits.length

    // Now assert that 
    // 1,any(0/1) = valid (membership proof, hence no need of second condition)
    // 0,1 = valid  (non-membership proof, hence second condition has to be true)
    // 0,0 = invalid (non-membership proof, but not closest sibling, i.e : user gave a random correct smt_path and smt_siblings)

    signal check;
    check <== IsZero()(proofType+out1);
    check === 0; // if 0,0 then invalid
    proofLevel <== 3;
    
}

component main { public [ merkle_root,smt_root ] } = ProvePassportNotInOfac(16);
