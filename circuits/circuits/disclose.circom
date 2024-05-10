pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "@zk-email/circuits/helpers/extract.circom";
include "./utils/isOlderThan.circom";
include "./utils/isValid.circom";
include "./utils/binary-merkle-root.circom";

template Disclose(nLevels) {
    signal input secret;
    signal input commitment; // H (secret, mrz) - num
    signal input mrz[93];
    signal input merkle_root;
    signal input merkletree_size;
    signal input path[nLevels];
    signal input siblings[nLevels];
    signal input bitmap[90];
    signal input scope;
    signal input current_date[6]; // YYMMDD - num
    signal input majority[2]; // YY - ASCII
    signal input address;

    //signal output validity; // 0 or 1
    signal output nullifier; // Poseidon(secret, scope) - num
    signal output revealedData_packed[3];

    // Verify the commitment
    component poseidon_hasheur = Poseidon(4);
    poseidon_hasheur.inputs[0] <== secret;
    signal mrz_packed[3] <== PackBytes(93, 3, 31)(mrz);
    for (var i = 0; i < 3; i++) {
        poseidon_hasheur.inputs[i + 1] <== mrz_packed[i];
    }
    commitment === poseidon_hasheur.out;

    // Verify the proof inclusion of the commitment
    // signal computedRoot <== MerkleTreeInclusionProof(nLevels)(commitment, path, siblings);
    // merkle_root === computedRoot;
    signal computedRoot <== BinaryMerkleRoot(nLevels)(commitment, merkletree_size, path, siblings);
    merkle_root === computedRoot;

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

    // Verify validity of the passport
    component isValid = IsValid();
    isValid.currDate <== current_date;
    for (var i = 0; i < 6; i++) {
        isValid.validityDateASCII[i] <== mrz[70 + i];
    }
    1 === isValid.out;
    signal revealedData[90];
    for (var i = 0; i < 88; i++) {
        revealedData[i] <== mrz[5+i] * bitmap[i];
    }
    revealedData[88] <== older_than[0] * bitmap[88];
    revealedData[89] <== older_than[1] * bitmap[89];
    revealedData_packed <== PackBytes(90, 3, 31)(revealedData);

    // Generate scope nullifier
    component poseidon_nullifier = Poseidon(2);

    poseidon_nullifier.inputs[0] <== secret;
    poseidon_nullifier.inputs[1] <== scope;
    nullifier <== poseidon_nullifier.out;
}

component main { public [ merkle_root, scope, address, current_date] } = Disclose(16);