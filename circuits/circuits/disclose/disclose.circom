pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "@zk-email/circuits/utils/bytes.circom";
include "../utils/isOlderThan.circom";
include "../utils/isValid.circom";
include "binary-merkle-root.circom";
include "../utils/isValid.circom";
template DISCLOSE() {
    signal input mrz[93];
    signal input bitmap[90];
    signal input current_date[6]; // YYMMDD - num
    signal input majority[2]; // YY - ASCII
    signal input user_identifier;
    signal input scope;
    signal input secret;
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


    // generate scope nullifier
    component poseidon_nullifier = Poseidon(2);
    poseidon_nullifier.inputs[0] <== secret;
    poseidon_nullifier.inputs[1] <== scope;
    nullifier <== poseidon_nullifier.out;


}

// component { public [ user_identifier, current_date] } = DISCLOSE();