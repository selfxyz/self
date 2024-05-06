include "./merkle_tree/tree.circom";
include "./chunk_data.circom";

template MerkleTreePubkey_sha256WithRSAEncryption65537(n, k, nLevels, pubkeySize) {
    signal input pubkey[pubkeySize];
    signal input merkle_root;
    signal input path[nLevels];
    signal input siblings[nLevels];
    signal input signatureAlgorithm;

    // Converting pubkey (modulus) into 11 chunks of 192 bits, assuming original n, k are 64 and 32.
    // This is because Poseidon circuit only supports an array of 16 elements.
    var chunk_size = 11;  // Since ceil(32 / 3) in integer division is 11
    component chunk_data = ChunkData(n, k, chunk_size);
    chunk_data.data <== pubkey;

    signal leaf_hash_input[1 + k3_chunked_size];
    leaf_hash_input[0] <== signatureAlgorithm;
    for (var i = 0; i < k3_chunked_size; i++) {
        leaf_hash_input[i+1] <== chunk_data.outputs[i];
    }
    signal leaf <== Poseidon(1 + k3_chunked_size)(leaf_hash_input);

    // Verify inclusion in merkle tree
    signal computed_merkle_root <== MerkleTreeInclusionProof(nLevels)(leaf, path, siblings);
    merkle_root === computed_merkle_root;

    // sha256WithRSAEncryption_65537 is the only sigAlg supported right now
    signatureAlgorithm === 1;
    pubkeySize === k;

}

