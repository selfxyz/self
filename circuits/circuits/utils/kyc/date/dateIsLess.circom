pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";

/// @title DateIsLess
/// @notice compares two dates
/// @param day_1 is the day of the first date
/// @param day_2 is the day of the second date
/// @param month_1 is the month of the first date
/// @param month_2 is the month of the second date
/// @param year_1 is the year of the first date
/// @param year_2 is the year of the second date
/// @output out is the result of the comparison
/// @dev output is not constrained — verifier has to handle this check

template DateIsLessFullYear() {
    signal input day_1;
    signal input day_2;

    signal input month_1;
    signal input month_2;

    signal input year_1;
    signal input year_2;

    signal output out;

    component year_less = LessThan(14);
    year_less.in[0] <== year_1;
    year_less.in[1] <== year_2;
    signal is_year_less <== year_less.out;

    component month_less = LessThan(4);
    month_less.in[0] <== month_1;
    month_less.in[1] <== month_2;
    signal is_month_less <== month_less.out;

    component day_less = LessThan(5);
    day_less.in[0] <== day_1;
    day_less.in[1] <== day_2;
    signal is_day_less <== day_less.out;

    // ----
    component year_equal = IsEqual();
    year_equal.in[0] <== year_1;
    year_equal.in[1] <== year_2;
    signal is_year_equal <== year_equal.out;

    component month_equal = IsEqual();
    month_equal.in[0] <== month_1;
    month_equal.in[1] <== month_2;
    signal is_month_equal <== month_equal.out;

    // ----
    signal is_year_equal_and_month_less <== (is_year_equal * is_month_less);
    signal is_year_equal_and_month_equal <== (is_year_equal * is_month_equal);
    signal is_year_equal_and_month_equal_and_day_less <== (is_year_equal_and_month_equal * is_day_less);

    component greater_than = GreaterThan(3);
    greater_than.in[0] <== is_year_less + is_year_equal_and_month_less + is_year_equal_and_month_equal_and_day_less;
    greater_than.in[1] <== 0;

    out <== greater_than.out;
}
