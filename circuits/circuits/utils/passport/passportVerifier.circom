pragma circom 2.1.9;

include "../other/array.circom";
include "../other/bytes.circom";
include "../shaBytes/shaBytesStatic.circom";
include "../shaBytes/shaBytesDynamic.circom";
include "./signatureAlgorithm.circom";
include "./signatureVerifier.circom";

template PassportVerifier(signatureAlgorithm, n, k, MAX_ECONTENT_LEN, MAX_SIGNED_ATTR_LEN) {
    var kLengthFactor = getKLengthFactor(signatureAlgorithm);
    var kScaled = k * kLengthFactor;

    var HASH_LEN_BITS = getHashLength(signatureAlgorithm);
    var HASH_LEN_BYTES = HASH_LEN_BITS / 8;

    signal input dg1[93];
    signal input dg1_hash_offset;
    signal input dg2_hash[64];
    signal input eContent[MAX_ECONTENT_LEN];
    signal input eContent_padded_length;
    signal input signed_attr[MAX_SIGNED_ATTR_LEN];
    signal input signed_attr_padded_length;
    signal input signed_attr_econtent_hash_offset;
    signal input pubKey[kScaled];
    signal input signature[kScaled];

    // compute hash of DG1
    signal dg1Sha[HASH_LEN_BITS] <== ShaBytesStatic(HASH_LEN_BITS, 93)(dg1);

    component dg1ShaBytes[HASH_LEN_BYTES];
    for (var i = 0; i < HASH_LEN_BYTES; i++) {
        dg1ShaBytes[i] = Bits2Num(8);
        for (var j = 0; j < 8; j++) {
            dg1ShaBytes[i].in[7 - j] <== dg1Sha[i * 8 + j];
        }
    }

    // assert DG1 and DG2 hashes match the ones in eContent input
    signal dg1AndDg2Hash[2 * HASH_LEN_BYTES] <== VarShiftLeft(MAX_ECONTENT_LEN, 2 * HASH_LEN_BYTES)(eContent, dg1_hash_offset);
    for(var i = 0; i < HASH_LEN_BYTES; i++) {
        dg1AndDg2Hash[i] === dg1ShaBytes[i].out;
        dg1AndDg2Hash[i + HASH_LEN_BYTES] === dg2_hash[i];
    }

    // compute hash of eContent
    signal eContentSha[HASH_LEN_BITS] <== ShaBytesDynamic(HASH_LEN_BITS,MAX_ECONTENT_LEN)(eContent, eContent_padded_length);
    component eContentShaBytes[HASH_LEN_BYTES];
    for (var i = 0; i < HASH_LEN_BYTES; i++) {
        eContentShaBytes[i] = Bits2Num(8);
        for (var j = 0; j < 8; j++) {
            eContentShaBytes[i].in[7 - j] <== eContentSha[i * 8 + j];
        }
    }

    // assert eContent hash matches the one in signedAttr
    signal eContentHashInSignedAttr[HASH_LEN_BYTES] <== VarShiftLeft(MAX_SIGNED_ATTR_LEN, HASH_LEN_BYTES)(signed_attr, signed_attr_econtent_hash_offset);
    for(var i = 0; i < HASH_LEN_BYTES; i++) {
        eContentHashInSignedAttr[i] === eContentShaBytes[i].out;
    }

    // compute hash of signedAttr
    signal signedAttrSha[HASH_LEN_BITS] <== ShaBytesDynamic(HASH_LEN_BITS, MAX_SIGNED_ATTR_LEN)(signed_attr, signed_attr_padded_length);

    SignatureVerifier(signatureAlgorithm, n, k)(signedAttrSha, pubKey, signature);


}

