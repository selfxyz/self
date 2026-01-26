pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";
include "@openpassport/zk-email-circuits/utils/array.circom";
include "./dateIsLessSeconds.circom";

template IsValidAscii() {
    signal input ascii_byte;
    signal output digit;

    // lower bound
    component ge_zero = GreaterEqThan(8);
    ge_zero.in[0] <== ascii_byte;
    ge_zero.in[1] <== 48;
    ge_zero.out === 1;

    // upper bound
    component le_nine = LessEqThan(8);
    le_nine.in[0] <== ascii_byte;
    le_nine.in[1] <== 57;
    le_nine.out === 1;

    digit <== ascii_byte - 48;

    // constrain digit < 10 to avoid overflow
    component lt_ten = LessThan(4);
    lt_ten.in[0] <== digit;
    lt_ten.in[1] <== 10;
    lt_ten.out === 1;
}

/// @title ValidityChecker
/// @notice Verifies certificate validity using UTCTime notBefore/notAfter fields
/// @dev Assumptions and layout (hardcoded, rejects GeneralizedTime):
/// - Expects SEQUENCE header: 0x30, length 0x1E at `validity_offset`
/// - notBefore: tag 0x17, length 0x0d, 12 ASCII digits YYMMDDHHMMSS, trailing 'Z'
/// - notAfter:  tag 0x17, length 0x0d, 12 ASCII digits YYMMDDHHMMSS, trailing 'Z'
/// - `validity_offset` points to the 0x30; a full 32-byte window is accessed up to
///   `validity_offset + 31` (inclusive)
/// - Dates are compared with `DateIsLessSeconds`; inputs are assumed to be well-formed
///   aside from ASCII digit checks performed in-circuit.
template ValidityChecker(MAX_CERT_LENGTH) {
    signal input cert[MAX_CERT_LENGTH];
    signal input cert_padded_length;
    signal input validity_offset;
    signal input current_date[12]; // YYMMDDHHMMSS digits

    // ensure provided padded length does not exceed the configured maximum
    component cert_length_check = LessEqThan(log2Ceil(MAX_CERT_LENGTH));
    cert_length_check.in[0] <== cert_padded_length;
    cert_length_check.in[1] <== MAX_CERT_LENGTH;
    cert_length_check.out === 1;

    component validity_bounds_check = LessEqThan(log2Ceil(MAX_CERT_LENGTH));
    validity_bounds_check.in[0] <== validity_offset + 1 + 2 + 13 + 2 + 13; //validity offset itself is included in the check so + 1 and not +2
    validity_bounds_check.in[1] <== cert_padded_length;
    validity_bounds_check.out === 1;

    signal validity_offset_prefix_1 <== ItemAtIndex(MAX_CERT_LENGTH)(cert, validity_offset);
    validity_offset_prefix_1 === 0x30;
    signal validity_offset_prefix_2 <== ItemAtIndex(MAX_CERT_LENGTH)(cert, validity_offset + 1);
    validity_offset_prefix_2 === 0x1E;

    //not before prefix
    signal not_before_prefix_1 <== ItemAtIndex(MAX_CERT_LENGTH)(cert, validity_offset + 2);
    not_before_prefix_1 === 0x17; //UTC Time + until 2048 I think? Should be safe to assume it's 2000 later in the code. Does not support generalized time
    signal not_before_prefix_2 <== ItemAtIndex(MAX_CERT_LENGTH)(cert, validity_offset + 3);
    not_before_prefix_2 === 0x0D; //13 decimal digits

    signal not_before_offset <== validity_offset + 4;

    signal not_before_digits_bytes[12];
    signal not_before_digits[12];
    for (var i = 0; i < 12; i++) {
        not_before_digits_bytes[i] <== ItemAtIndex(MAX_CERT_LENGTH)(cert, not_before_offset + i);
        not_before_digits[i] <== IsValidAscii()(not_before_digits_bytes[i]);
    }

    signal not_before_suffix_1 <== ItemAtIndex(MAX_CERT_LENGTH)(cert, not_before_offset + 12);
    not_before_suffix_1 === 0x5A; //Z means UTC time

    //not after prefix
    signal not_after_prefix_1 <== ItemAtIndex(MAX_CERT_LENGTH)(cert, not_before_offset + 12 + 1);
    not_after_prefix_1 === 0x17;
    signal not_after_prefix_2 <== ItemAtIndex(MAX_CERT_LENGTH)(cert, not_before_offset + 12 + 2);
    not_after_prefix_2 === 0x0d;

    signal not_after_offset <== not_before_offset + 12 + 3;

    signal not_after_digits_bytes[12];
    signal not_after_digits[12];
    for (var i = 0; i < 12; i++) {
        not_after_digits_bytes[i] <== ItemAtIndex(MAX_CERT_LENGTH)(cert, not_after_offset + i);
        not_after_digits[i] <== IsValidAscii()(not_after_digits_bytes[i]);
    }

    signal not_after_suffix_1 <== ItemAtIndex(MAX_CERT_LENGTH)(cert, not_after_offset + 12);
    not_after_suffix_1 === 0x5A;

    signal current_date_year <== 2000 + current_date[0] * 10 + current_date[1];
    signal current_date_month <== current_date[2] * 10 + current_date[3];
    signal current_date_day <== current_date[4] * 10 + current_date[5];
    signal current_date_hour <== current_date[6] * 10 + current_date[7];
    signal current_date_minute <== current_date[8] * 10 + current_date[9];
    signal current_date_second <== current_date[10] * 10 + current_date[11];

    signal not_before_year <== 2000 + not_before_digits[0] * 10 + not_before_digits[1];
    signal not_before_year_valid <== LessThan(12)([not_before_year, 2050]);
    not_before_year_valid === 1;
    signal not_before_month <== not_before_digits[2] * 10 + not_before_digits[3];
    signal not_before_month_valid <== LessThan(8)([not_before_month, 13]);
    not_before_month_valid === 1;
    signal not_before_day <== not_before_digits[4] * 10 + not_before_digits[5];
    signal not_before_day_valid <== LessThan(8)([not_before_day, 32]);
    not_before_day_valid === 1;
    signal not_before_hour <== not_before_digits[6] * 10 + not_before_digits[7];
    signal not_before_hour_valid <== LessThan(8)([not_before_hour, 24]);
    not_before_hour_valid === 1;
    signal not_before_minute <== not_before_digits[8] * 10 + not_before_digits[9];
    signal not_before_minute_valid <== LessThan(8)([not_before_minute, 60]);
    not_before_minute_valid === 1;
    signal not_before_second <== not_before_digits[10] * 10 + not_before_digits[11];
    signal not_before_second_valid <== LessThan(8)([not_before_second, 60]);
    not_before_second_valid === 1;

    signal not_after_year <== 2000 + not_after_digits[0] * 10 + not_after_digits[1];
    signal not_after_year_valid <== LessThan(12)([not_after_year, 2050]);
    not_after_year_valid === 1;
    signal not_after_month <== not_after_digits[2] * 10 + not_after_digits[3];
    signal not_after_month_valid <== LessThan(8)([not_after_month, 13]);
    not_after_month_valid === 1;
    signal not_after_day <== not_after_digits[4] * 10 + not_after_digits[5];
    signal not_after_day_valid <== LessThan(8)([not_after_day, 32]);
    not_after_day_valid === 1;
    signal not_after_hour <== not_after_digits[6] * 10 + not_after_digits[7];
    signal not_after_hour_valid <== LessThan(8)([not_after_hour, 24]);
    not_after_hour_valid === 1;
    signal not_after_minute <== not_after_digits[8] * 10 + not_after_digits[9];
    signal not_after_minute_valid <== LessThan(8)([not_after_minute, 60]);
    not_after_minute_valid === 1;
    signal not_after_second <== not_after_digits[10] * 10 + not_after_digits[11];
    signal not_after_second_valid <== LessThan(8)([not_after_second, 60]);
    not_after_second_valid === 1;

    component not_before_check = DateIsLessSeconds();
    not_before_check.firstYear <== not_before_year;
    not_before_check.firstMonth <== not_before_month;
    not_before_check.firstDay <== not_before_day;
    not_before_check.firstHour <== not_before_hour;
    not_before_check.firstMinute <== not_before_minute;
    not_before_check.firstSecond <== not_before_second;

    not_before_check.secondYear <== current_date_year;
    not_before_check.secondMonth <== current_date_month;
    not_before_check.secondDay <== current_date_day;
    not_before_check.secondHour <== current_date_hour;
    not_before_check.secondMinute <== current_date_minute;
    not_before_check.secondSecond <== current_date_second;

    not_before_check.out === 1;

    component not_after_check = DateIsLessSeconds();
    not_after_check.firstYear <== current_date_year;
    not_after_check.firstMonth <== current_date_month;
    not_after_check.firstDay <== current_date_day;
    not_after_check.firstHour <== current_date_hour;
    not_after_check.firstMinute <== current_date_minute;
    not_after_check.firstSecond <== current_date_second;

    not_after_check.secondYear <== not_after_year;
    not_after_check.secondMonth <== not_after_month;
    not_after_check.secondDay <== not_after_day;
    not_after_check.secondHour <== not_after_hour;
    not_after_check.secondMinute <== not_after_minute;
    not_after_check.secondSecond <== not_after_second;

    not_after_check.out === 1;
}
