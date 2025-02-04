pub fn binary_merkle_root<let N: u32>(
    leaf: Field,
    depth: u32,
    indices: [u1; N],
    siblings: [Field; N],
) -> Field {
    let mut nodes: [Field; N + 1] = [0; N + 1];
    nodes[0] = leaf;

    let mut root = 0;

    for i in 0..N {
        let isDepth = if i == depth { 1 } else { 0 };

        root += isDepth * nodes[i];

        let child_nodes = if indices[i] == 0 {
            [nodes[i], siblings[i]]
        } else {
            [siblings[i], nodes[i]]
        };

        nodes[i + 1] = std::hash::poseidon::bn254::hash_2(child_nodes);
    }

    let isDepth = if N == depth { 1 } else { 0 };
    root += isDepth * nodes[N];

    root
}

mod tests {
    use super::binary_merkle_root;

    unconstrained fn get_merkle_path<let N: u32>(
        leaves: [Field],
        leaf_index: u32,
    ) -> (Field, [u1; N], [Field; N]) {
        let mut indices: [u1; N] = [0; N];
        let mut siblings: [Field; N] = [0; N];

        let mut nodes = leaves;
        let mut index = leaf_index;

        for depth in 0..N {
            let next_level_len = nodes.len() / 2;
            let mut next_level: [Field] = [];

            for i in 0..next_level_len {
                let left = nodes[2 * i];
                let right = nodes[2 * i + 1];

                let next_level_node = std::hash::poseidon::bn254::hash_2([left, right]);
                next_level = next_level.push_back(next_level_node);

                if i == index / 2 {
                    indices[depth] = (index % 2) as u1;
                    siblings[depth] = (if index % 2 == 0 { right } else { left });
                }
            }

            nodes = next_level;
            index /= 2;

            if next_level_len == 1 {
                break;
            }
        }

        let root = nodes[0];

        (root, indices, siblings)
    }

    #[test]
    unconstrained fn test_should_calculate_merkle_root_if_depth_is_less_than_max_depth() {
        let mut leaves: [Field] = [];

        for i in 1..16 {
            leaves = leaves.push_back(Field::from(i));
        }

        let (root, indices, siblings) = get_merkle_path::<134>(leaves, 5);

        let computed_root = binary_merkle_root(leaves[5], 3, indices, siblings);

        assert(computed_root == root);
    }

    #[test]
    unconstrained fn test_should_calculate_merkle_root_if_depth_is_equal_to_merkle_root() {
        let mut leaves: [Field] = [];

        for i in 1..16 {
            leaves = leaves.push_back(Field::from(i));
        }

        let (root, indices, siblings) = get_merkle_path::<4>(leaves, 5);

        let computed_root = binary_merkle_root(leaves[5], 3, indices, siblings);

        assert(computed_root == root);
    }

}
