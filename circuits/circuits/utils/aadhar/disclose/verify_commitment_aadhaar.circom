pragma circom 2.1.9;

include "@openpassport/zk-email-circuits/utils/bytes.circom";
include "@zk-kit/binary-merkle-root.circom/src/binary-merkle-root.circom";
include "circomlib/circuits/poseidon.circom";
include "../../passport/customHashers.circom";

/// @notice verifies user's commitment is included in the merkle tree
/// @input secret Secret of the user — used to reconstruct commitment and generate nullifier
/// @input attestation_id Attestation ID of the credential used to generate the commitment
/// @input qrDataPadded QR data without the signature; assumes elements to be bytes; remaining space is padded with 0
/// @input merkle_root Root of the commitment merkle tree
/// @input merkletree_size Actual size of the merkle tree
/// @input path Path to the user's commitment in the merkle tree
/// @input siblings Siblings of the user's commitment in the merkle tree


template VERIFY_COMMITMENT_AADHAAR(nLevels,maxDataLength) {
    signal input secret;
    signal input attestation_id;

    signal input qrDataPadded[maxDataLength];

    signal input merkle_root;
    signal input merkletree_size;
    signal input path[nLevels];
    signal input siblings[nLevels];

    // Poseidon commitment
    component dataCommit = PackBytesAndPoseidon(maxDataLength);
    dataCommit.in <== qrDataPadded;// whole buffer including zeros
    signal datacommitment <== dataCommit.out;

    signal commitment <== Poseidon(3)([secret,attestation_id,datacommitment]); 
    
    // Verify commitment inclusion
    signal computedRoot <== BinaryMerkleRoot(nLevels)(commitment, merkletree_size, path, siblings);
    merkle_root === computedRoot;
}