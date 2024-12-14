use crate::types::DG1;
use crate::utils::array::array_equal;

pub fn country_not_in_list<let N: u32>(dg1: DG1, forbidden_countries_list: [u8; N]) -> bool {
    assert(N % 3 == 0);

    let country_code = [dg1[7], dg1[8], dg1[9]];
    let mut not_in_list = true;

    for i in 0..(N / 3) {
        let forbidden_country = [
            forbidden_countries_list[i * 3],
            forbidden_countries_list[(i * 3) + 1],
            forbidden_countries_list[(i * 3) + 2],
        ];
        let equal = array_equal(country_code, forbidden_country);

        if equal {
            not_in_list = false;
        }
    }

    not_in_list
}

#[test]
fn test_country_not_in_list() {
    let mut country = [0; 93];
    country[7] = 1;
    country[8] = 2;
    country[9] = 3;

    //country is in the list
    let forbidden_countries_list_with_country = [1, 2, 3, 4, 5, 6];

    assert(!country_not_in_list(country, forbidden_countries_list_with_country));

    //country is not in the list
    let forbidden_countries_list_without_country = [0, 1, 2, 3, 4, 5];
    assert(country_not_in_list(country, forbidden_countries_list_without_country));
}
