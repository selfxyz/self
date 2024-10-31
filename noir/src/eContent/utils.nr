fn get_k_length_factor(signature_algorithm: Field) -> Field {
    let result = if (signature_algorithm == 1) {
        1
    } else if (signature_algorithm == 3) {
        1
    } else if (signature_algorithm == 4) {
        1
    } else if (signature_algorithm == 7) {
        2
    } else if (signature_algorithm == 8) {
        2
    } else if (signature_algorithm == 9) {
        2
    } else if (signature_algorithm == 10) {
        1
    } else if (signature_algorithm == 11) {
        1
    } else if (signature_algorithm == 12) {
        1
    } else {
        0
    };
    result
}

fn get_hash_length(signature_algorithm: Field) -> Field {
    let result = if (signature_algorithm == 1) {
        256
    } else if (signature_algorithm == 3) {
        160
    } else if (signature_algorithm == 4) {
        256
    } else if (signature_algorithm == 7) {
        160
    } else if (signature_algorithm == 8) {
        256
    } else if (signature_algorithm == 9) {
        384
    } else if (signature_algorithm == 10) {
        256
    } else if (signature_algorithm == 11) {
        160
    } else if (signature_algorithm == 12) {
        256
    } else {
        0
    };
    result
}

mod tests {
    use super::get_k_length_factor;

    #[test]
    fn test_get_k_length_factor() {
        assert_eq(get_k_length_factor(1), 1);
        assert_eq(get_k_length_factor(3), 1);
        assert_eq(get_k_length_factor(4), 1);
        assert_eq(get_k_length_factor(10), 1);
        assert_eq(get_k_length_factor(11), 1);
        assert_eq(get_k_length_factor(12), 1);
        assert_eq(get_k_length_factor(7), 2);
        assert_eq(get_k_length_factor(8), 2);
        assert_eq(get_k_length_factor(9), 2);
        assert_eq(get_k_length_factor(0), 0);
    }
}
