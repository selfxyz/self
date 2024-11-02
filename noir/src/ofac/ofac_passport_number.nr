use crate::types::DG1;
use crate::utils::other::smt::smt_verify;

pub fn ofac_name(
    dg1: DG1,
    smt_leaf_value: Field,
    smt_root: Field,
    smt_siblings: [Field; 256],
) -> bool {
    let mut passport_number = [0; 9];

    for i in 0..9 {
        passport_number[i] = Field::from(dg1[49 + i]);
    }

    let passport_hash = std::hash::poseidon::bn254::hash_9(passport_number);

    smt_verify(passport_hash, smt_leaf_value, smt_root, smt_siblings, false)
}
