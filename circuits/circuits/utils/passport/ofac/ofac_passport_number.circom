pragma circom 2.1.9;

include "../../circomlib/hasher/hash.circom";
include "../../circomlib/bitify/comparators.circom";
include "../../other/binary-merkle-root/binary-merkle-root.circom";
include "../../other/getCommonLength.circom";
include "../../other/smt.circom";

template OFAC_PASSPORT_NUMBER() {

    signal input dg1[93];

    signal input smt_leaf_value;
    signal input smt_root;
    signal input smt_siblings[256];
    signal output proofLevel <== 3;

    component poseidon_hasher = PoseidonHash(9);
    for (var i = 0; i < 9; i++) {
        poseidon_hasher.in[i] <== dg1[49 + i];
    } 
    poseidon_hasher.dummy <== 0;
   signal output ofacCheckResult <== SMTVerify(256)(poseidon_hasher.out, smt_leaf_value, smt_root, smt_siblings, 0);
}
