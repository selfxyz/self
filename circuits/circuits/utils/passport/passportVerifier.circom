pragma circom 2.1.9;

include "../circomlib/utils/array.circom";
include "../circomlib/utils/bytes.circom";
include "../circomlib/hasher/shaBytes/shaBytesDynamic.circom";
include "../circomlib/hasher/hash.circom";
include "./signatureAlgorithm.circom";
include "./signatureVerifier.circom";

template PassportVerifier(signatureAlgorithm, n, k, MAX_ECONTENT_LEN, MAX_SIGNED_ATTR_LEN) {
    assert(MAX_ECONTENT_LEN % 64 == 0);

    var kLengthFactor = getKLengthFactor(signatureAlgorithm);
    var kScaled = k * kLengthFactor;

    var HASH_LEN_BITS = getHashLength(signatureAlgorithm);
    var HASH_LEN_BYTES = HASH_LEN_BITS / 8;
    var DG_PADDING_BYTES_LEN = 7;

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
    signal dg1Bits[93 * 8];
    component n2b[93];
    for (var i = 0; i < 93; i++) {
        n2b[i] = Num2Bits(8);
        n2b[i].in <== dg1[i];
        for (var j = 0; j < 8; j++) {
            dg1Bits[i * 8 + j] <== n2b[i].out[7 - j];
        }
    }

    signal dg1Sha[HASH_LEN_BITS] <== ShaHashBits(93 * 8, HASH_LEN_BITS)(dg1Bits);
    

    component dg1ShaBytes[HASH_LEN_BYTES];
    for (var i = 0; i < HASH_LEN_BYTES; i++) {
        dg1ShaBytes[i] = Bits2Num(8);
        for (var j = 0; j < 8; j++) {
            dg1ShaBytes[i].in[7 - j] <== dg1Sha[i * 8 + j];
        }
    }

    // assert DG1 and DG2 hashes match the ones in eContent input
    signal dg1AndDg2Hash[2 * HASH_LEN_BYTES + DG_PADDING_BYTES_LEN] <== VarShiftLeft(MAX_ECONTENT_LEN, 2 * HASH_LEN_BYTES + DG_PADDING_BYTES_LEN)(eContent, dg1_hash_offset);
    for(var i = 0; i < HASH_LEN_BYTES; i++) {
        dg1AndDg2Hash[i] === dg1ShaBytes[i].out;
        dg1AndDg2Hash[i + HASH_LEN_BYTES + DG_PADDING_BYTES_LEN] === dg2_hash[i];
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

    signal signedAttrSha[HASH_LEN_BITS] <== ShaBytesDynamic(HASH_LEN_BITS, MAX_SIGNED_ATTR_LEN)(signed_attr, signed_attr_padded_length);

    SignatureVerifier(signatureAlgorithm, n, k)(signedAttrSha, pubKey, signature);
}

