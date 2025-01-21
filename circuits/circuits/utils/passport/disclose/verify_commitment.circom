pragma circom 2.1.9;

include "@openpassport/zk-email-circuits/utils/bytes.circom";
include "@zk-kit/binary-merkle-root.circom/src/binary-merkle-root.circom";
include "../computeCommitment.circom";

template VERIFY_COMMITMENT( nLevels) {

    signal input secret;
    signal input attestation_id;
    signal input pubkey_leaf;
    signal input dg1[93];
    signal input dg2_hash[64];

    signal input merkle_root;
    signal input merkletree_size;
    signal input path[nLevels];
    signal input siblings[nLevels];

    signal commitment <== ComputeCommitment()(secret, attestation_id, pubkey_leaf, dg1, dg2_hash);
    // Verify commitment inclusion
    signal computedRoot <== BinaryMerkleRoot(nLevels)(commitment, merkletree_size, path, siblings);
    merkle_root === computedRoot;
}
