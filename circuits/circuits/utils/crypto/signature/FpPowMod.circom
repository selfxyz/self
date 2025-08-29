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

/// @title FpPow64321Mod
/// @notice Computes base^64321 mod modulus
/// @dev Does not necessarily reduce fully mod modulus (the answer could be too big by a multiple of modulus)
/// @param n Number of bits per chunk the modulus is split into.
/// @param k Number of chunks the modulus is split into.
/// @input base The base to exponentiate; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @input modulus The modulus; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @output out The result of the exponentiation.
template FpPow64321Mod(n, k) {
    signal input base[k];
    signal input modulus[k];
    signal output out[k];

    // We need powers up to 2^15 (since the largest term is 2^15)
    component doublers[15];
    for (var i = 0; i < 15; i++) {
        doublers[i] = FpMul(n, k);
    }

    // Component for accumulating the result
    component muls[8]; // one for each '1' bit except the first
    for (var i = 0; i < 8; i++) {
        muls[i] = FpMul(n, k);
    }

    // Set modulus for all
    for (var j = 0; j < k; j++) {
        for (var i = 0; i < 15; i++) {
            doublers[i].p[j] <== modulus[j];
        }
        for (var i = 0; i < 8; i++) {
            muls[i].p[j] <== modulus[j];
        }
    }

    for (var j = 0; j < k; j++) {
        doublers[0].a[j] <== base[j];
        doublers[0].b[j] <== base[j];
    }

    for (var i = 0; i < 14; i++) {
        for (var j = 0; j < k; j++) {
            doublers[i+1].a[j] <== doublers[i].out[j];
            doublers[i+1].b[j] <== doublers[i].out[j];
        }
    }

    var indices[8] = [15, 14, 13, 12, 11, 9, 8, 6];

    for (var i = 0; i < k; i++) {
        muls[0].a[i] <== doublers[indices[0] - 1].out[i];
        muls[0].b[i] <== doublers[indices[1] - 1].out[i];
    }

    for (var i = 1; i < 7; i++) {
        for (var j = 0; j < k; j++) {
            muls[i].a[j] <== muls[i - 1].out[j];
            muls[i].b[j] <== doublers[indices[i + 1] - 1].out[j];
        }
    }

    for (var i = 0; i < k; i++) {
        muls[7].a[i] <== muls[6].out[i];
        muls[7].b[i] <== base[i];
    }

    // Output
    for (var j = 0; j < k; j++) {
        out[j] <== muls[7].out[j];
    }
}

/// @title FpPow130689Mod
/// @notice Computes base^130689 mod modulus
/// @dev Does not necessarily reduce fully mod modulus (the answer could be too big by a multiple of modulus)
/// @param n Number of bits per chunk the modulus is split into.
/// @param k Number of chunks the modulus is split into.
/// @input base The base to exponentiate; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @input modulus The modulus; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @output out The result of the exponentiation.
template FpPow130689Mod(n, k) {
    signal input base[k];
    signal input modulus[k];
    signal output out[k];

    component doublers[16];
    for (var i = 0; i < 16; i++) {
        doublers[i] = FpMul(n, k);
    }

    // Component for accumulating the result
    component muls[9]; // one for each '1' bit except the first
    for (var i = 0; i < 9; i++) {
        muls[i] = FpMul(n, k);
    }

    // Set modulus for all
    for (var j = 0; j < k; j++) {
        for (var i = 0; i < 16; i++) {
            doublers[i].p[j] <== modulus[j];
        }
        for (var i = 0; i < 9; i++) {
            muls[i].p[j] <== modulus[j];
        }
    }

    for (var j = 0; j < k; j++) {
        doublers[0].a[j] <== base[j];
        doublers[0].b[j] <== base[j];
    }

    for (var i = 0; i < 15; i++) {
        for (var j = 0; j < k; j++) {
            doublers[i+1].a[j] <== doublers[i].out[j];
            doublers[i+1].b[j] <== doublers[i].out[j];
        }
    }

    var indices[9] = [16, 15, 14, 13, 12, 11, 10, 9, 7];

    for (var i = 0; i < k; i++) {
        muls[0].a[i] <== doublers[indices[0] - 1].out[i];
        muls[0].b[i] <== doublers[indices[1] - 1].out[i];
    }

    for (var i = 1; i < 8; i++) {
        for (var j = 0; j < k; j++) {
            muls[i].a[j] <== muls[i - 1].out[j];
            muls[i].b[j] <== doublers[indices[i + 1] - 1].out[j];
        }
    }

    for (var i = 0; i < k; i++) {
        muls[8].a[i] <== muls[7].out[i];
        muls[8].b[i] <== base[i];
    }

    // Output
    for (var j = 0; j < k; j++) {
        out[j] <== muls[8].out[j];
    }
}

