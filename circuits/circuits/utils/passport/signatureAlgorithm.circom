pragma circom 2.1.9;

function getHashLength(signatureAlgorithm) {
    if (signatureAlgorithm == 1 ) {
        return 256;
    }
    if (signatureAlgorithm == 3) {
        return 160;
    }
    if (signatureAlgorithm == 4) {
        return 256;
    }
    if (signatureAlgorithm == 7) {
        return 160;
    }
    if (signatureAlgorithm == 8) {
        return 256;
    }
    if (signatureAlgorithm == 9) {
        return 384;
    }
    if (signatureAlgorithm == 10) {
        return 256;
    }
    if (signatureAlgorithm == 11) {
        return 160;
    }
    if (signatureAlgorithm == 12) {
        return 256;
    }
    if (signatureAlgorithm == 13) {
        return 256;
    }
    if (signatureAlgorithm == 14) {
        return 256;
    }
    return 0;
}

function getKeyLength(signatureAlgorithm) {
    if (signatureAlgorithm == 1 ) {
        return 2048;
    }
    if (signatureAlgorithm == 3) {
        return 2048;
    }
    if (signatureAlgorithm == 4) {
        return 2048;
    }
    if (signatureAlgorithm == 7) {
        return 256;
    }
    if (signatureAlgorithm == 8) {
        return 256;
    }
    if (signatureAlgorithm == 9) {
        return 384;
    }
    if (signatureAlgorithm == 10) {
        return 4096;
    }
    if (signatureAlgorithm == 11) {
        return 4096;
    }
    if (signatureAlgorithm == 12) {
        return 4096;
    }
    if (signatureAlgorithm == 13) {
        return 2048;
    }
    if (signatureAlgorithm == 14) {
        return 3072;
    }
    return 0;
}

//returns 1 for rsa, 2 for ecdsa
function getKLengthFactor(signatureAlgorithm) {
    if (signatureAlgorithm == 1) {
        return 1;
    }
    if (signatureAlgorithm == 3) {
        return 1;
    }
    if (signatureAlgorithm == 4) {
        return 1;
    }
    if (signatureAlgorithm == 7) {
        return 2;
    }
    if (signatureAlgorithm == 8) {
        return 2;
    }
    if (signatureAlgorithm == 9) {
        return 2;
    }
    if (signatureAlgorithm == 10) {
        return 1;
    }
    if (signatureAlgorithm == 11) {
        return 1;
    }
    if (signatureAlgorithm == 12) {
        return 1;
    }
    if (signatureAlgorithm == 13) {
        return 1;
    }
    if (signatureAlgorithm == 14) {
        return 1;
    }
    return 0;

}

function getExponentBits(signatureAlgorithm) {
    // returns the amounts of bits of the exponent of type 2^n +1
    if (signatureAlgorithm == 1 ) {
        return 17; // 65537
    }
    if (signatureAlgorithm == 3 ) {
        return 17;
    }
    if (signatureAlgorithm == 4 ) {
        return 17;
    }
    if (signatureAlgorithm == 10) {
        return 17;
    }
    if (signatureAlgorithm == 11) {
        return 17;
    }
    if (signatureAlgorithm == 13) {
        return 2; // 3
    }
    if (signatureAlgorithm == 14) {
        return 17;
    }
    return 0;
}

function getPadding(signatureAlgorithm) {
    var padding[5];
    if (signatureAlgorithm == 3) {
        padding[0] = 83887124; // 5000414
        padding[1] = 650212878678426138; // 906052B0E03021A
        padding[2] = 18446744069417738544; // FFFFFFFF00302130
        padding[3] = 18446744073709551615; // FFFFFFFFFFFFFFFF
        padding[4] = 562949953421311; // 1FFFFFFFFFFFF
    }
    if (
        signatureAlgorithm == 1 ||
        signatureAlgorithm == 4 ||
        signatureAlgorithm == 13
    ) {
        padding[0] = 217300885422736416; // 304020105000420
        padding[1] = 938447882527703397; // D06096086480165
        padding[2] = 18446744069417742640; // FFFFFFFF00303130
        padding[3] = 18446744073709551615; // FFFFFFFFFFFFFFFF
        padding[4] = 562949953421311; // 1FFFFFFFFFFFF
    }

    if (signatureAlgorithm == 14) {
        padding[0] = 83887136; // 5000420
        padding[1] = 4030602964456935904153698817; // D0609608648016503040201
        padding[2] = 79228162514264337589252141360; // FFFFFFFFFFFFFFFF00303130
        padding[3] = 79228162514264337593543950335; // FFFFFFFFFFFFFFFFFFFFFFFF
        padding[4] = 2417851639229258349412351; // 1FFFFFFFFFFFFFFFFFFFF
    }
    return padding;
}