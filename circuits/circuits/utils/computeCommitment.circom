pragma circom 2.1.9;

include "circomlib/circuits/poseidon.circom";
include "@zk-email/circuits/utils/bytes.circom";
template ComputeCommitment() {
    signal input secret;
    signal input attestation_id;
    signal input leaf;
    signal input dg1[93];
    signal output out;

    component poseidon_hasher = Poseidon(6);
    poseidon_hasher.inputs[0] <== secret;
    poseidon_hasher.inputs[1] <== attestation_id;
    poseidon_hasher.inputs[2] <== leaf;

    signal dg1_packed[3] <== PackBytes(93)(dg1);
    for (var i = 0; i < 3; i++) {
        poseidon_hasher.inputs[i + 3] <== dg1_packed[i];
    }
    out <== poseidon_hasher.out;
    //  out <== leaf;
}