//11101110100001101 = 122125
//2^0 + 2^2 + 2^3 + 2^8 + 2^10 + 2^11 + 2^12 + 2^14 + 2^15 + 2^16
/// @title FpPow122125Mod
/// @notice Computes base^122125 mod modulus
/// @dev Does not necessarily reduce fully mod modulus (the answer could be too big by a multiple of modulus)
/// @param n Number of bits per chunk the modulus is split into.
/// @param k Number of chunks the modulus is split into.
/// @input base The base to exponentiate; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @input modulus The modulus; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @output out The result of the exponentiation.
template FpPow122125Mod(n, k) {
    signal input base[k];
    signal input modulus[k];
    signal output out[k];

    component doublers[16];
    for (var i = 0; i < 16; i++) {
        doublers[i] = FpMul(n, k);
    }

    // Component for accumulating the result
    component muls[9]; // one for each '1' bit except the first
    for (var i = 0; i < 9; i++) {
        muls[i] = FpMul(n, k);
    }

    // Set modulus for all
    for (var j = 0; j < k; j++) {
        for (var i = 0; i < 16; i++) {
            doublers[i].p[j] <== modulus[j];
        }
        for (var i = 0; i < 9; i++) {
            muls[i].p[j] <== modulus[j];
        }
    }

    for (var j = 0; j < k; j++) {
        doublers[0].a[j] <== base[j];
        doublers[0].b[j] <== base[j];
    }

    for (var i = 0; i < 15; i++) {
        for (var j = 0; j < k; j++) {
            doublers[i+1].a[j] <== doublers[i].out[j];
            doublers[i+1].b[j] <== doublers[i].out[j];
        }
    }

    var indices[9] = [16, 15, 14, 12, 11, 10, 8, 3, 2];

    for (var i = 0; i < k; i++) {
        muls[0].a[i] <== doublers[indices[0] - 1].out[i];
        muls[0].b[i] <== doublers[indices[1] - 1].out[i];
    }

    for (var i = 1; i < 8; i++) {
        for (var j = 0; j < k; j++) {
            muls[i].a[j] <== muls[i - 1].out[j];
            muls[i].b[j] <== doublers[indices[i + 1] - 1].out[j];
        }
    }

    for (var i = 0; i < k; i++) {
        muls[8].a[i] <== muls[7].out[i];
        muls[8].b[i] <== base[i];
    }

    // Output
    for (var j = 0; j < k; j++) {
        out[j] <== muls[8].out[j];
    }
}

