pragma circom 2.1.9;

include "circomlib/circuits/poseidon.circom";

template AgeComperator(){
    signal input majority[2];
    signal input age;

    signal output out;

    component lessThan[4];
    for (var i = 0; i < 4; i++) {
        lessThan[i] = LessThan(8);
    }
    lessThan[0].in[0] <== 47;
    lessThan[0].in[1] <== majority[0];
    lessThan[1].in[0] <== 47;
    lessThan[1].in[1] <== majority[1];
    lessThan[2].in[0] <== majority[0];
    lessThan[2].in[1] <== 58;
    lessThan[3].in[0] <== majority[1];
    lessThan[3].in[1] <== 58;

    signal checkLessThan[4];
    checkLessThan[0] <== lessThan[0].out;
    for (var i = 1; i < 4; i++) {
        checkLessThan[i] <== checkLessThan[i-1] * lessThan[i].out;
    }
    checkLessThan[3] === 1;

    signal TEN <== 10;
    signal majorityNum <== ( majority[0] - 48 ) * TEN + ( majority[1] - 48 );

    component AgeCheck = GreaterEqThan(8);
    AgeCheck.in[0] <== age;
    AgeCheck.in[1] <== majorityNum;
}