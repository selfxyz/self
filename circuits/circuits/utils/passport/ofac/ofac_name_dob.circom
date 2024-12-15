pragma circom 2.1.9;

include "../../circomlib/hasher/hash.circom";
include "../../circomlib/bitify/comparators.circom";
include "../../other/binary-merkle-root/binary-merkle-root.circom";
include "../../other/getCommonLength.circom";
include "../../other/smt.circom";

template OFAC_NAME_DOB() {

    signal input dg1[93];

    signal input smt_leaf_value;
    signal input smt_root;
    signal input smt_siblings[256];
    // Name Hash
    component poseidon_hasher[3];
    for (var j = 0; j < 3; j++) {
        poseidon_hasher[j] = PoseidonHash(13);
        for (var i = 0; i < 13; i++) {
            poseidon_hasher[j].in[i] <== dg1[10 + 13 * j + i];
        }
        poseidon_hasher[j].dummy <== 0;
    }
    signal name_hash <== PoseidonHash(3)([poseidon_hasher[0].out, poseidon_hasher[1].out, poseidon_hasher[2].out], 0);

    // Dob hash
    component pos_dob = PoseidonHash(6);
    for(var i = 0; i < 6; i++) {
        pos_dob.in[i] <== dg1[62 + i];
    }

    pos_dob.dummy <== 0;
    
    // NameDob hash
    signal name_dob_hash <== PoseidonHash(2)([pos_dob.out, name_hash], 0);

    signal output ofacCheckResult <== SMTVerify(256)(name_dob_hash, smt_leaf_value, smt_root, smt_siblings, 0);
}