//11010010101111111 = 107903
//2^0 + 2^1 + 2^2 + 2^3 + 2^4 + 2^5 + 2^6 + 2^8 + 2^10 + 2^13 + 2^15 + 2^16
/// @title FpPow107903Mod
/// @notice Computes base^107903 mod modulus
/// @dev Does not necessarily reduce fully mod modulus (the answer could be too big by a multiple of modulus)
/// @param n Number of bits per chunk the modulus is split into.
/// @param k Number of chunks the modulus is split into.
/// @input base The base to exponentiate; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @input modulus The modulus; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @output out The result of the exponentiation.
template FpPow107903Mod(n, k) {
    signal input base[k];
    signal input modulus[k];
    signal output out[k];

    component doublers[16];
    for (var i = 0; i < 16; i++) {
        doublers[i] = FpMul(n, k);
    }

    // Component for accumulating the result
    component muls[11]; // one for each '1' bit except the first
    for (var i = 0; i < 11; i++) {
        muls[i] = FpMul(n, k);
    }

    // Set modulus for all
    for (var j = 0; j < k; j++) {
        for (var i = 0; i < 16; i++) {
            doublers[i].p[j] <== modulus[j];
        }
        for (var i = 0; i < 11; i++) {
            muls[i].p[j] <== modulus[j];
        }
    }

    for (var j = 0; j < k; j++) {
        doublers[0].a[j] <== base[j];
        doublers[0].b[j] <== base[j];
    }

    for (var i = 0; i < 15; i++) {
        for (var j = 0; j < k; j++) {
            doublers[i+1].a[j] <== doublers[i].out[j];
            doublers[i+1].b[j] <== doublers[i].out[j];
        }
    }

    var indices[11] = [16, 15, 13, 10, 8, 6, 5, 4, 3, 2, 1];

    for (var i = 0; i < k; i++) {
        muls[0].a[i] <== doublers[indices[0] - 1].out[i];
        muls[0].b[i] <== doublers[indices[1] - 1].out[i];
    }

    for (var i = 1; i < 10; i++) {
        for (var j = 0; j < k; j++) {
            muls[i].a[j] <== muls[i - 1].out[j];
            muls[i].b[j] <== doublers[indices[i + 1] - 1].out[j];
        }
    }

    for (var i = 0; i < k; i++) {
        muls[10].a[i] <== muls[9].out[i];
        muls[10].b[i] <== base[i];
    }

    // Output
    for (var j = 0; j < k; j++) {
        out[j] <== muls[10].out[j];
    }
}

///1101110100100011 = 56611
///2^0 + 2^1 + 2^5 + 2^8 + 2^10 + 2^11 + 2^12 + 2^14 + 2^15
/// @title FpPow56611Mod
/// @notice Computes base^56611 mod modulus
/// @dev Does not necessarily reduce fully mod modulus (the answer could be too big by a multiple of modulus)
/// @param n Number of bits per chunk the modulus is split into.
/// @param k Number of chunks the modulus is split into.
/// @input base The base to exponentiate; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @input modulus The modulus; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @output out The result of the exponentiation.
template FpPow56611Mod(n, k) {
    signal input base[k];
    signal input modulus[k];
    signal output out[k];

    // We need powers up to 2^15 (since the largest term is 2^15)
    component doublers[15];
    for (var i = 0; i < 15; i++) {
        doublers[i] = FpMul(n, k);
    }

    // Component for accumulating the result
    component muls[8]; // one for each '1' bit except the first
    for (var i = 0; i < 8; i++) {
        muls[i] = FpMul(n, k);
    }

    // Set modulus for all
    for (var j = 0; j < k; j++) {
        for (var i = 0; i < 15; i++) {
            doublers[i].p[j] <== modulus[j];
        }
        for (var i = 0; i < 8; i++) {
            muls[i].p[j] <== modulus[j];
        }
    }

    for (var j = 0; j < k; j++) {
        doublers[0].a[j] <== base[j];
        doublers[0].b[j] <== base[j];
    }

    for (var i = 0; i < 14; i++) {
        for (var j = 0; j < k; j++) {
            doublers[i+1].a[j] <== doublers[i].out[j];
            doublers[i+1].b[j] <== doublers[i].out[j];
        }
    }

    var indices[8] = [15, 14, 12, 11, 10, 8, 5, 1];

    for (var i = 0; i < k; i++) {
        muls[0].a[i] <== doublers[indices[0] - 1].out[i];
        muls[0].b[i] <== doublers[indices[1] - 1].out[i];
    }

    for (var i = 1; i < 7; i++) {
        for (var j = 0; j < k; j++) {
            muls[i].a[j] <== muls[i - 1].out[j];
            muls[i].b[j] <== doublers[indices[i + 1] - 1].out[j];
        }
    }

    for (var i = 0; i < k; i++) {
        muls[7].a[i] <== muls[6].out[i];
        muls[7].b[i] <== base[i];
    }

    // Output
    for (var j = 0; j < k; j++) {
        out[j] <== muls[7].out[j];
    }
}
