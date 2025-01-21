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

/// @title REGISTER
/// @notice Main circuit to verify passport data and be used to several purposes to enable passport
/// @dev Handles passport verification, OFAC checks, selective disclosure, and commitment generation
/// @param DG_HASH_ALGO Hash algorithm used for DG (Document Group) hashing
/// @param ECONTENT_HASH_ALGO Hash algorithm used for eContent
/// @param signatureAlgorithm Algorithm used for passport signature verification
/// @param n Number of bits per chunk the key is split into.
/// @param k Number of chunks the key is split into.
/// @param MAX_ECONTENT_PADDED_LEN Maximum length of padded eContent
/// @param MAX_SIGNED_ATTR_PADDED_LEN Maximum length of padded signed attributes
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
/// @input user_identifier User identifier for commitment
/// @input secret Secret for commitment generation. Supposed to be saved by the user to access this commitment.
/// @input dsc_secret One time secret data to generate the blinded commitment. This blinded dsc commitment is used to find the link between a proof from this circuit and a proof from the dsc circuit.
/// @output nullifier Generated nullifier
/// @output commitment Unique commitment for the passport data and their secret
/// @output blinded_dsc_commitment To find the link between a proof from this circuit and a proof from the dsc circuit.

template REGISTER(DG_HASH_ALGO, ECONTENT_HASH_ALGO, signatureAlgorithm, n, k, MAX_ECONTENT_PADDED_LEN, MAX_SIGNED_ATTR_PADDED_LEN) {
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
    
    signal input secret;
    signal input dsc_secret;

    signal attestation_id <== 1;

    // verify passport signature
    signal signedAttrShaBytes[HASH_LEN_BYTES] <== PassportVerifier(DG_HASH_ALGO, ECONTENT_HASH_ALGO, signatureAlgorithm, n, k, MAX_ECONTENT_PADDED_LEN, MAX_SIGNED_ATTR_PADDED_LEN)(dg1,dg1_hash_offset, dg2_hash, eContent,eContent_padded_length, signed_attr, signed_attr_padded_length, signed_attr_econtent_hash_offset, pubKey, signature);

    // nulifier
    component passportDataHashed = CustomHasher(HASH_LEN_BYTES);
    passportDataHashed.in <== signedAttrShaBytes;
    signal output nullifier <== passportDataHashed.out;

    // // REGISTRATION (optional)
    // // generate the commitment
    signal leaf <== LeafHasher(kScaled)(pubKey, signatureAlgorithm);
    signal output commitment <== ComputeCommitment()(secret, attestation_id, leaf, dg1, dg2_hash);

    // blinded dsc commitment
    signal pubkeyHash <== CustomHasher(kScaled)(pubKey);
    signal output blinded_dsc_commitment <== Poseidon(2)([dsc_secret, pubkeyHash]);
}
