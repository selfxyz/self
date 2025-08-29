pragma circom 2.1.9;

include "@openpassport/zk-email-circuits/lib/fp.circom";
include "circomlib/circuits/bitify.circom";
include "../../passport/signatureAlgorithm.circom";

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

function getPowerIndicesLength(signatureAlgorithm) {
    if (signatureAlgorithm == 47) {
        return 8;
    }
    if (signatureAlgorithm == 48) {
        return 9;
    }
    if (signatureAlgorithm == 49) {
        return 9;
    }
    if (signatureAlgorithm == 50) {
        return 11;
    }
    if (signatureAlgorithm == 51) {
        return 8;
    }
    assert(1 == 0);
    return 0;
}

function getPowerIndices(signatureAlgorithm) {
    if (signatureAlgorithm == 47) {
        return [15, 14, 13, 12, 11, 9, 8, 6];
    }
    if (signatureAlgorithm == 48) {
        return [16, 15, 14, 13, 12, 11, 10, 9, 7];
    }
    if (signatureAlgorithm == 49) {
        return [16, 15, 14, 12, 11, 10, 8, 3, 2];
    }
    if (signatureAlgorithm == 50) {
        return [16, 15, 13, 10, 8, 6, 5, 4, 3, 2, 1];
    }
    if (signatureAlgorithm == 51) {
        return [15, 14, 12, 11, 10, 8, 5, 1];
    }
    assert(1 == 0);
    return [1];
}

template FpPowGenericMod(n, k, signatureAlgorithm) {
    signal input base[k];
    signal input modulus[k];
    signal output out[k];

    var exponent_bits = getExponentBits(signatureAlgorithm);

    component doublers[exponent_bits - 1];
    for (var i = 0; i < exponent_bits - 1; i++) {
        doublers[i] = FpMul(n, k);
    }

    var powerIndicesLength = getPowerIndicesLength(signatureAlgorithm);
    component muls[powerIndicesLength];
    for (var i = 0; i < powerIndicesLength; i++) {
        muls[i] = FpMul(n, k);
    }

    for (var j = 0; j < k; j++) {
        for (var i = 0; i < exponent_bits - 1; i++) {
            doublers[i].p[j] <== modulus[j];
        }
        for (var i = 0; i < powerIndicesLength; i++) {
            muls[i].p[j] <== modulus[j];
        }
    }

    for (var j = 0; j < k; j++) {
        doublers[0].a[j] <== base[j];
        doublers[0].b[j] <== base[j];
    }

    for (var i = 0; i < exponent_bits - 2; i++) {
        for (var j = 0; j < k; j++) {
            doublers[i+1].a[j] <== doublers[i].out[j];
            doublers[i+1].b[j] <== doublers[i].out[j];
        }
    }

    var powerIndices[powerIndicesLength] = getPowerIndices(signatureAlgorithm);
    for (var i = 0; i < k; i++) {
        muls[0].a[i] <== doublers[powerIndices[0] - 1].out[i];
        muls[0].b[i] <== doublers[powerIndices[1] - 1].out[i];
    }

    for (var i = 1; i < powerIndicesLength - 1; i++) {
        for (var j = 0; j < k; j++) {
            muls[i].a[j] <== muls[i - 1].out[j];
            muls[i].b[j] <== doublers[powerIndices[i + 1] - 1].out[j];
        }
    }

    for (var i = 0; i < k; i++) {
        muls[powerIndicesLength - 1].a[i] <== muls[powerIndicesLength - 2].out[i];
        muls[powerIndicesLength - 1].b[i] <== base[i];
    }

    // Output
    for (var j = 0; j < k; j++) {
        out[j] <== muls[powerIndicesLength - 1].out[j];
    }
}
