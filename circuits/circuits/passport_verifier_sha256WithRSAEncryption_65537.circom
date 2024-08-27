pragma circom 2.1.5;

include "@zk-email/circuits/lib/rsa.circom";
include "@zk-email/circuits/utils/bytes.circom";
include "@zk-email/circuits/lib/sha.circom";
include "@zk-email/circuits/utils/array.circom";
include "./utils/Sha256BytesStatic.circom";

template PassportVerifier_sha256WithRSAEncryption_65537(n, k, MAX_ECONTENT_LEN, MAX_SIGNED_ATTR_LEN) {
    var HASH_LEN = 32;
    var HASH_LEN_BITS = 256;

    signal input dg1[93];
    signal input eContent[MAX_ECONTENT_LEN];
    signal input eContentPaddedLength;
    signal input eContentDG1HashOffset;
    signal input signedAttr[MAX_SIGNED_ATTR_LEN];
    signal input signedAttrPaddedLength;
    signal input signedAttreContentHashOffset;
    // pubkey that signed the passport
    signal input pubkey[k];
    // signature of the passport
    signal input signature[k];

    // compute hash of DG1
    signal dg1Sha[HASH_LEN_BITS] <== Sha256BytesStatic(93)(dg1);
    component dg1Sha_bytes[HASH_LEN];
    for (var i = 0; i < HASH_LEN; i++) {
        dg1Sha_bytes[i] = Bits2Num(8);
        for (var j = 0; j < 8; j++) {
            dg1Sha_bytes[i].in[7 - j] <== dg1Sha[i * 8 + j];
        }
    }

    // assert DG1 hash matches the one in eContent input
    signal dg1Hash[HASH_LEN] <== SelectSubArray(MAX_ECONTENT_LEN, HASH_LEN)(eContent, eContentDG1HashOffset, HASH_LEN);
    for(var i = 0; i < HASH_LEN; i++) {
        dg1Hash[i] === dg1Sha_bytes[i].out;
    }

    // compute hash of eContent
    signal eContentSha[HASH_LEN_BITS] <== Sha256Bytes(MAX_ECONTENT_LEN)(eContent, eContentPaddedLength);
    component eContentSha_bytes[HASH_LEN];
    for (var i = 0; i < HASH_LEN; i++) {
        eContentSha_bytes[i] = Bits2Num(8);
        for (var j = 0; j < 8; j++) {
            eContentSha_bytes[i].in[7 - j] <== eContentSha[i * 8 + j];
        }
    }

    // assert eContent hash matches the one in signedAttr
    signal eContentHashInSignedAttr[HASH_LEN] <== SelectSubArray(MAX_SIGNED_ATTR_LEN, HASH_LEN)(signedAttr, signedAttreContentHashOffset, HASH_LEN);
    for(var i = 0; i < HASH_LEN; i++) {
        eContentHashInSignedAttr[i] === eContentSha_bytes[i].out;
    }

    // compute hash of signedAttr
    signal signedAttrSha[256] <== Sha256Bytes(MAX_SIGNED_ATTR_LEN)(signedAttr, signedAttrPaddedLength);
    // get output of signedAttr sha256 into k chunks of n bits each
    var msg_len = (256 + n) \ n;
    // signedAttrHash: list of length 256/n+1 of components of n bits
    component signedAttrHash[msg_len];
    for (var i = 0; i < msg_len; i++) {
        // instantiate each component of the list of Bits2Num of size n
        signedAttrHash[i] = Bits2Num(n);
    }
    for (var i = 0; i < 256; i++) {
        signedAttrHash[i \ n].in[i % n] <== signedAttrSha[255 - i];
    }
    for (var i = 256; i < n * msg_len; i++) {
        signedAttrHash[i \ n].in[i % n] <== 0;
    }

    // verify RSA signature
    component rsa = RSAVerifier65537(n, k);
    for (var i = 0; i < msg_len; i++) {
        rsa.message[i] <== signedAttrHash[i].out;
    }
    for (var i = msg_len; i < k; i++) {
        rsa.message[i] <== 0;
    }
    rsa.modulus <== pubkey;
    rsa.signature <== signature;
}
