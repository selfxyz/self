pragma circom 2.1.9;

include "circomlib/circuits/bitify.circom";
include "./powMod.circom";
include "../passport/signatureAlgorithm.circom";
include "../other/optimized/int/arithmetic.circom";

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
        for (var i = 0; i < 2; i++) {
            bigPow.out[i] === message[i];
        }
        component getBits = GetLastNBits(32);
        getBits.in <== bigPow.out[2];
        component bitsToNum = Bits2Num(32);
        bitsToNum.in <== getBits.out;
        bitsToNum.out === message[2];

        getBits.div === padding[0];
        bigPow.out[3] === padding[1];
        bigPow.out[4] === padding[2];
        for (var i = 5; i < CHUNK_NUMBER - 1; i++) {
            bigPow.out[i] === padding[3];
        }
        bigPow.out[CHUNK_NUMBER - 1] === padding[4];
    } else if (signatureAlgorithm == 10) {
        for (var i = 0; i < 4; i++) {
            bigPow.out[i] === message[i];
        }
        bigPow.out[4] === padding[0];
        bigPow.out[5] === padding[1];
        bigPow.out[6] === padding[2];
        for (var i = 7; i < CHUNK_NUMBER - 1; i++) {
            bigPow.out[i] === padding[3];
        }
        bigPow.out[CHUNK_NUMBER - 1] === padding[4];
    } else if (signatureAlgorithm == 14) {
        for (var i = 0; i < 2; i++) {
            bigPow.out[i] === message[i];
        }
        component getBits = GetLastNBits(64);
        getBits.in <== bigPow.out[2];
        component bitsToNum = Bits2Num(64);
        bitsToNum.in <== getBits.out;
        bitsToNum.out === message[2];

        getBits.div === padding[0];
        bigPow.out[3] === padding[1];
        bigPow.out[4] === padding[2];
        for (var i = 5; i < CHUNK_NUMBER - 1; i++) {
            bigPow.out[i] === padding[3];
        }
        bigPow.out[CHUNK_NUMBER - 1] === padding[4];
    } else if (signatureAlgorithm == 15) {
        for (var i = 0; i < 8; i++) {
            bigPow.out[i] === message[i];
        }
        bigPow.out[8] === padding[0];
        bigPow.out[9] === padding[1];
        bigPow.out[10] === padding[2];
        for (var i = 11; i < CHUNK_NUMBER - 1; i++) {
            bigPow.out[i] === padding[3];
        }
        bigPow.out[CHUNK_NUMBER - 1] === padding[4];
    } else {
        for (var i = 0; i < 4; i++) {
            bigPow.out[i] === message[i];
        }
        bigPow.out[4] === padding[0];
        bigPow.out[5] === padding[1];
        bigPow.out[6] === padding[2];
        for (var i = 7; i < CHUNK_NUMBER - 1; i++) {
            bigPow.out[i] === padding[3];
        }
        bigPow.out[CHUNK_NUMBER - 1] === padding[4];
    }

}
