pub fn array_equal<let N: u32>(arr_1: [u8; N], arr_2: [u8; N]) -> bool {
    let mut equal = true;

    for i in 0..N {
        if (arr_1[i] != arr_2[i]) {
            equal = false;
        }
    }

    equal
}

#[test]
pub fn test_array_equal() {
    //returns true if 2 arrays are equal
    let mut result = array_equal([1, 2], [1, 2]);
    assert(result == true);

    result = array_equal([], []);
    assert(result == true);

    result = array_equal([1, 3], [1, 2]);
    assert(result == false);
}
