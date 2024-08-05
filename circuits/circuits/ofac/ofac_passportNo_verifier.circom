pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "@zk-email/circuits/utils/array.circom";
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
    signal input smt_siblings[256];
    signal output proofType;
    signal output proofLevel;

    // Validate passport
    ValidatePassport(nLevels)(secret, attestation_id, pubkey_leaf, mrz, merkle_root, merkletree_size, path, siblings, current_date);

    // PassportNo Hash
    component poseidon_hasher = Poseidon(9);
    for (var i = 0; i < 9; i++) {
        poseidon_hasher.inputs[i] <== mrz[49 + i];
    } 
    signal smtleaf_hash <== Poseidon(3)([poseidon_hasher.out, 1,1]);

    // Caclulate the depth needed
    signal sibLength <== SiblingsLength()(smt_siblings);

    // Calulate the path needed
    signal smt_path_new[256];
    signal path_in_bits_reversed[256] <== Num2Bits(256)(poseidon_hasher.out);
    var path_in_bits[256];
    for (var i = 0; i < 256; i++) {
        path_in_bits[i] = path_in_bits_reversed[255-i];
    }
    
    // Shift the path to the left by sibLength to make it compatible for BinaryMerkleRoot function
    component ct1 = VarShiftLeft(256,256);
    ct1.in <== path_in_bits;
    ct1.shift <== (256-sibLength);
    smt_path_new <== ct1.out; 

    // Closest_leaf hash
    signal closest_hash <== Poseidon(3)([closest_leaf, 1,1]);  
    signal isClosestZero <== IsEqual()([closest_leaf,0]);
    signal closest <== IsEqual()([isClosestZero,0]); // Because zk-kit/smt stores a 0 leaf as itself and not as Hash(0,value,1)
    signal closestleaf_hash <== closest_hash * closest;

    // Verification
    signal computedRoot <== BinaryMerkleRoot(256)(closestleaf_hash, sibLength, smt_path_new, smt_siblings);
    computedRoot === smt_root;

    // If leaf given = leaf calulated ; then membership proof
    proofType <== IsEqual()([closestleaf_hash,smtleaf_hash]); // 1 for membership proof, 0 for non-membership proof
    proofType === 0;  // Uncomment this line to make circuit handle both membership and non-membership proof and returns the type of proof (0 for non-membership, 1 for membership)

    proofLevel <== 3;
}

component main { public [ merkle_root,smt_root ] } = ProvePassportNotInOfac(16);
