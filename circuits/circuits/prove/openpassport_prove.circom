pragma circom 2.1.9;

include "../utils/passport/customHashers.circom";
include "../utils/passport/computeCommitment.circom";
include "../utils/passport/signatureAlgorithm.circom";
include "../utils/passport/date/isValid.circom";
// include "../utils/circomlib/hasher/poseidon/poseidon.circom";
include "../utils/passport/passportVerifier.circom";
include "../disclose/disclose.circom";
include "../disclose/proveCountryIsNotInList.circom";
// include "../ofac/ofac_name.circom";

template OPENPASSPORT_PROVE(signatureAlgorithm, n, k, MAX_ECONTENT_PADDED_LEN, MAX_SIGNED_ATTR_PADDED_LEN, FORBIDDEN_COUNTRIES_LIST_LENGTH) {
    var kLengthFactor = getKLengthFactor(signatureAlgorithm);
    var kScaled = k * kLengthFactor;

    var HASH_LEN_BITS = getHashLength(signatureAlgorithm);
    var HASH_LEN_BYTES = HASH_LEN_BITS / 8;

    signal input dg1[93];
    signal input dg1_hash_offset;
    signal input dg2_hash[64];
    signal input eContent[MAX_ECONTENT_PADDED_LEN];
    signal input eContent_padded_length;
    signal input signed_attr[MAX_SIGNED_ATTR_PADDED_LEN];
    signal input signed_attr_padded_length;
    signal input signed_attr_econtent_hash_offset;
    signal input pubKey[kScaled];
    signal input signature[kScaled];
    signal input selector_mode[2];

    // ofac check
    signal input smt_leaf_value;
    signal input smt_root;
    signal input smt_siblings[256];
    signal input selector_ofac;
    // forbidden countries list
    signal input forbidden_countries_list[FORBIDDEN_COUNTRIES_LIST_LENGTH * 3];
    // disclose related inputs
    signal input selector_dg1[88];
    signal input selector_older_than;
    signal input current_date[6]; // YYMMDD - num
    signal input majority[2]; // YY - ASCII
    signal input user_identifier; 
    signal input scope;
    // registration related inputs
    signal input secret;
    signal input dsc_secret;

    signal attestation_id <== 1;

    signal selectorModeDisclosure <== selector_mode[0];
    signal selectorModePubKey <== selector_mode[1];
    signal selectorModeBlindedDscCommitment <== 1 - selector_mode[1];
    signal selectorModeCommitment <== (1- selector_mode[0]) * (1 - selector_mode[1]);
    signal isWrongSelectorMode <== IsEqual()([2*selector_mode[0] + selector_mode[1], 1]);
    isWrongSelectorMode === 0;


    // verify passport signature
    PassportVerifier(signatureAlgorithm, n, k, MAX_ECONTENT_PADDED_LEN, MAX_SIGNED_ATTR_PADDED_LEN)(dg1,dg1_hash_offset, dg2_hash, eContent,eContent_padded_length, signed_attr, signed_attr_padded_length, signed_attr_econtent_hash_offset, pubKey, signature);
    // verify passport is not expired
    component isValid = IsValid();
    isValid.currDate <== current_date;
    for (var i = 0; i < 6; i++) {
        isValid.validityDateASCII[i] <== dg1[70 + i];
    }

    // nulifier
    signal signatureHashed <== CustomHasher(kScaled)(signature);
    component poseidon_hasher = PoseidonHash(2);
    poseidon_hasher.in[0] <== signatureHashed;
    poseidon_hasher.in[1] <== scope;
    poseidon_hasher.dummy <== 0;
    signal output nullifier <== poseidon_hasher.out;

    // DISCLOSE (optional)
    // optionally disclose data
    component disclose = DISCLOSE();
    disclose.dg1 <== dg1;
    disclose.selector_dg1 <== selector_dg1;
    disclose.selector_older_than <== selector_older_than;
    disclose.current_date <== current_date;
    disclose.majority <== majority;

    signal output revealedData_packed[3];
    for (var i = 0; i < 3; i++) {
        revealedData_packed[i] <== disclose.revealedData_packed[i] * selectorModeDisclosure;
    }
    signal output older_than[2];
    for (var i = 0; i < 2; i++) {
        older_than[i] <== disclose.older_than[i] * selectorModeDisclosure;
    }
    signal output pubKey_disclosed[kScaled];
    for (var i = 0; i < kScaled; i++) {
        pubKey_disclosed[i] <== pubKey[i] * selectorModePubKey;
    }

    // COUNTRY IS IN LIST
    signal forbidden_countries_list_packed[2] <== ProveCountryIsNotInList(FORBIDDEN_COUNTRIES_LIST_LENGTH)(dg1, forbidden_countries_list);
    signal output forbidden_countries_list_packed_disclosed[2];
    for (var i = 0; i < 2; i++) {
        forbidden_countries_list_packed_disclosed[i] <== forbidden_countries_list_packed[i] * selectorModeDisclosure;
    }

    // // OFAC
    // signal ofacCheckResult <== OFAC_NAME()(dg1,smt_leaf_value,smt_root,smt_siblings);
    // signal ofacIntermediaryOutput <== ofacCheckResult * selector_ofac;
    // signal output ofac_result <== ofacIntermediaryOutput;

    // // REGISTRATION (optional)
    // // generate the commitment
    signal leaf <== LeafHasher(kScaled)(pubKey, signatureAlgorithm);
    signal commitmentPrivate <== ComputeCommitment()(secret, attestation_id, leaf, dg1, dg2_hash);
    signal output commitment <== commitmentPrivate * selectorModeCommitment;
    // // blinded dsc commitment
    signal pubkeyHash <== CustomHasher(kScaled)(pubKey);
    signal blindedDscCommitmenPrivate <== PoseidonHash(2)([dsc_secret, pubkeyHash],0);
    signal output blinded_dsc_commitment <== blindedDscCommitmenPrivate * selectorModeBlindedDscCommitment;
}
