pragma circom 2.1.9;

include "circomlib/circuits/poseidon.circom";
include "../other/bytes.circom";
include "./signatureAlgorithm.circom";
include "./CustomHashers.circom";

template ComputeCommitment(signatureAlgorithm) {
    var HASH_LEN_BITS = getHashLength(signatureAlgorithm);
    var HASH_LEN_BYTES = HASH_LEN_BITS / 8;

    signal input secret;
    signal input attestation_id;
    signal input leaf;
    signal input dg1[93];
    signal input dg2_hash[HASH_LEN_BYTES];
    signal output out;

    component poseidon_hasher = Poseidon(7);
    poseidon_hasher.inputs[0] <== secret;
    poseidon_hasher.inputs[1] <== attestation_id;
    poseidon_hasher.inputs[2] <== leaf;

    signal dg1_packed[3] <== PackBytes(93)(dg1);
    for (var i = 0; i < 3; i++) {
        poseidon_hasher.inputs[i + 3] <== dg1_packed[i];
    }

    signal dg2Hash2 <== CustomHasher(HASH_LEN_BYTES)(dg2_hash);

    poseidon_hasher.inputs[6] <== dg2Hash2;

    out <== poseidon_hasher.out;
}
