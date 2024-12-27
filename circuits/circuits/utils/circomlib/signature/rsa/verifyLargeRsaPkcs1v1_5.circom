pragma circom 2.1.9;

include "../../bitify/bitify.circom";
include "../../bigInt/bigInt.circom";
include "../../../passport/signatureAlgorithm.circom";
include "../../int/arithmetic.circom";

// For exponent, EXP is 3
// For exponent, EXP is 65537

// For 2048bits, CHUNK_SIZE = 64, CHUNK_NUMBER = 32
// For 3072bits, CHUNK_SIZE = 96, CHUNK_NUMBER = 32
// For 4096bits, CHUNK_SIZE = 64, CHUNK_NUMBER = 64

// HASH_SIZE is the size of the hash in bits
// For SHA256, HASH_SIZE = 256
// For SHA384, HASH_SIZE = 384
// For SHA512, HASH_SIZE = 512

template VerifyLargeRsaPkcs1v1_5(signatureAlgorithm, CHUNK_SIZE, CHUNK_NUMBER, EXP, HASH_SIZE) {
    signal input signature[CHUNK_NUMBER];
    signal input modulus[CHUNK_NUMBER];

    signal input message[CHUNK_NUMBER];

    // Range check which is came from old openpassport impl
    component signatureRangeCheck[CHUNK_NUMBER];
    component bigLessThan = BigLessThan_dl(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        signatureRangeCheck[i] = Num2Bits(CHUNK_SIZE);
        signatureRangeCheck[i].in <== signature[i];
        bigLessThan.in[0][i] <== signature[i];
        bigLessThan.in[1][i] <== modulus[i];
    }
    bigLessThan.out === 1;

    // Calc Power Mod
    component bigPow = PowerMod(CHUNK_SIZE, CHUNK_NUMBER, EXP);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        bigPow.base[i] <== signature[i];
        bigPow.modulus[i] <== modulus[i];
    }

    var padding[5] = getPadding(signatureAlgorithm);

    // Verify Padding and Hashed Message
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
    } else if (signatureAlgorithm == 11) {
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
