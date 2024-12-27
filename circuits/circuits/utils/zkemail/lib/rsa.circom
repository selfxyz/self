pragma circom 2.1.6;

include "./fp.circom";


/// @title RSAVerifier65537 
/// @notice Verifies an RSA signature with exponent 65537.
/// @param n Number of bits per chunk the modulus is split into. Recommended to be 121.
/// @param k Number of chunks the modulus is split into. Recommended to be 17.
/// @input message[k] The message that was signed; assumes to consist of `k` chunks that fit in `n` bits (also constrained implicitly).
/// @input signature[k] The signature to verify; assumes to consist of `k` chunks that fit in `n` bits (also constrained implicitly).
/// @input modulus[k] The modulus of the RSA key (pubkey); assumes to consist of `k` chunks that fit in `n` bits (also constrained implicitly).
template RSAVerifier65537(n, k) {
    signal input message[k];
    signal input signature[k];
    signal input modulus[k];

    component padder = RSAPad(n, k);
    for (var i = 0; i < k; i++) {
        padder.modulus[i] <== modulus[i];
        padder.message[i] <== message[i];
    }

    // Check that the signature is in proper form and reduced mod modulus.
    component signatureRangeCheck[k];
    component bigLessThan = BigLessThan(n, k);
    for (var i = 0; i < k; i++) {
        signatureRangeCheck[i] = Num2Bits(n);
        signatureRangeCheck[i].in <== signature[i];
        bigLessThan.a[i] <== signature[i];
        bigLessThan.b[i] <== modulus[i];
    }
    bigLessThan.out === 1;

    component bigPow = FpPow65537Mod(n, k);
    for (var i = 0; i < k; i++) {
        bigPow.base[i] <== signature[i];
        bigPow.modulus[i] <== modulus[i];
    }

    // By construction of the padding, the padded message is necessarily
    // smaller than the modulus. Thus, we don't have to check that bigPow is fully reduced.
    for (var i = 0; i < k; i++) {
        bigPow.out[i] === padder.out[i];
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

/// @title RSAPad
/// @notice Pads a message for RSA signing.
/// @param n Number of bits per chunk the modulus is split into.
/// @param k Number of chunks the modulus is split into.
/// @input modulus The modulus of the RSA key (pubkey).
/// @input message The message to pad.
/// @output out The padded message.
template RSAPad(n, k) {
    signal input modulus[k];
    signal input message[k];
    signal output out[k];

    // The extra 152 bits comes from 0x3031300d060960864801650304020105000420
    // This is due to padding from the RSASSA-PKCS1-v1_5 standard
    var baseLen = 408;
    var msgLen = 256;

    signal paddedMessageBits[n*k];

    component modulusN2B[k];
    component messageN2B[k];
    signal modulusBits[n*k];
    signal messageBits[n*k];
    for (var i = 0; i < k; i++) {
        messageN2B[i] = Num2Bits(n);
        messageN2B[i].in <== message[i];
        for (var j = 0; j < n; j++) {
            messageBits[i*n+j] <== messageN2B[i].out[j];
        }
        modulusN2B[i] = Num2Bits(n);
        modulusN2B[i].in <== modulus[i];
        for (var j = 0; j < n; j++) {
            modulusBits[i*n+j] <== modulusN2B[i].out[j];
        }
    }

    for (var i = msgLen; i < n*k; i++) {
        messageBits[i] === 0;
    }

    for (var i = 0; i < msgLen; i++) {
        paddedMessageBits[i] <== messageBits[i];
    }

    for (var i = baseLen; i < baseLen + 8; i++) {
        paddedMessageBits[i] <== 0;
    }

    for (var i = msgLen; i < baseLen; i++) {
        paddedMessageBits[i] <== (0x3031300d060960864801650304020105000420 >> (i - msgLen)) & 1;
    }

    component modulusZero[(n*k + 7 - (baseLen + 8))\8];
    {
        var modulusPrefix = 0;
        for (var i = n*k - 1; i >= baseLen + 8; i--) {
            if (i+8 < n*k) {
                modulusPrefix += modulusBits[i+8];
                if (i % 8 == 0) {
                    var idx = (i - (baseLen + 8)) \ 8;
                    modulusZero[idx] = IsZero();
                    modulusZero[idx].in <== modulusPrefix;
                    paddedMessageBits[i] <== 1-modulusZero[idx].out;
                } else {
                    paddedMessageBits[i] <== paddedMessageBits[i+1];
                }
            } else {
                paddedMessageBits[i] <== 0;
            }
        }
    }

    // The RFC guarantees at least 8 octets of 0xff padding.
    assert(baseLen + 8 + 65 <= n * k);

    for (var i = baseLen + 8; i < baseLen + 8 + 65; i++) {
        paddedMessageBits[i] === 1;
    }

    component passedMessageB2N[k];
    for (var i = 0; i < k; i++) {
        passedMessageB2N[i] = Bits2Num(n);
        for (var j = 0; j < n; j++) {
            passedMessageB2N[i].in[j] <== paddedMessageBits[i*n+j];
        }
        out[i] <== passedMessageB2N[i].out;
    }
}
