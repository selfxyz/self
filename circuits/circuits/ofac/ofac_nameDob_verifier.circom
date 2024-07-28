pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "binary-merkle-root.circom";
include "../utils/getCommonLength.circom";
include "../utils/validatePassport.circom";

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
    signal smtleaf_hash <== Poseidon(3)([name_dob_hash, 1,1]);
    signal computedRoot <== BinaryMerkleRoot(256)(closest_leaf, smt_size, smt_path, smt_siblings);
    computedRoot === smt_root;

    proofType <== IsEqual()([closest_leaf,smtleaf_hash]); 
    proofType === 0;  // Uncomment this line to make circuit handle both membership and non-membership proof and returns the type of proof (0 for non-membership, 1 for membership)

    signal sibLength <== SiblingsLength()(smt_siblings); // If someone tries to bypass the next test by deliberately passing in smt_size < commonLength
    sibLength === smt_size; 

    // Common length 
    component ct = CommonBitsLengthFromEnd();
    ct.bits1 <== path_to_match;
    ct.bits2 <== Num2Bits(256)(name_dob_hash);
    signal commonLength <== ct.out;
    signal closestLeafValid <== LessEqThan(9)([smt_size,commonLength]); 

    signal check <== IsZero()(proofType+closestLeafValid); 
    check === 0; // Assert the culminated condition
    proofLevel <== 2;
}

component main { public [ merkle_root,smt_root ] } = ProveNameDobNotInOfac(16);
