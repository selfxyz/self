pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "@zk-email/circuits/utils/bytes.circom";
include "./passport_verifier_sha256WithRSAEncryption_65537.circom";
include "./utils/chunk_data.circom";
include "./utils/compute_pubkey_leaf.circom";
include "binary-merkle-root.circom";

template Register_sha256WithRSAEncryption_65537(n, k, max_padded_econtent_len, max_padded_signed_attr_len, nLevels, signatureAlgorithm) {
    signal input secret;

    signal input dg1[93];
    signal input dg1_hash_offset;
    signal input econtent[max_padded_econtent_len];
    signal input econtent_padded_length;
    signal input signed_attr[max_padded_signed_attr_len];
    signal input signed_attr_padded_length;
    signal input signed_attr_econtent_hash_offset;
    signal input signature[k];

    signal input pubkey[k];
    signal input merkle_root;
    signal input path[nLevels];
    signal input siblings[nLevels];

    signal input attestation_id;

    // Verify inclusion of the pubkey in the pubkey tree
    signal leaf <== ComputePubkeyLeaf(n, k, signatureAlgorithm)(pubkey);
    signal computed_merkle_root <== BinaryMerkleRoot(nLevels)(leaf, nLevels, path, siblings);
    merkle_root === computed_merkle_root;

    // Verify passport validity
    component PV = PassportVerifier_sha256WithRSAEncryption_65537(n, k, max_padded_econtent_len, max_padded_signed_attr_len);
    PV.dg1 <== dg1;
    PV.eContent <== econtent;
    PV.eContentPaddedLength <== econtent_padded_length;
    PV.eContentDG1HashOffset <== dg1_hash_offset;
    PV.signedAttr <== signed_attr;
    PV.signedAttrPaddedLength <== signed_attr_padded_length;
    PV.signedAttreContentHashOffset <== signed_attr_econtent_hash_offset;
    PV.pubkey <== pubkey;
    PV.signature <== signature;

    // Generate the commitment
    component poseidon_hasher = Poseidon(6);
    poseidon_hasher.inputs[0] <== secret;
    poseidon_hasher.inputs[1] <== attestation_id;
    poseidon_hasher.inputs[2] <== leaf;

    signal mrz_packed[3] <== PackBytes(93)(dg1);
    for (var i = 0; i < 3; i++) {
        poseidon_hasher.inputs[i + 3] <== mrz_packed[i];
    }
    signal output commitment <== poseidon_hasher.out;

    // Generate the nullifier
    var chunk_size = 11;  // Since ceil(32 / 3) in integer division is 11
    signal chunked_signature[chunk_size] <== ChunkData(n, k, chunk_size)(signature);
    signal output nullifier <== Poseidon(chunk_size)(chunked_signature);
}

// We hardcode 1 here for sha256WithRSAEncryption_65537
component main { public [ merkle_root, attestation_id ] } = Register_sha256WithRSAEncryption_65537(64, 32, 640, 512, 16, 1);
