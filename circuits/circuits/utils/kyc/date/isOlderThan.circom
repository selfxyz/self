pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "./dateIsLess.circom";

/// @title IsOlderThan
/// @notice Verifies if user is older than the majority at the current date
/// @param majorityASCII Majority user wants to prove he is older than: YYY — ASCII
/// @param currDate Current date: YYYYMMDD — number
/// @param birthDateASCII Birthdate: YYYYMMDD — ASCII
/// @output out Result of the comparison
/// @dev output is not constrained — verifier has to handle this check

template IsOlderThan() {
    signal input majorityASCII[3];
    signal input currDate[8];
    signal input birthDateASCII[8];

    signal birthdateNum[8];
    signal ASCII_rotation <== 48;

    for (var i=0; i<8; i++) {
        birthdateNum[i] <== birthDateASCII[i] - ASCII_rotation;
    }

    signal TEN <== 10;
    signal CENTURY <== 100;
    signal MILLENIA <== 1000;

    signal currDateMillenia <== currDate[0] * MILLENIA;
    signal currDateCentury <== currDate[1] * CENTURY;
    signal currDateDecade <== currDate[2] * TEN;
    signal currDateYear <== currDateMillenia + currDateCentury + currDateDecade + currDate[3];

    signal birthDateMillenia <== birthdateNum[0] * MILLENIA;
    signal birthDateCentury <== birthdateNum[1] * CENTURY;
    signal birthDateDecade <== birthdateNum[2] * TEN;
    signal birthDateYear <== birthDateMillenia + birthDateCentury + birthDateDecade + birthdateNum[3];

    // assert majority is between 0 and 999 (48-57 in ASCII)
    component lessThan[6];
    component range_check_majority[3];
    for (var i = 0; i < 6; i++) {
        lessThan[i] = LessThan(6);
    }
    for (var i = 0; i < 3; i++) {
        range_check_majority[i] = Num2Bits(6);
        range_check_majority[i].in <== majorityASCII[i];
    }
    lessThan[0].in[0] <== 47;
    lessThan[0].in[1] <== majorityASCII[0];
    lessThan[1].in[0] <== 47;
    lessThan[1].in[1] <== majorityASCII[1];
    lessThan[2].in[0] <== 47;
    lessThan[2].in[1] <== majorityASCII[2];

    lessThan[3].in[0] <== majorityASCII[0];
    lessThan[3].in[1] <== 58;
    lessThan[4].in[0] <== majorityASCII[1];
    lessThan[4].in[1] <== 58;
    lessThan[5].in[0] <== majorityASCII[2];
    lessThan[5].in[1] <== 58;

    signal checkLessThan[6];
    checkLessThan[0] <== lessThan[0].out;
    for (var i = 1; i < 6; i++) {
        checkLessThan[i] <== checkLessThan[i-1] * lessThan[i].out;
    }
    checkLessThan[5] === 1;

    signal majorityNumCentury <== ( majorityASCII[0] - 48 ) * CENTURY;
    signal majorityNumDecade <== ( majorityASCII[1] - 48 ) * TEN;
    signal majorityNum <== majorityNumCentury + majorityNumDecade + ( majorityASCII[2] - 48 );

    component is_older_than = DateIsLessFullYear();

    is_older_than.year_1 <== birthDateYear + majorityNum;
    is_older_than.month_1 <== birthdateNum[4] * TEN + birthdateNum[5];
    is_older_than.day_1   <== birthdateNum[6] * TEN + birthdateNum[7];

    is_older_than.year_2 <== currDateYear;
    is_older_than.month_2 <== currDate[4] * TEN + currDate[5];
    is_older_than.day_2 <== currDate[6] * TEN + currDate[7];

    signal output out <== is_older_than.out;
}
