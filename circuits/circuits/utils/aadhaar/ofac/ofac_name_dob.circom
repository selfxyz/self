pragma circom 2.1.9;

include "circomlib/circuits/poseidon.circom";
include "../../crypto/merkle-trees/smt.circom";

/// @title OFAC_NAME_DOB_AADHAAR
/// @notice Verify if the name-DOB is in the OFAC list
/// @param nLevels Maximum number of levels in the merkle tree
/// @input name[2] Name of the user(packed into 2 field elements)
/// @input YOB Year of birth
/// @input MOB Month of birth
/// @input DOB Day of birth
/// @input smt_leaf_key Leaf key for name-DOB SMT verification
/// @input smt_root Root of name-DOB SMT
/// @input smt_siblings Siblings for name-DOB SMT proof
/// @output ofacCheckResult Result of the OFAC check
template OFAC_NAME_DOB_AADHAAR(nLevels) {
    signal input name[2];

    signal input YOB;
    signal input MOB;
    signal input DOB;

    signal input smt_leaf_key;
    signal input smt_root;
    signal input smt_siblings[nLevels];

    signal name_dob_hash <== Poseidon(5)([name[0], name[1], YOB, MOB, DOB]);

    signal output ofacCheckResult <== SMTVerify(nLevels)(name_dob_hash, smt_leaf_key, smt_root, smt_siblings, 0);
}
