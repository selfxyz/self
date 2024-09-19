pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "../utils/other/bytes.circom";
include "../utils/passport/date/isOlderThan.circom";
include "../utils/passport/date/isValid.circom";
include "binary-merkle-root.circom";

template DISCLOSE() {
    signal input dg1[93];
    signal input selector_dg1[88]; // 88 for MRZ
    signal input selector_older_than;
    signal input current_date[6]; // YYMMDD - num
    signal input majority[2]; // YY - ASCII
    signal output revealedData_packed[3];
    signal output older_than[2];
    signal output nullifier;

    // Verify validity of the passport
    component isValid = IsValid();
    isValid.currDate <== current_date;
    for (var i = 0; i < 6; i++) {
        isValid.validityDateASCII[i] <== dg1[70 + i];
    }
    
    1 === isValid.out;

    // Disclose optional data
    component isOlderThan = IsOlderThan();
    isOlderThan.majorityASCII <== majority;
    for (var i = 0; i < 6; i++) {
        isOlderThan.currDate[i] <== current_date[i];
        isOlderThan.birthDateASCII[i] <== dg1[62 + i];
    }

    signal older_than_verified[2];
    older_than_verified[0] <== isOlderThan.out * majority[0];
    older_than_verified[1] <== isOlderThan.out * majority[1];

    // constrain selector_dg1 to be 0s or 1s
    for (var i = 0; i < 88; i++) {
        selector_dg1[i] * (selector_dg1[i] - 1) === 0;
    }

    signal revealedData[88];
    for (var i = 0; i < 88; i++) {
        revealedData[i] <== dg1[5+i] * selector_dg1[i];
    }
    older_than[0] <== older_than_verified[0] * selector_older_than;
    older_than[1] <== older_than_verified[1] * selector_older_than;

    revealedData_packed <== PackBytes(88)(revealedData);
}