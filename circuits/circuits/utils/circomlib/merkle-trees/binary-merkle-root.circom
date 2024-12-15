pragma circom 2.1.6;

include "../../circomlib/hasher/hash.circom";
include "../../circomlib/bitify/comparators.circom";
include "../../circomlib/mux/mux1.circom";

// This circuit is designed to calculate the root of a binary Merkle
// tree given a leaf, its depth, and the necessary sibling
// information (aka proof of membership).
// A circuit is designed without the capability to iterate through
// a dynamic array. To address this, a parameter with the static maximum
// tree depth is defined (i.e. 'MAX_DEPTH'). And additionally, the circuit
// receives a dynamic depth as an input, which is utilized in calculating the
// true root of the Merkle tree. The actual depth of the Merkle tree
// may be equal to or less than the static maximum depth.
// NOTE: This circuit will successfully verify `out = 0` for `depth > MAX_DEPTH`.
// Make sure to enforce `depth <= MAX_DEPTH` outside the circuit.
template BinaryMerkleRoot(MAX_DEPTH) {
    signal input leaf, depth, indices[MAX_DEPTH], siblings[MAX_DEPTH];

    signal output out;

    signal nodes[MAX_DEPTH + 1];
    nodes[0] <== leaf;

    signal roots[MAX_DEPTH];
    var root = 0;

    for (var i = 0; i < MAX_DEPTH; i++) {
        var isDepth = IsEqual()([depth, i]);

        roots[i] <== isDepth * nodes[i];

        root += roots[i];

        var c[2][2] = [ [nodes[i], siblings[i]], [siblings[i], nodes[i]] ];
        var childNodes[2] = MultiMux1(2)(c, indices[i]);

        nodes[i + 1] <== PoseidonHash(2)(childNodes, 0);
    }

    var isDepth = IsEqual()([depth, MAX_DEPTH]);

    out <== root + isDepth * nodes[MAX_DEPTH];
}
