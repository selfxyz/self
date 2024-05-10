pragma circom 2.1.5;

include "./chunk_data.circom";

// chunks the pubkey and hashes it with the signature algorithm
template ComputePubkeyLeaf(n, k, signatureAlgorithm) {
    signal input pubkey[k];

    // Converting pubkey (modulus) into 11 chunks of 192 bits, assuming original n, k are 64 and 32.
    // This is because Poseidon circuit only supports an array of 16 elements.
    var chunk_size = 11;  // Since ceil(32 / 3) in integer division is 11
    signal chunk_data[chunk_size] <== ChunkData(n, k, chunk_size)(pubkey);

    signal leaf_hash_input[1 + chunk_size];
    leaf_hash_input[0] <== signatureAlgorithm;
    for (var i = 0; i < chunk_size; i++) {
        leaf_hash_input[i+1] <== chunk_data[i];
    }
    signal output leaf <== Poseidon(1 + chunk_size)(leaf_hash_input);
}
