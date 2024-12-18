pragma circom 2.1.9;

include "../circomlib/hasher/hash.circom";
include "../circomlib/utils/bytes.circom";
include "./customHashers.circom";

template ComputeCommitment() {

    signal input secret;
    signal input attestation_id;
    signal input leaf;
    signal input dg1[93];
    signal input dg2_hash[64];
    signal output out;

    component poseidon_hasher = PoseidonHash(7);
    poseidon_hasher.in[0] <== secret;
    poseidon_hasher.in[1] <== attestation_id;
    poseidon_hasher.in[2] <== leaf;

    signal dg1_packed[3] <== PackBytes(93)(dg1);
    for (var i = 0; i < 3; i++) {
        poseidon_hasher.in[i + 3] <== dg1_packed[i];
    }

    signal dg2Hash2 <== CustomHasher(64)(dg2_hash);

    poseidon_hasher.in[6] <== dg2Hash2;

    out <== poseidon_hasher.out;
}
