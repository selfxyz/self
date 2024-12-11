pragma circom 2.1.9;

// include "./pkcs1v1.5Padding.circom";
include "circomlib/circuits/bitify.circom";
include "./powMod.circom";
include "../passport/signatureAlgorithm.circom";

// For exponent is 3, use E_BITS = 2
// For exponent is 65537, use E_BITS = 17

// For 2048bits RSA, CHUNK_SIZE = 64, CHUNK_NUMBER = 32
// For 3072bits RSA, CHUNK_SIZE = 64, CHUNK_NUMBER = 48
// For 4096bits RSA, CHUNK_SIZE = 64, CHUNK_NUMBER = 64

// HASH_SIZE is the size of the hash in bits

template VerifyRsaPkcs1v1_5(signatureAlgorithm, CHUNK_SIZE, CHUNK_NUMBER, E_BITS, HASH_SIZE) {
    signal input signature[CHUNK_NUMBER];
    signal input modulus[CHUNK_NUMBER];

    signal input message[CHUNK_NUMBER];

    component signatureRangeCheck[CHUNK_NUMBER];
    component bigLessThan = BigLessThan(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        signatureRangeCheck[i] = Num2Bits(CHUNK_SIZE);
        signatureRangeCheck[i].in <== signature[i];
        bigLessThan.a[i] <== signature[i];
        bigLessThan.b[i] <== modulus[i];
    }
    bigLessThan.out === 1;

    component bigPow = PowerMod(CHUNK_SIZE, CHUNK_NUMBER, E_BITS);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        bigPow.base[i] <== signature[i];
        bigPow.modulus[i] <== modulus[i];
    }

    var padding[5] = getPadding(signatureAlgorithm);

    if (signatureAlgorithm == 3) {
    } else if (signatureAlgorithm == 14) {
    } else {
        bigPow.out[4] === padding[0];
        bigPow.out[5] === padding[1];
        bigPow.out[6] === padding[2];
        for (var i = 7; i < CHUNK_NUMBER - 1; i++) {
            bigPow.out[i] === padding[3];
        }
        bigPow.out[CHUNK_NUMBER - 1] === padding[4];
    }

    // // 1. Add padding to the hashed message
    // component padder = Pkcs1v1_5Padding(CHUNK_SIZE, CHUNK_NUMBER, HASH_SIZE);
    // for (var i = 0; i < CHUNK_NUMBER; i++) {
    //     padder.modulus[i] <== modulus[i];
    //     padder.message[i] <== message[i];
    // }

    // // 2. Check that the signature is in proper form and reduced mod modulus.
    // component signatureRangeCheck[CHUNK_NUMBER];
    // component bigLessThan = BigLessThan(CHUNK_SIZE, CHUNK_NUMBER);
    // for (var i = 0; i < CHUNK_NUMBER; i++) {
    //     signatureRangeCheck[i] = Num2Bits(CHUNK_SIZE);
    //     signatureRangeCheck[i].in <== signature[i];
    //     bigLessThan.a[i] <== signature[i];
    //     bigLessThan.b[i] <== modulus[i];
    // }
    // bigLessThan.out === 1;

    // // 3. Compute the signature^exponent mod modulus
    // component bigPow = PowerMod(CHUNK_SIZE, CHUNK_NUMBER, E_BITS);
    // for (var i = 0; i < CHUNK_NUMBER; i++) {
    //     bigPow.base[i] <== signature[i];
    //     bigPow.modulus[i] <== modulus[i];
    // }

    // // 4. Check that the computed value is equal to the padded message
    // for (var i = 0; i < CHUNK_NUMBER; i++) {
    //     log(bigPow.out[i]);
    //     bigPow.out[i] === padder.out[i];
    // }
}
