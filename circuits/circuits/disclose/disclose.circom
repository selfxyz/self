pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "../utils/other/bytes.circom";
include "../utils/passport/date/isOlderThan.circom";
include "../utils/passport/date/isValid.circom";
include "binary-merkle-root.circom";

template DISCLOSE() {
    signal input mrz[93];
    signal input bitmap[90]; // 88 for MRZ + 2 for majority
    signal input current_date[6]; // YYMMDD - num
    signal input majority[2]; // YY - ASCII
    signal output revealedData_packed[3];
    signal output nullifier;

    // Verify validity of the passport
    component isValid = IsValid();
    isValid.currDate <== current_date;
    for (var i = 0; i < 6; i++) {
        isValid.validityDateASCII[i] <== mrz[70 + i];
    }
    
    1 === isValid.out;

    // Disclose optional data
    component isOlderThan = IsOlderThan();
    isOlderThan.majorityASCII <== majority;
    for (var i = 0; i < 6; i++) {
        isOlderThan.currDate[i] <== current_date[i];
        isOlderThan.birthDateASCII[i] <== mrz[62 + i];
    }

    signal older_than[2];
    older_than[0] <== isOlderThan.out * majority[0];
    older_than[1] <== isOlderThan.out * majority[1];

    // constrain bitmap to be 0s or 1s
    for (var i = 0; i < 90; i++) {
        bitmap[i] * (bitmap[i] - 1) === 0;
    }

    signal revealedData[90];
    for (var i = 0; i < 88; i++) {
        revealedData[i] <== mrz[5+i] * bitmap[i];
    }
    revealedData[88] <== older_than[0] * bitmap[88];
    revealedData[89] <== older_than[1] * bitmap[89];
    revealedData_packed <== PackBytes(90)(revealedData);
}