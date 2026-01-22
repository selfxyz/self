pragma circom 2.1.9;

include "circomlib/circuits/poseidon.circom";
include "../../../crypto/merkle-trees/smt.circom";
include "../../../passport/customHashers.circom";
include "../../constants.circom";

template OFAC_NAME_DOB_KYC(n_levels) {
    var max_length = KYC_MAX_LENGTH();
    signal input data_padded[max_length];

    signal input smt_leaf_key;
    signal input smt_root;
    signal input smt_siblings[n_levels];

    var name_length = FULL_NAME_LENGTH();
    var name_index = FULL_NAME_INDEX();
    //name hash
    component name_hash = PackBytesAndPoseidon(name_length);
    for (var i = name_index; i < name_index + name_length; i++) {
        name_hash.in[i - name_index] <== data_padded[i];
    }

    var dob_length = DOB_LENGTH();
    var dob_index = DOB_INDEX();
    // Dob hash
    component dob_hash = Poseidon(dob_length);

    for(var i = 0; i < dob_length; i++) {
        dob_hash.inputs[i] <== data_padded[dob_index + i];
    }

    // NameDob hash
    signal name_dob_hash <== Poseidon(2)([dob_hash.out, name_hash.out]);

    signal output ofacCheckResult <== SMTVerify(n_levels)(name_dob_hash, smt_leaf_key, smt_root, smt_siblings, 0);
}
