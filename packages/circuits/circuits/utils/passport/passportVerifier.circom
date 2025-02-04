pragma circom 2.1.9;

include "@openpassport/zk-email-circuits/utils/array.circom";
include "@openpassport/zk-email-circuits/utils/bytes.circom";
include "../crypto/hasher/shaBytes/shaBytesDynamic.circom";
include "../crypto/hasher/hash.circom";
include "./signatureAlgorithm.circom";
include "./signatureVerifier.circom";

template PassportVerifier(DG_HASH_ALGO, ECONTENT_HASH_ALGO, signatureAlgorithm, n, k, MAX_ECONTENT_LEN, MAX_SIGNED_ATTR_LEN) {
    assert(MAX_ECONTENT_LEN % 64 == 0);

    var kLengthFactor = getKLengthFactor(signatureAlgorithm);
    var kScaled = k * kLengthFactor;


    var DG_HASH_ALGO_BYTES = DG_HASH_ALGO / 8;
    var ECONTENT_HASH_ALGO_BYTES = ECONTENT_HASH_ALGO / 8;
    var SIGNED_ATTR_HASH_ALGO = getHashLength(signatureAlgorithm);
    var SIGNED_ATTR_HASH_ALGO_BYTES = SIGNED_ATTR_HASH_ALGO / 8;

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

    signal dg1Sha[DG_HASH_ALGO] <== ShaHashBits(93 * 8, DG_HASH_ALGO)(dg1Bits);

    component dg1ShaBytes[DG_HASH_ALGO_BYTES];
    for (var i = 0; i < DG_HASH_ALGO_BYTES; i++) {
        dg1ShaBytes[i] = Bits2Num(8);
        for (var j = 0; j < 8; j++) {
            dg1ShaBytes[i].in[7 - j] <== dg1Sha[i * 8 + j];
        }
    }

    // assert DG1 and DG2 hashes match the ones in eContent input
    signal dg1AndDg2Hash[2 * DG_HASH_ALGO_BYTES + DG_PADDING_BYTES_LEN] <== VarShiftLeft(MAX_ECONTENT_LEN, 2 * DG_HASH_ALGO_BYTES + DG_PADDING_BYTES_LEN)(eContent, dg1_hash_offset);
    for(var i = 0; i < DG_HASH_ALGO_BYTES; i++) {
        dg1AndDg2Hash[i] === dg1ShaBytes[i].out;
        dg1AndDg2Hash[i + DG_HASH_ALGO_BYTES + DG_PADDING_BYTES_LEN] === dg2_hash[i];
    }

    // compute hash of eContent
    signal eContentSha[ECONTENT_HASH_ALGO] <== ShaBytesDynamic(ECONTENT_HASH_ALGO,MAX_ECONTENT_LEN)(eContent, eContent_padded_length);

    component eContentShaBytes[ECONTENT_HASH_ALGO_BYTES];
    for (var i = 0; i < ECONTENT_HASH_ALGO_BYTES; i++) {
        eContentShaBytes[i] = Bits2Num(8);
        for (var j = 0; j < 8; j++) {
            eContentShaBytes[i].in[7 - j] <== eContentSha[i * 8 + j];
        }
    }

    // assert eContent hash matches the one in signedAttr
    signal eContentHashInSignedAttr[ECONTENT_HASH_ALGO_BYTES] <== VarShiftLeft(MAX_SIGNED_ATTR_LEN, ECONTENT_HASH_ALGO_BYTES)(signed_attr, signed_attr_econtent_hash_offset);
    for(var i = 0; i < ECONTENT_HASH_ALGO_BYTES; i++) {
        eContentHashInSignedAttr[i] === eContentShaBytes[i].out;
    }

    signal signedAttrSha[SIGNED_ATTR_HASH_ALGO] <== ShaBytesDynamic(SIGNED_ATTR_HASH_ALGO, MAX_SIGNED_ATTR_LEN)(signed_attr, signed_attr_padded_length);

    SignatureVerifier(signatureAlgorithm, n, k)(signedAttrSha, pubKey, signature);

    signal output signedAttrShaBytes[SIGNED_ATTR_HASH_ALGO_BYTES];
    component signedAttrShaBytesComp[SIGNED_ATTR_HASH_ALGO_BYTES];
    
    for (var i = 0; i < SIGNED_ATTR_HASH_ALGO_BYTES; i++) {
        signedAttrShaBytesComp[i] = Bits2Num(8);
        for (var j = 0; j < 8; j++) {
            signedAttrShaBytesComp[i].in[7 - j] <== signedAttrSha[i * 8 + j];
        }
        signedAttrShaBytes[i] <== signedAttrShaBytesComp[i].out;
    }

}

