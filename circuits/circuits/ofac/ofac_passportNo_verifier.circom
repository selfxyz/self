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

    // Validate passport
    ValidatePassport(nLevels)(secret, attestation_id, pubkey_leaf, mrz, merkle_root, merkletree_size, path, siblings, current_date);

    // PassportNoHash
    component poseidon_hasher = Poseidon(9);
    for (var i = 0; i < 9; i++) {
        poseidon_hasher.inputs[i] <== mrz[49 + i];
    } 

    // Leaf hash
    signal smtleaf_hash <== Poseidon(3)([poseidon_hasher.out, 1,1]);

    // If computedRoot != smt_root; the below assertion fails as path and siblings do not compute to root and proof is not generated.
    // If computedRoot == smt_root; path and siblings are true but the proof could be membership or non-membership and then furthur checks are made.
    signal computedRoot <== BinaryMerkleRoot(256)(leaf_value, smt_size, smt_path, smt_siblings);
    computedRoot === smt_root;

    // If leaf given = leaf calulated ; then membership proof
    proofType <== IsEqual()([leaf_value,smtleaf_hash]); // 1 for membership proof, 0 for non-membership proof
    proofType === 0;  // Comment this line to make circuit handle both membership and non-membership proof and returns the type of proof (0 for non-membership, 1 for membership)

    // If proofType if 0, then the given path and siblings are correct but for closest leaf (non-membership proof) or a 0 leaf (non-membership proof)
    // now we need to prove that if it is the closest leaf, than first common bits of hashes >= siblings length 
    // if it is , then proof == true or it is invalid.

    signal sibLength <== SiblingsLength()(smt_siblings); //gives the siblings length
    signal commonLength <== PoseidonHashesCommonLength()(leaf_value,smtleaf_hash); //gives the first common bits of hashes
    
    signal closestLeaf <== LessEqThan(9)([sibLength,commonLength]);  // out1 = 1 if first common bits of hashes >= siblings length 
    // out1 = 1 if first common bits of hashes >= siblings length 
    // out1 = 0 if first common bits of hashes < siblings length

    // however, if leaf_value is 0 , then we had a real leaf, so no need to check for common bits
    signal foo <== IsZero()(leaf_value);

    // Now assert that 
    // Membership condn ; leaf is zero ; bits < siblings length
    // 1,any,any = valid (membership proof, hence no need of other conditions)
    // 0,1,any = valid  (non-membership proof,leaf is zero is true, no need of third condn)
    // 0,0,1 = valid (non-membership proof, leaf is zero is true, third condn has to be true)
    // 0,0,0 = invalid (non-membership proof, but not closest sibling, i.e : user gave a random correct smt_path and smt_siblings)

    signal check <== IsZero()(proofType+closestLeaf+foo); // if 0,0 then invalid
    check === 0; // Assert the culminated condition
    proofLevel <== 3;
    
}

component main { public [ merkle_root,smt_root ] } = ProvePassportNotInOfac(16);
