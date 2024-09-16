pragma circom 2.1.6;

// include "circomlib/circuits/poseidon.circom";
// include "@zk-email/circuits/utils/bytes.circom";
// include "./passport_verifier_sha256WithRSAEncryption_65537.circom";
// include "./utils/chunk_data.circom";
// include "./utils/compute_pubkey_leaf.circom";
include "../utils/passport/customHashers.circom";
include "../utils/computeCommitment.circom";
include "../utils/passport/signatureAlgorithm.circom";
include "../utils/passport/passportVerifier.circom";

template OPENPASSPORT_REGISTER(signatureAlgorithm, n, k, max_padded_econtent_len, max_padded_signed_attr_len) {
    var kLengthFactor = getKLengthFactor(signatureAlgorithm);
    var kScaled = k * kLengthFactor;

    signal input secret;
    signal input dsc_secret;
    signal input dg1[93];
    signal input dg1_hash_offset;
    signal input econtent[max_padded_econtent_len];
    signal input econtent_padded_length;
    signal input signed_attr[max_padded_signed_attr_len];
    signal input signed_attr_padded_length;
    signal input signed_attr_econtent_hash_offset;
    signal input signature[kScaled];

    signal input pubKey[kScaled];

    signal input attestation_id;

    // var hashlen = getHashLength(signatureAlgorithm);

    // passport verifier
    PassportVerifier(signatureAlgorithm, n, k, max_padded_econtent_len, max_padded_signed_attr_len)(dg1,dg1_hash_offset,econtent);

    // leaf
    signal leaf  <== LeafHasher(kScaled)(pubKey, signatureAlgorithm);

    // commitment
    signal output commitment <== ComputeCommitment()(secret, attestation_id, leaf, dg1);

    // blinded dsc commitment
    signal output blinded_dsc_commitment <== Poseidon(2)([dsc_secret, leaf]);

    // nullifier
    signal output nullifier <== CustomHasher(kScaled)(signature);
    
}