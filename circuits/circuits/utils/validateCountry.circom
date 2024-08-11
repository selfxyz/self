pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "smt.circom";

template ValidateCountry(nLevels) {
    signal input host_user[6]; // Pair of (user country followed by host's country)
    signal input closest_leaf;
    signal input smt_root;
    signal input smt_siblings[256];


    // Country hash aka key
    component poseidon_hasher = Poseidon(6);
    for (var i = 0; i < 6; i++) {
        poseidon_hasher.inputs[i] <== host_user[i];
    }

    // SMT Verification
    signal closestleaf <== SMTVerify(nLevels)(poseidon_hasher.out, 1, closest_leaf, smt_root, smt_siblings);
    signal smtleaf_hash <== Poseidon(3)([poseidon_hasher.out, 1,1]);

    signal proofType <== IsEqual()([closestleaf,smtleaf_hash]); 
    proofType === 0;  // Uncomment this line to make circuit handle both membership and non-membership proof and returns the type of proof (0 for non-membership, 1 for membership)

}
