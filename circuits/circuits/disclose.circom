pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "@zk-email/circuits/helpers/extract.circom";
include "./utils/isOlderThan.circom";
include "./utils/isValid.circom";
include "./utils/binary-merkle-root.circom";

template Disclose(nLevels) {
    signal input secret;
    signal input attestation_id;
    signal input pubkey_leaf;
    signal input mrz[93];

    signal input merkle_root;
    signal input merkletree_size;
    signal input path[nLevels];
    signal input siblings[nLevels];

    signal input bitmap[90];
    signal input scope;
    signal input current_date[6]; // YYMMDD - num
    signal input majority[2]; // YY - ASCII
    
    signal input user_identifier; // can be address for onchain usage, any user id for offchain usage

    signal output nullifier; // Poseidon(secret, scope)
    signal output revealedData_packed[3];

    // Compute the commitment
    component poseidon_hasher = Poseidon(6);
    poseidon_hasher.inputs[0] <== secret;
    poseidon_hasher.inputs[1] <== attestation_id;
    poseidon_hasher.inputs[2] <== pubkey_leaf;
    signal mrz_packed[3] <== PackBytes(93, 3, 31)(mrz);
    for (var i = 0; i < 3; i++) {
        poseidon_hasher.inputs[i + 3] <== mrz_packed[i];
    }

    // Verify commitment inclusion
    signal computedRoot <== BinaryMerkleRoot(nLevels)(poseidon_hasher.out, merkletree_size, path, siblings);
    merkle_root === computedRoot;

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

component main { public [ merkle_root, scope, user_identifier, current_date, attestation_id] } = Disclose(16);