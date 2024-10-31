use crate::constants::ASCII_ZERO;
use crate::constants::TEN;
use crate::constants::CENTURY;

//returns if date1 is older (less than) the second date
pub fn date_is_less(
    day_1: u8,
    month_1: u8,
    year_1: u8,
    day_2: u8,
    month_2: u8,
    year_2: u8,
) -> bool {
    let year_less = year_1 < year_2;

    let month_less = month_1 < month_2;
    let day_less = day_1 < day_2;

    let year_equal = year_1 == year_2;
    let month_equal = month_1 == month_2;

    year_less | (year_equal & month_less) | (year_equal & month_equal & day_less)
}

fn to_num(num_arr: [u8; 2]) -> u8 {
    num_arr[0] * TEN + num_arr[1]
}

pub fn is_older_than(age_in_ascii: [u8; 2], curr_date: [u8; 6], birth_date_ascii: [u8; 6]) -> bool {
    let mut birth_date: [u8; 6] = [0; 6];

    for i in 0..6 {
        birth_date[i] = birth_date_ascii[i] - ASCII_ZERO;
    }

    let mut curr_date_year = to_num([curr_date[0], curr_date[1]]);
    let birth_year = to_num([birth_date[0], birth_date[1]]);
    let age = to_num([age_in_ascii[0] - ASCII_ZERO, age_in_ascii[1] - ASCII_ZERO]);

    if (curr_date_year < birth_year) {
        curr_date_year += CENTURY;
    }

    date_is_less(
        to_num([birth_date[4], birth_date[5]]),
        to_num([birth_date[2], birth_date[3]]),
        birth_year + age,
        to_num([curr_date[4], curr_date[5]]),
        to_num([curr_date[2], curr_date[3]]),
        curr_date_year,
    )
}

#[test]
fn test_date_is_less() {
    //date1 is older in terms of year
    let mut result = date_is_less(15, 10, 01, 15, 10, 02);
    assert(result == true);

    //date1 is older in terms of month
    result = date_is_less(15, 09, 02, 15, 10, 02);
    assert(result == true);

    //date1 is older in terms of day
    result = date_is_less(14, 10, 02, 15, 10, 02);
    assert(result == true);

    //date1 is younger in terms of year
    result = date_is_less(15, 09, 03, 15, 10, 02);
    assert(result == false);

    //date1 is younger in terms of month
    result = date_is_less(15, 11, 02, 15, 10, 02);
    assert(result == false);

    //date1 is younger in terms of day
    result = date_is_less(16, 10, 03, 15, 10, 02);
    assert(result == false);

    //same date
    result = date_is_less(15, 10, 03, 15, 10, 02);
    assert(result == false);
}
