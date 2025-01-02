pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "./dateIsLess.circom";

template IsOlderThan() {
    signal input majorityASCII[2];
    signal input currDate[6];
    signal input birthDateASCII[6];
    
    signal birthdateNum[6];
    signal ASCII_rotation <== 48;
    
    for (var i=0; i<6; i++) {
        birthdateNum[i] <== birthDateASCII[i] - ASCII_rotation;
    }

    signal TEN <== 10;
    signal CENTURY <== 100;

    signal currDateYear <== currDate[0] * TEN + currDate[1];
    signal birthYear <== birthdateNum[0] * TEN + birthdateNum[1];

    signal majorityNum;
    majorityNum <== ( majorityASCII[0] - 48 ) * TEN + ( majorityASCII[1] - 48 );

    component isPrevCentury = LessThan(8);

    isPrevCentury.in[0] <== currDateYear;
    isPrevCentury.in[1] <== birthYear;

    signal currDateYearNormalized <== currDateYear + isPrevCentury.out * CENTURY;

    component is_older_than = DateIsLess();

    is_older_than.firstYear  <== birthYear + majorityNum;
    is_older_than.firstMonth <== birthdateNum[2] * TEN + birthdateNum[3];
    is_older_than.firstDay   <== birthdateNum[4] * TEN + birthdateNum[5];

    is_older_than.secondYear <== currDateYearNormalized;
    is_older_than.secondMonth <== currDate[2] * TEN + currDate[3];
    is_older_than.secondDay <== currDate[4] * TEN + currDate[5];

    signal output out <== is_older_than.out;
}
