pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
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

    signal input closest_leaf;
    signal input smt_root;
    signal input smt_size;
    signal input smt_path[256];
    signal input smt_siblings[256];
    signal input path_to_match[256];
    signal output proofType;
    signal output proofLevel;

    // Validate passport
    ValidatePassport(nLevels)(secret, attestation_id, pubkey_leaf, mrz, merkle_root, merkletree_size, path, siblings, current_date);

    // PassportNoHash
    component poseidon_hasher = Poseidon(9);
    for (var i = 0; i < 9; i++) {
        poseidon_hasher.inputs[i] <== mrz[49 + i];
    } 
    signal smtleaf_hash <== Poseidon(3)([poseidon_hasher.out, 1,1]); // REMOVE
    // If computedRoot != smt_root; the below assertion fails as path and siblings do not compute to root and proof is not generated.
    // If computedRoot == smt_root; path and siblings are true but the proof could be membership or non-membership and then furthur checks are made.
    signal computedRoot <== BinaryMerkleRoot(256)(closest_leaf, smt_size, smt_path, smt_siblings);
    computedRoot === smt_root;

    // If leaf given = leaf calulated ; then membership proof
    proofType <== IsEqual()([closest_leaf,smtleaf_hash]); // 1 for membership proof, 0 for non-membership proof
    proofType === 0;  // Uncomment this line to make circuit handle both membership and non-membership proof and returns the type of proof (0 for non-membership, 1 for membership)

    // If proofType if 0, then the given path and siblings are correct but for closest leaf (non-membership proof) or a 0 leaf (non-membership proof)
    // now we need to prove that if it is the closest leaf, than first common bits of hashes >= siblings length 
    // if it is , then proof == true or it is invalid.

    // Just an edge case verification if someone tries to bypass the next test by deliberately passing in smt_size < commonLength
    signal sibLength <== SiblingsLength()(smt_siblings); //gives the siblings length
    sibLength === smt_size; 

    // Common length 
    component ct = CommonBitsLengthFromEnd();
    ct.bits1 <== path_to_match;
    ct.bits2 <== Num2Bits(256)(poseidon_hasher.out);
    signal commonLength <== ct.out;
    signal closestLeafValid <== LessEqThan(9)([smt_size,commonLength]);  // out1 = 1 if first common bits of hashes >= siblings length 
    // out1 = 1 if first common bits of hashes >= siblings length 
    // out1 = 0 if first common bits of hashes < siblings length

    // Now assert that 
    // Membership condn ; bits < siblings length
    // 1,any = valid (membership proof, hence no need of other conditions)
    // 0,1 = valid  (non-membership proof, closest sibling)
    // 0,0 = invalid (non-membership proof, but not closest sibling, i.e : user gave a random correct smt_path and smt_siblings)

    signal check <== IsZero()(proofType+closestLeafValid); // if 0,0,0 then invalid
    check === 0; // Assert the culminated condition
    proofLevel <== 3;
}

component main { public [ merkle_root,smt_root ] } = ProvePassportNotInOfac(16);
