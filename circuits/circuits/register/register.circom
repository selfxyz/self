pragma circom 2.1.9;

include "../utils/passport/customHashers.circom";
include "../utils/passport/signatureAlgorithm.circom";
include "../utils/passport/date/isValid.circom";
include "circomlib/circuits/poseidon.circom";
include "../utils/passport/passportVerifier.circom";
include "../utils/passport/disclose/disclose.circom";
include "../utils/passport/disclose/proveCountryIsNotInList.circom";
include "../utils/passport/ofac/ofac_name.circom";
include "../utils/passport/constants.circom";
include "../utils/crypto/bitify/splitWordsToBytes.circom";

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
    signal input eContent[MAX_ECONTENT_PADDED_LEN];
    signal input eContent_padded_length;
    signal input signed_attr[MAX_SIGNED_ATTR_PADDED_LEN];
    signal input signed_attr_padded_length;
    signal input signed_attr_econtent_hash_offset;
    signal input pubKey_dsc[kScaled];
    signal input signature_passport[kScaled];

    signal input pubKey_csca_hash;
    
    signal input secret;
    signal input salt;

    signal attestation_id <== 1;

    // verify passport signature
    component passportVerifier = PassportVerifier(DG_HASH_ALGO, ECONTENT_HASH_ALGO, signatureAlgorithm, n, k, MAX_ECONTENT_PADDED_LEN, MAX_SIGNED_ATTR_PADDED_LEN);
    passportVerifier.dg1 <== dg1;
    passportVerifier.dg1_hash_offset <== dg1_hash_offset;
    passportVerifier.eContent <== eContent;
    passportVerifier.eContent_padded_length <== eContent_padded_length;
    passportVerifier.signed_attr <== signed_attr;
    passportVerifier.signed_attr_padded_length <== signed_attr_padded_length;
    passportVerifier.signed_attr_econtent_hash_offset <== signed_attr_econtent_hash_offset;
    passportVerifier.pubKey_dsc <== pubKey_dsc;
    passportVerifier.signature_passport <== signature_passport;

    signal eContent_shaBytes[ECONTENT_HASH_ALGO / 8] <== passportVerifier.eContentShaBytes;
    component customHasher = CustomHasher(ECONTENT_HASH_ALGO / 8);
    customHasher.in <== eContent_shaBytes;
    signal eContent_shaBytes_hash <== customHasher.out;

    // nulifier
    component customHasher2 = CustomHasher(HASH_LEN_BYTES);
    customHasher2.in <== passportVerifier.signedAttrShaBytes;
    signal output nullifier <== customHasher2.out;

    // // generate the commitment
    signal dg1_packed[3] <== PackBytes(93)(dg1);
    signal dg1_packed_hash <== Poseidon(3)(dg1_packed);

    component customHasher3 = CustomHasher(kScaled);
    customHasher3.in <== pubKey_dsc;
    signal pubKeyDscHashForCommitment <== customHasher3.out;
    signal output commitment <== Poseidon(6)([secret, attestation_id, dg1_packed_hash, eContent_shaBytes_hash, pubKeyDscHashForCommitment,pubKey_csca_hash]);
    
    // glue to link with DSC proof
    var maxDscPubKeyLength = getMaxDscPubKeyLength();
    signal pubKeyPaddedForGlue[525] <== WordsToBytesPadded(n, kScaled, n * kScaled / 8, 525)(pubKey_dsc);
    var pubKeyPaddedForGlue_packed_length = computeIntChunkLength(525);
    signal pubKeyPaddedForGlue_packed[pubKeyPaddedForGlue_packed_length] <== PackBytes(525)(pubKeyPaddedForGlue);
    component customHasher4 = CustomHasher(pubKeyPaddedForGlue_packed_length);
    customHasher4.in <== pubKeyPaddedForGlue_packed;
    signal pubKeyHashForGlue <== customHasher4.out;
    signal output glue <== Poseidon(3)([salt, pubKeyHashForGlue, pubKey_csca_hash]);
}