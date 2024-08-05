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
    signal input smt_siblings[256];
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

    signal sibLength <== SiblingsLength()(smt_siblings);
    signal smt_path_new[256];
    signal path_in_bits_reversed[256] <== Num2Bits(256)(name_dob_hash);
    var path_in_bits[256];
    for (var i = 0; i < 256; i++) {
        path_in_bits[i] = path_in_bits_reversed[255-i];
    }

    component ct1 = VarShiftLeft(256,256);
    ct1.in <== path_in_bits;
    ct1.shift <== (256-sibLength);
    smt_path_new <== ct1.out;

    signal closest_hash <== Poseidon(3)([closest_leaf, 1,1]);  
    signal isClosestZero <== IsEqual()([closest_leaf,0]);
    signal closest <== IsEqual()([isClosestZero,0]); 
    signal closestleaf_hash <== closest_hash * closest;

    signal computedRoot <== BinaryMerkleRoot(256)(closestleaf_hash, sibLength, smt_path_new, smt_siblings);
    computedRoot === smt_root;

    proofType <== IsEqual()([closestleaf_hash,smtleaf_hash]); 
    proofType === 0;  // Uncomment this line to make circuit handle both membership and non-membership proof and returns the type of proof (0 for non-membership, 1 for membership)

    proofLevel <== 2;
}

component main { public [ merkle_root,smt_root ] } = ProveNameDobNotInOfac(16);
