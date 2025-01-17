pragma circom 2.1.9;

include "../utils/passport/customHashers.circom";
include "../utils/passport/computeCommitment.circom";
include "../utils/passport/signatureAlgorithm.circom";
include "../utils/passport/date/isValid.circom";
include "circomlib/circuits/poseidon.circom";
include "../utils/passport/passportVerifier.circom";
include "../utils/passport/disclose/disclose.circom";
include "../utils/passport/disclose/proveCountryIsNotInList.circom";
include "../utils/passport/ofac/ofac_name.circom";

/// @title OPENPASSPORT_PROVE
/// @notice Main circuit to verify passport data and be used to several purposes to enable passport
/// @dev Handles passport verification, OFAC checks, selective disclosure, and commitment generation
/// @param DG_HASH_ALGO Hash algorithm used for DG (Document Group) hashing
/// @param ECONTENT_HASH_ALGO Hash algorithm used for eContent
/// @param signatureAlgorithm Algorithm used for passport signature verification
/// @param n Number of bits per chunk the key is split into.
/// @param k Number of chunks the key is split into.
/// @param MAX_ECONTENT_PADDED_LEN Maximum length of padded eContent
/// @param MAX_SIGNED_ATTR_PADDED_LEN Maximum length of padded signed attributes
/// @param FORBIDDEN_COUNTRIES_LIST_LENGTH Length of the forbidden countries list
/// @input dg1 Document Group 1 data (93 bytes)
/// @input dg1_hash_offset Offset for DG1 hash
/// @input dg2_hash Document Group 2 hash (64 bytes)
/// @input eContent eContent data
/// @input eContent_padded_length Padded length of eContent
/// @input signed_attr Signed attributes data
/// @input signed_attr_padded_length Padded length of signed attributes
/// @input signed_attr_econtent_hash_offset Offset for eContent hash in signed attributes
/// @input pubKey Public key for signature verification
/// @input signature Passport signature
/// @input selector_mode Mode selectors for different operations
/// @input smt_leaf_value SMT leaf value for OFAC check
/// @input smt_root SMT root for OFAC check
/// @input smt_siblings SMT siblings for OFAC check
/// @input selector_ofac Selector for OFAC check
/// @input forbidden_countries_list List of forbidden countries
/// @input selector_dg1 Selectors for DG1 disclosure
/// @input selector_older_than Selector for age verification
/// @input current_date Current date for age verification
/// @input majority Majority age threshold
/// @input user_identifier User identifier for commitment
/// @input scope Scope for nullifier
/// @input secret Secret for commitment generation. Supposed to be saved by the user to access this commitment.
/// @input dsc_secret One time secret data to generate the blinded commitment. This blinded dsc commitment is used to find the link between a proof from this circuit and a proof from the dsc circuit.
/// @output nullifier Generated nullifier
/// @output revealedData_packed Selectively disclosed data in the passport
/// @output older_than Age verification result
/// @output pubKey_disclosed Disclosed public key
/// @output forbidden_countries_list_packed_disclosed Packed forbidden countries list
/// @output ofac_result OFAC check result
/// @output commitment Unique commitment for the passport data and their secret
/// @output blinded_dsc_commitment To find the link between a proof from this circuit and a proof from the dsc circuit.

template OPENPASSPORT_PROVE(DG_HASH_ALGO, ECONTENT_HASH_ALGO, signatureAlgorithm, n, k, MAX_ECONTENT_PADDED_LEN, MAX_SIGNED_ATTR_PADDED_LEN, FORBIDDEN_COUNTRIES_LIST_LENGTH) {
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
    signal input smt_leaf_key;
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
    signal signedAttrShaBytes[HASH_LEN_BYTES] <== PassportVerifier(DG_HASH_ALGO, ECONTENT_HASH_ALGO, signatureAlgorithm, n, k, MAX_ECONTENT_PADDED_LEN, MAX_SIGNED_ATTR_PADDED_LEN)(dg1,dg1_hash_offset, dg2_hash, eContent,eContent_padded_length, signed_attr, signed_attr_padded_length, signed_attr_econtent_hash_offset, pubKey, signature);
    // verify passport is not expired
    component isValid = IsValid();
    isValid.currDate <== current_date;
    for (var i = 0; i < 6; i++) {
        isValid.validityDateASCII[i] <== dg1[70 + i];
    }

    // nulifier
    component passportDataHashed = CustomHasher(HASH_LEN_BYTES);
    passportDataHashed.in <== signedAttrShaBytes;
    component poseidon_hasher = Poseidon(2);
    poseidon_hasher.inputs[0] <== passportDataHashed.out;
    poseidon_hasher.inputs[1] <== scope;
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

    // OFAC
    signal ofacCheckResult <== OFAC_NAME()(dg1,smt_leaf_key,smt_root,smt_siblings);
    signal ofacIntermediaryOutput <== ofacCheckResult * selector_ofac;
    signal output ofac_result <== ofacIntermediaryOutput;

    // // REGISTRATION (optional)
    // // generate the commitment
    signal leaf <== LeafHasher(kScaled)(pubKey, signatureAlgorithm);
    signal commitmentPrivate <== ComputeCommitment()(secret, attestation_id, leaf, dg1, dg2_hash);
    signal output commitment <== commitmentPrivate * selectorModeCommitment;
    // // blinded dsc commitment
    signal pubkeyHash <== CustomHasher(kScaled)(pubKey);
    signal blindedDscCommitmenPrivate <== Poseidon(2)([dsc_secret, pubkeyHash]);
    signal output blinded_dsc_commitment <== blindedDscCommitmenPrivate * selectorModeBlindedDscCommitment;
}
