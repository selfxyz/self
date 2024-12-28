pragma circom 2.1.9;

include "../circomlib/signature/rsapss/rsapss.circom";
include "ecdsaVerifier.circom";
include "../circomlib/signature/rsa/verifyRsaPkcs1v1_5.circom";
include "../circomlib/utils/bytes.circom";

template SignatureVerifier(signatureAlgorithm, n, k) {
    var kLengthFactor = getKLengthFactor(signatureAlgorithm);
    var kScaled = k * kLengthFactor;

    var HASH_LEN_BITS = getHashLength(signatureAlgorithm);

    signal input hash[HASH_LEN_BITS];
    signal input pubKey[kScaled];
    signal input signature[kScaled];

    signal input dummy;

    var msg_len = (HASH_LEN_BITS + n) \ n;

    signal hashParsed[msg_len] <== HashParser(signatureAlgorithm, n, k)(hash);
   
    if (signatureAlgorithm == 1) { 
        component rsa = VerifyRsaPkcs1v1_5(signatureAlgorithm, n, k, 65537, 256);
        for (var i = 0; i < msg_len; i++) {
            rsa.message[i] <== hashParsed[i];
        }
        for (var i = msg_len; i < k; i++) {
            rsa.message[i] <== 0;
        }
        rsa.modulus <== pubKey;
        rsa.signature <== signature;
        rsa.dummy <== dummy;

    }
    if (signatureAlgorithm == 3) {
        component rsa = VerifyRsaPkcs1v1_5(signatureAlgorithm, n, k, 65537, 160);
        for (var i = 0; i < msg_len; i++) {
            rsa.message[i] <== hashParsed[i];
        }
        for (var i = msg_len; i < k; i++) {
            rsa.message[i] <== 0;
        }
        rsa.modulus <== pubKey;
        rsa.signature <== signature;
        rsa.dummy <== dummy;
    }

    if (
        signatureAlgorithm == 4 
        || signatureAlgorithm == 12 
        || signatureAlgorithm == 16
        || signatureAlgorithm == 17
        || signatureAlgorithm == 18
        || signatureAlgorithm == 19
    ) {
        var pubKeyBitsLength = getKeyLength(signatureAlgorithm);
        var SALT_LEN = HASH_LEN_BITS / 8;
        var E_BITS = getExponentBits(signatureAlgorithm);
        var EXP;
        if (E_BITS == 17) {
            EXP = 65537;
        } else {
            EXP = 3;
        }

        component rsaPssShaVerification = VerifyRsaPssSig(n, k, SALT_LEN, EXP, HASH_LEN_BITS);
        rsaPssShaVerification.pubkey <== pubKey;
        rsaPssShaVerification.signature <== signature;
        rsaPssShaVerification.hashed <== hash; // send the raw hash
        rsaPssShaVerification.dummy <== 0;

    }
    if (
        signatureAlgorithm == 7 
        || signatureAlgorithm == 8 
        || signatureAlgorithm == 9 
        || signatureAlgorithm == 21 
        || signatureAlgorithm == 22
        || signatureAlgorithm == 23
    ) {
        EcdsaVerifier (signatureAlgorithm, n, k)(signature, pubKey, hash);
    }
    if (signatureAlgorithm == 10) {
        component rsa = VerifyRsaPkcs1v1_5(signatureAlgorithm, n, k, 65537, 256);
        for (var i = 0; i < msg_len; i++) {
            rsa.message[i] <== hashParsed[i];
        }
        for (var i = msg_len; i < k; i++) {
            rsa.message[i] <== 0;
        }
        rsa.modulus <== pubKey;
        rsa.signature <== signature;
        rsa.dummy <== dummy;
    }
    if (signatureAlgorithm == 11) {
        component rsa = VerifyRsaPkcs1v1_5(signatureAlgorithm, n, k, 65537, 160);
        for (var i = 0; i < msg_len; i++) {
            rsa.message[i] <== hashParsed[i];
        }
        for (var i = msg_len; i < k; i++) {
            rsa.message[i] <== 0;
        }
        rsa.modulus <== pubKey;
        rsa.signature <== signature;
        rsa.dummy <== dummy;
    }
    if (signatureAlgorithm == 12) {

    }
    if (signatureAlgorithm == 13) {
        component rsa = VerifyRsaPkcs1v1_5(signatureAlgorithm, n, k, 3, 256);
        for (var i = 0; i < msg_len; i++) {
            rsa.message[i] <== hashParsed[i];
        }
        for (var i = msg_len; i < k; i++) {
            rsa.message[i] <== 0;
        }
        rsa.modulus <== pubKey;
        rsa.signature <== signature;
        rsa.dummy <== dummy;
    }
    if (signatureAlgorithm == 14) {
        component rsa = VerifyRsaPkcs1v1_5(signatureAlgorithm, n, k, 65537, 256);
        for (var i = 0; i < msg_len; i++) {
            rsa.message[i] <== hashParsed[i];
        }
        for (var i = msg_len; i < k; i++) {
            rsa.message[i] <== 0;
        }
        rsa.modulus <== pubKey;
        rsa.signature <== signature;
        rsa.dummy <== dummy;
    }
    if (signatureAlgorithm == 15) {

    }
}


template HashParser(signatureAlgorithm, n, k) {
    var HASH_LEN_BITS = getHashLength(signatureAlgorithm);
    var msg_len = (HASH_LEN_BITS + n) \ n;

    component hashParser[msg_len];
    signal input hash[HASH_LEN_BITS];

    for (var i = 0; i < msg_len; i++) {
        hashParser[i] = Bits2Num(n);
    }
    for (var i = 0; i < HASH_LEN_BITS; i++) {
        hashParser[i \ n].in[i % n] <== hash[HASH_LEN_BITS - 1 - i];
    }
    for (var i = HASH_LEN_BITS; i < n * msg_len; i++) {
        hashParser[i \ n].in[i % n] <== 0;
    }
    signal output hashParsed[msg_len];
    for (var i = 0; i < msg_len ; i++ ){
        hashParsed[i] <== hashParser[i].out;
    }
}