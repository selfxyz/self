pragma circom 2.1.9;

include "@openpassport/zk-email-circuits/utils/bytes.circom";
include "@zk-kit/binary-merkle-root.circom/src/binary-merkle-root.circom";
include "../computeCommitment.circom";
include "../customHashers.circom";

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

template TemplateAB() {
    signal input a;
    signal input b;
    signal output out <== Poseidon(2)([a, b]);
}