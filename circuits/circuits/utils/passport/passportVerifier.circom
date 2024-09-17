pragma circom 2.1.6;

include "@zk-email/circuits/utils/bytes.circom";
include "@zk-email/circuits/utils/array.circom";
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
    signal input econtent[MAX_ECONTENT_LEN];
    signal input econtent_padded_length;
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

    // assert DG1 hash matches the one in econtent input
    signal dg1Hash[HASH_LEN_BYTES] <== SelectSubArray(MAX_ECONTENT_LEN, HASH_LEN_BYTES)(econtent, dg1_hash_offset, HASH_LEN_BYTES); // TODO: use varShifLeft instead
    for(var i = 0; i < HASH_LEN_BYTES; i++) {
        dg1Hash[i] === dg1ShaBytes[i].out;
    }

    // compute hash of econtent
    signal eContentSha[HASH_LEN_BITS] <== ShaBytesDynamic(HASH_LEN_BITS,MAX_ECONTENT_LEN)(econtent, econtent_padded_length);
    component eContentShaBytes[HASH_LEN_BYTES];
    for (var i = 0; i < HASH_LEN_BYTES; i++) {
        eContentShaBytes[i] = Bits2Num(8);
        for (var j = 0; j < 8; j++) {
            eContentShaBytes[i].in[7 - j] <== eContentSha[i * 8 + j];
        }
    }

    // assert econtent hash matches the one in signedAttr
    signal eContentHashInSignedAttr[HASH_LEN_BYTES] <== SelectSubArray(MAX_SIGNED_ATTR_LEN, HASH_LEN_BYTES)(signed_attr, signed_attr_econtent_hash_offset, HASH_LEN_BYTES); // TODO: use varShifLeft instead
    for(var i = 0; i < HASH_LEN_BYTES; i++) {
        eContentHashInSignedAttr[i] === eContentShaBytes[i].out;
    }

    // compute hash of signedAttr
    signal signedAttrSha[HASH_LEN_BITS] <== ShaBytesDynamic(HASH_LEN_BITS, MAX_SIGNED_ATTR_LEN)(signed_attr, signed_attr_padded_length);

    SignatureVerifier(signatureAlgorithm, n, k)(signedAttrSha, pubKey, signature);


}

