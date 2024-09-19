pragma circom 2.1.6;

include "../utils/passport/customHashers.circom";
include "../utils/passport/computeCommitment.circom";
include "../utils/passport/signatureAlgorithm.circom";
include "../utils/passport/passportVerifier.circom";
include "../disclose/disclose.circom";

template OPENPASSPORT_PROVE(signatureAlgorithm, n, k, MAX_ECONTENT_PADDED_LEN, MAX_SIGNED_ATTR_PADDED_LEN) {
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
    signal input signature[kScaled];
    signal input pubKey[kScaled];

    // dislose related inputs
    signal input bitmap[90];
    signal input current_date[6]; // YYMMDD - num
    signal input majority[2]; // YY - ASCII
    signal input user_identifier; 
    signal input scope;


    signal output nullifier <== CustomHasher(kScaled)(signature); // generate nullifier

    // verify passport signature
    PassportVerifier(signatureAlgorithm, n, k, MAX_ECONTENT_PADDED_LEN, MAX_SIGNED_ATTR_PADDED_LEN)(dg1,dg1_hash_offset, dg2_hash, eContent,eContent_padded_length, signed_attr, signed_attr_padded_length, signed_attr_econtent_hash_offset, pubKey, signature);

    // optionally disclose data
    component disclose = DISCLOSE();
    disclose.dg1 <== dg1;
    disclose.bitmap <== bitmap;
    disclose.current_date <== current_date;
    disclose.majority <== majority;

    signal output revealedData_packed[3] <== disclose.revealedData_packed;
    
}