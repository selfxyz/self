pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";

template ComputeCommitment() {
    signal input secret;
    signal input attestation_id;
    signal input leaf;
    signal input mrz[93];
    signal output out;

    component poseidon_hasher = Poseidon(6);
    poseidon_hasher.inputs[0] <== secret;
    poseidon_hasher.inputs[1] <== attestation_id;
    poseidon_hasher.inputs[2] <== leaf;

    signal mrz_packed[3] <== PackBytes(93)(mrz);
    for (var i = 0; i < 3; i++) {
        poseidon_hasher.inputs[i + 3] <== mrz_packed[i];
    }
    out <== poseidon_hasher.out;
}
