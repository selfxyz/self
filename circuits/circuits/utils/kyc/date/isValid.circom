pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "./dateIsLess.circom";

/// @title IsValid
/// @notice Verifies if the passport is valid at the current date
/// @param currDate Current date: YYYYMMDD — number
/// @param validityDateASCII Validity date: YYYYMMDD — ASCII
/// @output out Result of the comparison
/// @dev output is constrained

template IsValidFullYear() {
    signal input current_date[8];
    signal input validity_date_ascii[8];

    signal validity_date_num[8];
    signal ASCII_rotation <== 48;

    for (var i = 0; i < 8; i++) {
        validity_date_num[i] <== validity_date_ascii[i] - ASCII_rotation;
    }

    signal TEN <== 10;
    signal CENTURY <== 100;
    signal MILLENIA <== 1000;

    signal current_date_year_millenia <== current_date[0] * MILLENIA;
    signal current_date_year_century <== current_date[1] * CENTURY;
    signal current_date_year_decade <== current_date[2] * TEN;
    signal current_date_year <== current_date_year_millenia + current_date_year_century + current_date_year_decade + current_date[3];

    signal validity_date_year_millenia <== validity_date_num[0] * MILLENIA;
    signal validity_date_year_century <== validity_date_num[1] * CENTURY;
    signal validity_date_year_decade <== validity_date_num[2] * TEN;
    signal validity_date_year <== validity_date_year_millenia + validity_date_year_century + validity_date_year_decade + validity_date_num[3];

    component is_valid = DateIsLessFullYear();
    is_valid.year_1 <== current_date_year;
    is_valid.month_1 <== current_date[4] * TEN + current_date[5];
    is_valid.day_1 <== current_date[6] * TEN + current_date[7];

    is_valid.year_2  <== validity_date_year;
    is_valid.month_2 <== validity_date_num[4] * TEN + validity_date_num[5];
    is_valid.day_2   <== validity_date_num[6] * TEN + validity_date_num[7];

    1 === is_valid.out;
}
