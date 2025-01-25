pragma circom 2.1.9;

include "@openpassport/zk-email-circuits/utils/bytes.circom";
include "@zk-kit/binary-merkle-root.circom/src/binary-merkle-root.circom";
include "../computeCommitment.circom";
include "../customHashers.circom";

/// @notice VerifyCommitment template — verifies user's commitment is included in the merkle tree
/// @param nLevels Maximum size of the merkle tree
/// @param secret Secret for commitment generation
/// @param attestation_id Attestation ID
/// @param dg1 Data group 1 of the passport
/// @param eContent_shaBytes_packed_hash hash of the eContent
/// @param pubKey_dsc_hash Hash of the public key of the DSC
/// @param pubKey_csca_hash Hash of the public key of the CSCA
/// @param merkle_root Root of the commitment merkle tree
/// @param merkletree_size Actual size of the merkle tree
/// @param path Path to the user's commitment in the merkle tree
/// @param siblings Siblings of the user's commitment in the merkle tree

template VERIFY_COMMITMENT(nLevels) {

    signal input secret;
    signal input attestation_id;
    signal input dg1[93];
    signal input eContent_shaBytes_packed_hash;
    signal input pubKey_dsc_hash;
    signal input pubKey_csca_hash;

    signal input merkle_root;
    signal input merkletree_size;
    signal input path[nLevels];
    signal input siblings[nLevels];

    signal dg1_packed_hash <== PackBytesAndPoseidon(93)(dg1);

    signal commitment <== Poseidon(6)([secret, attestation_id, dg1_packed_hash, eContent_shaBytes_packed_hash, pubKey_dsc_hash, pubKey_csca_hash]);
    
    // Verify commitment inclusion
    signal computedRoot <== BinaryMerkleRoot(nLevels)(commitment, merkletree_size, path, siblings);
    merkle_root === computedRoot;
}