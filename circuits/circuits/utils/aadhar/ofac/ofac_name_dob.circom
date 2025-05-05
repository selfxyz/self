pragma circom 2.1.9;

include "circomlib/circuits/poseidon.circom";
include "../../crypto/merkle-trees/smt.circom";

template OFAC_NAME_DOB(nLevels) {
    signal input namehash;

    signal input YOB;
    signal input MOB;
    signal input DOB;

    signal input smt_leaf_key;
    signal input smt_root;
    signal input smt_siblings[nLevels];
    
    // YYMMDD
    signal name_dob_hash <== Poseidon(4)([YOB,MOB,DOB,namehash]);

    signal output ofacCheckResult <== SMTVerify(nLevels)(name_dob_hash, smt_leaf_key, smt_root, smt_siblings, 0);
}