pragma circom 2.1.9;

include "@openpassport/zk-email-circuits/lib/fp.circom";
include "circomlib/circuits/bitify.circom";

/// @title FpPow3Mod
/// @notice Computes base^3 mod modulus
/// @dev Does not necessarily reduce fully mod modulus (the answer could be too big by a multiple of modulus)
/// @param n Number of bits per chunk the modulus is split into.
/// @param k Number of chunks the modulus is split into.
/// @input base The base to exponentiate; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @input modulus The modulus; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @output out The result of the exponentiation.
template FpPow3Mod(n, k) {
    signal input base[k];
    signal input modulus[k];

    signal output out[k];

    component doublers = FpMul(n, k);
    component adder = FpMul(n, k);

    for (var j = 0; j < k; j++) {
        adder.p[j] <== modulus[j];
        doublers.p[j] <== modulus[j];
    }
    for (var j = 0; j < k; j++) {
        doublers.a[j] <== base[j];
        doublers.b[j] <== base[j];
    }
    for (var j = 0; j < k; j++) {
        adder.a[j] <== base[j];
        adder.b[j] <== doublers.out[j];
    }
    for (var j = 0; j < k; j++) {
        out[j] <== adder.out[j];
    }
}

/// @title FpPow65537Mod
/// @notice Computes base^65537 mod modulus
/// @dev Does not necessarily reduce fully mod modulus (the answer could be too big by a multiple of modulus)
/// @param n Number of bits per chunk the modulus is split into.
/// @param k Number of chunks the modulus is split into.
/// @input base The base to exponentiate; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @input modulus The modulus; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @output out The result of the exponentiation.
template FpPow65537Mod(n, k) {
    signal input base[k];
    signal input modulus[k];

    signal output out[k];

    component doublers[16];
    component adder = FpMul(n, k);
    for (var i = 0; i < 16; i++) {
        doublers[i] = FpMul(n, k);
    }

    for (var j = 0; j < k; j++) {
        adder.p[j] <== modulus[j];
        for (var i = 0; i < 16; i++) {
            doublers[i].p[j] <== modulus[j];
        }
    }
    for (var j = 0; j < k; j++) {
        doublers[0].a[j] <== base[j];
        doublers[0].b[j] <== base[j];
    }
    for (var i = 0; i + 1 < 16; i++) {
        for (var j = 0; j < k; j++) {
            doublers[i + 1].a[j] <== doublers[i].out[j];
            doublers[i + 1].b[j] <== doublers[i].out[j];
        }
    }
    for (var j = 0; j < k; j++) {
        adder.a[j] <== base[j];
        adder.b[j] <== doublers[15].out[j];
    }
    for (var j = 0; j < k; j++) {
        out[j] <== adder.out[j];
    }
}