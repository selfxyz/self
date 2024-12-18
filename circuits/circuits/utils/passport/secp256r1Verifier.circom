pragma circom 2.1.9;

include "./signatureAlgorithm.circom";
include "../circomlib/signatures/ecdsa.circom";

template Secp256r1Verifier(signatureAlgorithm, n, k) {
    var kLengthFactor = getKLengthFactor(signatureAlgorithm);
    var kScaled = k * kLengthFactor;

    var HASH_LEN_BITS = getHashLength(signatureAlgorithm);

    signal input signature[kScaled];
    signal input pubKey[kScaled];
    signal input hashParsed[HASH_LEN_BITS];

    signal hash[n * k];

    for (var i = n * k - 1; i >= 0; i--) {
        if (i <= n * k - 1 - HASH_LEN_BITS) {
            hash[i] <== 0;
        }else { 
            hash[i] <== hashParsed[i - n * k + HASH_LEN_BITS];
        }
    }

    signal signature_r[k]; // ECDSA signature component r
    signal signature_s[k]; // ECDSA signature component s
    signal pubKey_x[k];
    signal pubKey_y[k];

    for (var i = 0; i < k; i++) {
        signature_r[i] <== signature[i];
        signature_s[i] <== signature[i + k];
        pubKey_x[i] <== pubKey[i];
        pubKey_y[i] <== pubKey[i + k];
    }
    signal pubkey_xy[2][k] <== [pubKey_x, pubKey_y];

    // verify eContentHash signature
    component ecdsa_verify = verifyECDSABits(n, k, [ 
        18446744073709551612, 
        4294967295, 
        0, 
        18446744069414584321 
    ], 
    [
        4309448131093880907,
        7285987128567378166,
        12964664127075681980,
        6540974713487397863
    ],
    [ 
        18446744073709551615, 
        4294967295, 
        0, 
        18446744069414584321 
    ], n * k);

    ecdsa_verify.pubkey <== pubkey_xy;
    ecdsa_verify.signature <== [signature_r, signature_s];
    ecdsa_verify.hashed <== hash;
    ecdsa_verify.dummy <== 0;
}