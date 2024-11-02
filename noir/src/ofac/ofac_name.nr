use crate::types::DG1;
use crate::utils::other::smt::smt_verify;

pub fn ofac_name(
    dg1: DG1,
    smt_leaf_value: Field,
    smt_root: Field,
    smt_siblings: [Field; 256],
) -> bool {
    let mut poseidon_hashes = [0; 3];

    for i in 0..3 {
        let mut input: [Field; 13] = [0; 13];
        for j in 0..13 {
            input[j] = Field::from(dg1[10 + 13 * i + j]);
        }

        poseidon_hashes[i] = std::hash::poseidon::bn254::hash_13(input);
    }

    let name_hash = std::hash::poseidon::bn254::hash_3(poseidon_hashes);

    smt_verify(name_hash, smt_leaf_value, smt_root, smt_siblings, false)
}
