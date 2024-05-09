pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "@zk-email/circuits/helpers/extract.circom";
include "./merkle_tree/tree.circom";
include "./merkle_tree_pubkey_sha256WithRSAEncryption65537.circom";
include "./passport_verifier_sha256WithRSAEncryption65537.circom";
include "./chunk_data.circom";

template Register(n, k, max_datahashes_bytes, nLevels, pubkeySize) {

    signal input secret;

    signal input mrz[93];
    signal input econtent[max_datahashes_bytes];
    signal input datahashes_padded_length;
    signal input signed_attributes[104];
    signal input signature[k];
    signal input signature_algorithm;

    // merkle tree inclusion of issuer pubkey
    signal input pubkey[pubkeySize];
    signal input merkle_root;
    signal input path[nLevels];
    signal input siblings[nLevels];

    // Verify inclusion of the pubkey in the merkle tree
    component MT = MerkleTreePubkey_sha256WithRSAEncryption65537(n, k, nLevels, pubkeySize);
    MT.pubkey <== pubkey;
    MT.signatureAlgorithm <== signature_algorithm;
    MT.merkle_root <== merkle_root;
    MT.path <== path;
    MT.siblings <== siblings;


    // Verify passport
    component PV = PassportVerifier_sha256WithRSAEncryption65537(n, k, max_datahashes_bytes);
    PV.mrz <== mrz;
    PV.dataHashes <== econtent;
    PV.datahashes_padded_length <== datahashes_padded_length;
    PV.eContentBytes <== signed_attributes;
    PV.pubkey <== pubkey;
    PV.signature <== signature;

    // Generate the commitment
    component poseidon_commitment = Poseidon(4);
    poseidon_commitment.inputs[0] <== secret;
    signal mrz_packed[3] <== PackBytes(93, 3, 31)(mrz);
    for (var i = 0; i < 3; i++) {
        poseidon_commitment.inputs[i + 1] <== mrz_packed[i];
    }
    signal output commitment <== poseidon_commitment.out;

    // Generate the nullifier 
    var chunk_size = 11;  // Since ceil(32 / 3) in integer division is 11
    component chunk_data = ChunkData(n, k, chunk_size);
    chunk_data.data <== signature;

    component poseidon_nullifier = Poseidon(chunk_size);
    for(var i = 0; i < chunk_size; i++) {
        poseidon_nullifier.inputs[i] <== chunk_data.outputs[i];
    }
    signal output nullifier <== poseidon_nullifier.out;
}

component main { public [ merkle_root, signature_algorithm ] } = Register(64, 32, 320, 16, 32);

