use super::binary_merkle_tree::binary_merkle_root;

fn siblings_length<let N: u32>(siblings: [Field; N]) -> u32 {
    let mut non_zero_found = 0;
    let mut total = 0;

    for i in 0..N {
        if siblings[N - 1 - i] != 0 {
            non_zero_found = 1;
        }

        total += non_zero_found;
    }

    total
}

pub fn smt_verify<let N: u32>(
    virtualValue: Field,
    value: Field,
    root: Field,
    siblings: [Field; N],
    check_inclusion: bool,
) -> bool {
    let depth = siblings_length(siblings);

    let path_in_bits = virtualValue.to_be_bits::<N>();
    let mut path: [u1; N] = [0; N];

    //move the last "depth" number of bits from path_in_bits to the starting of path
    assert(depth < N);
    for i in 0..depth {
        path[i] = path_in_bits[path_in_bits.len() - depth + i];
    }
    let leaf = std::hash::poseidon::bn254::hash_3([value, 1, 1]);

    let leaf_or_zero = if value == 0 { 0 } else { leaf };

    let computed_root = binary_merkle_root(leaf_or_zero, depth, path, siblings);
    let computed_root_is_valid = computed_root == root;

    let virtual_leaf = std::hash::poseidon::bn254::hash_3([virtualValue, 1, 1]);
    let are_leafs_valid = virtual_leaf == leaf;

    let is_mode_valid = check_inclusion == are_leafs_valid;

    is_mode_valid & computed_root_is_valid
}

#[test]
fn test_siblings_length() {
    let arr_1 = [1, 2, 3, 0, 0];

    assert(siblings_length(arr_1) == 3);

    let arr_2 = [0, 1, 2, 3, 0, 0, 0, 1, 0, 0, 0];
    assert(siblings_length(arr_2) == 8);
}
