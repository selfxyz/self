pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "../utils/other/bytes.circom";
include "binary-merkle-root.circom";
include "../utils/passport/computeCommitment.circom";

template VERIFY_COMMITMENT(signatureAlgorithm, nLevels) {
    var HASH_LEN_BITS = getHashLength(signatureAlgorithm);
    var HASH_LEN_BYTES = HASH_LEN_BITS / 8;

    signal input secret;
    signal input attestation_id;
    signal input pubkey_leaf;
    signal input dg1[93];
    signal input dg2_hash[HASH_LEN_BYTES];

    signal input merkle_root;
    signal input merkletree_size;
    signal input path[nLevels];
    signal input siblings[nLevels];

    signal commitment <== ComputeCommitment(signatureAlgorithm)(secret, attestation_id, pubkey_leaf, dg1, dg2_hash);

    // Verify commitment inclusion
    signal computedRoot <== BinaryMerkleRoot(nLevels)(commitment, merkletree_size, path, siblings);
    merkle_root === computedRoot;
}
