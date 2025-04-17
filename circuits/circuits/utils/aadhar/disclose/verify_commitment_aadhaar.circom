pragma circom 2.1.9;

include "@openpassport/zk-email-circuits/utils/bytes.circom";
include "@zk-kit/binary-merkle-root.circom/src/binary-merkle-root.circom";
include "circomlib/circuits/poseidon.circom";

/// @notice verifies user's commitment is included in the merkle tree


template VERIFY_COMMITMENT(nLevels) {
    signal input secret;
    signal input attestation_id;

    signal input qrDataPadded[maxDataLength];
    signal input qrDataPaddedLength;
    signal input delimiterIndices[18];

    signal input merkle_root;
    signal input merkletree_size;
    signal input path[nLevels];
    signal input siblings[nLevels];


    component qrDataExtractor = QRDataExtractor(maxDataLength);
    qrDataExtractor.data <== qrDataPadded;
    qrDataExtractor.qrDataPaddedLength <== qrDataPaddedLength;
    qrDataExtractor.delimiterIndices <== delimiterIndices;


    // photohash (similar to nullifier calc)
    component h0 = Poseidon(16);
    component h1 = Poseidon(16);
    for (var i = 0; i < 16; i++) {
        h0.inputs[i] <== photo[i];
        h1.inputs[i] <== photo[i + 16];
    }

    component hReduce = Poseidon(2);
    hReduce.inputs[0] <== h0.out;
    hReduce.inputs[1] <== h1.out;

    signal photoHash <== hReduce.out;


    commitment <== Poseidon(4)([
        secret,
        attestation_id,
        // data_hash,
        photoHash,
        pubKeyHash
    ]);

    // Verify commitment inclusion
    signal computedRoot <== BinaryMerkleRoot(nLevels)(commitment, merkletree_size, path, siblings);
    merkle_root === computedRoot;

}