pub fn binary_merkle_root<let MAX_DEPTH: u32>(
    leaf: Field,
    depth: u32,
    indices: [u1; MAX_DEPTH],
    siblings: [Field; MAX_DEPTH],
) -> Field {
    // Compute the node after applying exactly `depth` hashing steps.
    // The loop runs over N with a selector to avoid data-dependent control flow.
    let mut current = leaf;

    for i in 0..MAX_DEPTH {
        if i < depth {
            let child_nodes = if indices[i] == 0 {
                [current, siblings[i]]
            } else {
                [siblings[i], current]
            };
            current = std::hash::poseidon::bn254::hash_2(child_nodes);
        }
    }

    current
}

mod tests {
    use super::binary_merkle_root;

    unconstrained fn get_merkle_path<let MAX_DEPTH: u32>(
        leaves: [Field],
        leaf_index: u32,
    ) -> (Field, u32, [u1; MAX_DEPTH], [Field; MAX_DEPTH]) {
        let mut indices: [u1; MAX_DEPTH] = [0; MAX_DEPTH];
        let mut siblings: [Field; MAX_DEPTH] = [0; MAX_DEPTH];

        let mut nodes = leaves;
        let mut index = leaf_index;
        let mut depth: u32 = 0;

        for d in 0..MAX_DEPTH {
            // next level size: pair up nodes; if odd, last pair duplicates last node
            let mut next_level: [Field] = [];
            let mut i = 0;
            while i < (nodes.len() + 1) / 2 {
                let left = nodes[2 * i];
                let right = if 2 * i + 1 < nodes.len() { nodes[2 * i + 1] } else { left };

                let next_level_node = std::hash::poseidon::bn254::hash_2([left, right]);
                next_level = next_level.push_back(next_level_node);

                if i == index / 2 {
                    indices[d] = (index % 2) as u1;
                    siblings[d] = (if index % 2 == 0 { right } else { left });
                }

                i += 1;
            }

            depth += 1;
            nodes = next_level;
            index /= 2;

            if nodes.len() == 1 {
                break;
            }
        }

        let root = nodes[0];

        (root, depth, indices, siblings)
    }

    #[test]
    unconstrained fn test_should_calculate_merkle_root_if_depth_is_less_than_max_depth() {
        let mut leaves: [Field] = [];

        for i in 1..17 { // 16 leaves (power of two)
            leaves = leaves.push_back(Field::from(i));
        }

        let (root, depth, indices, siblings) = get_merkle_path::<134>(leaves, 5);

        let computed_root = binary_merkle_root(leaves[5], depth, indices, siblings);

        assert(computed_root == root);
    }

    #[test]
    unconstrained fn test_should_calculate_merkle_root_if_depth_is_equal_to_merkle_root() {
        let mut leaves: [Field] = [];

        for i in 1..17 { // 16 leaves
            leaves = leaves.push_back(Field::from(i));
        }

        let (root, depth, indices, siblings) = get_merkle_path::<4>(leaves, 5);

        let computed_root = binary_merkle_root(leaves[5], depth, indices, siblings);

        assert(computed_root == root);
    }

    #[test]
    unconstrained fn test_should_fail_if_depth_greater_than_max_levels() {
        let mut leaves: [Field] = [];

        for i in 1..17 { // 16 leaves => tree depth 4
            leaves = leaves.push_back(Field::from(i));
        }

        // Build correct path with depth 4
        let (root, depth, full_indices, full_siblings) = get_merkle_path::<4>(leaves, 6);

        // Truncate proof arrays to MAX_DEPTH = 3, but keep the true depth = 4
        let mut indices3: [u1; 3] = [0; 3];
        let mut siblings3: [Field; 3] = [0; 3];
        for i in 0..3 {
            indices3[i] = full_indices[i];
            siblings3[i] = full_siblings[i];
        }

        let computed_root = binary_merkle_root::<3>(leaves[6], depth, indices3, siblings3);

        assert(computed_root != root);
    }

    #[test]
    unconstrained fn test_should_fail_if_indices_or_siblings_modified() {
        let mut leaves: [Field] = [];

        for i in 1..17 { // 16 leaves
            leaves = leaves.push_back(Field::from(i));
        }

        let (root, depth, mut indices, mut siblings) = get_merkle_path::<134>(leaves, 7);

        // flip one index bit and tweak a sibling
        indices[0] = if indices[0] == 0 { 1 } else { 0 };
        siblings[0] = siblings[0] + 1;

        let computed_root = binary_merkle_root(leaves[7], depth, indices, siblings);

        assert(computed_root != root);
    }
}
