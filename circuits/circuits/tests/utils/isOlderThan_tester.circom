pragma circom  2.1.6;

include "../../utils/passport/date/isOlderThan.circom";

template isOlderThan_tester() {

    signal input majority[2];
    signal input currDate[6];
    signal input birthDateASCII[6];

    component is_older_than = IsOlderThan();
    is_older_than.majorityASCII <== majority;
    is_older_than.currDate <== currDate;
    is_older_than.birthDateASCII <== birthDateASCII;

    signal output out <== is_older_than.out;
}
component main = isOlderThan_tester();
