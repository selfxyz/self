pragma circom 2.1.9;

include "@openpassport/zk-email-circuits/utils/bytes.circom";
include "@zk-kit/binary-merkle-root.circom/src/binary-merkle-root.circom";
include "circomlib/circuits/poseidon.circom";
include "../../passport/customHashers.circom";
include "../extractQrData.circom";

/// @notice VerifyCommitment template — verifies user's commitment is included in the merkle tree
/// @param nLevels Maximum size of the merkle tree
/// @input secret Secret for commitment generation
/// @input attestation_id Attestation ID
/// @input merkle_root Root of the commitment merkle tree
/// @input merkletree_size Actual size of the merkle tree
/// @input path Path to the user's commitment in the merkle tree
/// @input siblings Siblings of the user's commitment in the merkle tree
template VERIFY_COMMITMENT(nLevels) {
    signal input attestation_id;
    signal input secret;
    signal input qrDataHash;
    signal input gender;
    signal input yob[4];
    signal input mob[2];
    signal input dob[2];
    signal input name[nameMaxLength()];
    signal input aadhaar_last_4digits[4];
    signal input pincode[6];
    signal input state[maxFieldByteSize()];
    signal input ph_no_last_4digits[4];
    signal input photoHash;

    signal input merkle_root;
    signal input merkletree_size;
    signal input path[nLevels];
    signal input siblings[nLevels];


    component is_gt_97[nameMaxLength()];
    component is_lt_122[nameMaxLength()];
    signal output uppercase_name[nameMaxLength()];
    signal is_lowercase[nameMaxLength()];

    for (var i = 0; i < nameMaxLength(); i++){
        is_gt_97[i] = GreaterEqThan(8);
        is_gt_97[i].in[0] <== name[i];
        is_gt_97[i].in[1] <== 97;

        is_lt_122[i] = LessEqThan(8);
        is_lt_122[i].in[0] <== name[i];
        is_lt_122[i].in[1] <== 122;

        is_lowercase[i] <== is_gt_97[i].out * is_lt_122[i].out;

        uppercase_name[i] <== name[i] - 32 * is_lowercase[i];
    }

    component nullifierHasher = PackBytesAndPoseidon(75);
    nullifierHasher.in[0] <== gender;

    for (var i = 0; i < 4 ; i++){
        nullifierHasher.in[i + 1] <== yob[i];
    }

    for (var i = 0; i < 2 ; i++){
        nullifierHasher.in[i + 5] <== mob[i];
    }

    for (var i = 0; i < 2 ; i++){
        nullifierHasher.in[i + 7] <== dob[i];
    }

    for (var i = 0; i < 62 ; i++){
        nullifierHasher.in[i + 9] <== uppercase_name[i];
    }

    for (var i = 0; i < 4 ; i++){
        nullifierHasher.in[i + 71] <== aadhaar_last_4digits[i];
    }

    signal nullifier <== nullifierHasher.out;

    component packedCommitment = PackBytesAndPoseidon(42 + 62);
    packedCommitment.in[0] <== attestation_id;

    for (var i = 0; i < 6 ; i++){
        packedCommitment.in[i + 1] <== pincode[i];
    }

    for (var i = 0; i < maxFieldByteSize() ; i++){
        packedCommitment.in[i + 7] <== state[i];
    }

    for (var i = 0; i < 4 ; i++){
        packedCommitment.in[i + 38] <== ph_no_last_4digits[i];
    }

    for (var i = 0; i < 62 ; i++){
        packedCommitment.in[i + 42] <== name[i];
    }

    component commitmentHasher = Poseidon(5);
    commitmentHasher.inputs[0] <== secret;
    commitmentHasher.inputs[1] <== qrDataHash;
    commitmentHasher.inputs[2] <== nullifier;
    commitmentHasher.inputs[3] <== packedCommitment.out;
    commitmentHasher.inputs[4] <== photoHash;

    signal commitment <== commitmentHasher.out;

    // Verify commitment inclusion
    signal computedRoot <== BinaryMerkleRoot(nLevels)(commitment, merkletree_size, path, siblings);
    merkle_root === computedRoot;
}
