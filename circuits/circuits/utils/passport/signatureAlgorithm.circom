pragma circom 2.1.9;

/*
 ID to Signature Algorithm
  1: rsa_sha256_65537_2048
  3: rsa_sha1_65537_2048
  4: rsapss_sha256_65537_2048
  7: ecdsa_sha1_secp256r1_256
  8: ecdsa_sha256_secp256r1_256
  9: ecdsa_sha384_secp384r1_384
 10: rsa_sha256_65537_4096
 11: rsa_sha1_65537_4096
 12: rsapss_sha256_65537_4096
 13: rsa_sha256_3_2048
 14: rsa_sha256_65537_3072
 15: rsa_sha512_65537_4096
 16: rsapss_sha256_3_3072
 17: rsapss_sha256_3_4096
 18: rsapss_sha384_65537_3072
 19: rsapss_sha256_65537_3072
 21: ecdsa_sha256_brainpoolP256r1_256
 22: ecdsa_sha384_brainpoolP384r1_384
 23: ecdsa_sha256_secp384r1_384
 24: ecdsa_sha384_brainpoolP256r1_256
 25: ecdsa_sha512_brainpoolP256r1_256
 26: ecdsa_sha512_brainpoolP384r1_384
 27: ecdsa_sha1_brainpoolP224r1_224
*/

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
    if (signatureAlgorithm == 15) {
        return 512;
    }
    if (signatureAlgorithm == 16) {
        return 256;
    }
    if (signatureAlgorithm == 17) {
        return 256;
    }
    if (signatureAlgorithm == 18) {
        return 384;
    }
    if (signatureAlgorithm == 19) {
        return 256;
    }
    if (signatureAlgorithm == 20) {
        return 256;
    }
    if (signatureAlgorithm == 21) { 
        return 256;
    }
    if (signatureAlgorithm == 22) {
        return 384;
    }
    if (signatureAlgorithm == 23) { 
        return 256;
    }
    if (signatureAlgorithm == 24) {
        return 384;
    }
    if (signatureAlgorithm == 25) {
        return 512; 
    }
    if (signatureAlgorithm == 26) { 
        return 512;
    }
    if (signatureAlgorithm == 27) { 
        return 160;
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
    if (signatureAlgorithm == 15) {
        return 4096;
    }
    if (signatureAlgorithm == 16) {
        return 3072;
    }
    if (signatureAlgorithm == 17) {
        return 4096;
    }
    if (signatureAlgorithm == 18) {
        return 3072;
    }
    if (signatureAlgorithm == 19) {
        return 3072;
    }
    if (signatureAlgorithm == 21) { 
        return 256;
    }
    if (signatureAlgorithm == 22) { 
        return 384;
    }
    if (signatureAlgorithm == 23) { 
        return 384;
    }
    if (signatureAlgorithm == 24) { 
        return 256;
    } 
    if (signatureAlgorithm == 25) { 
        return 256;
    }
    if (signatureAlgorithm == 26) { 
        return 384;
    }
    if (signatureAlgorithm == 27) { 
        return 224;
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
    if (signatureAlgorithm == 15) {
        return 1;
    }
    if (signatureAlgorithm == 16) {
        return 1;
    }
    if (signatureAlgorithm == 17) {
        return 1;
    }
    if (signatureAlgorithm == 18) {
        return 1;
    }
    if (signatureAlgorithm == 19) {
        return 1;
    }
    if (signatureAlgorithm == 21) { 
        return 2;
    }
    if (signatureAlgorithm == 22) { 
        return 2;
    }
    if (signatureAlgorithm == 23) { 
        return 2;
    }
    if (signatureAlgorithm == 24) { 
        return 2;
    }
    if (signatureAlgorithm == 25) { 
        return 2;
    }
    if (signatureAlgorithm == 26) { 
        return 2;
    }
    if (signatureAlgorithm == 27) { 
        return 2;
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
    if (signatureAlgorithm == 12) {
        return 17;
    }
    if (signatureAlgorithm == 13) {
        return 2; // 3
    }
    if (signatureAlgorithm == 14) {
        return 17;
    }
    if (signatureAlgorithm == 15) {
        return 17;
    }
    if (signatureAlgorithm == 16) {
        return 2;
    }
    if (signatureAlgorithm == 17) {
        return 2;
    }
    if (signatureAlgorithm == 18) {
        return 17;
    }
    if (signatureAlgorithm == 19) {
        return 17;
    }
    return 0;
}

function getPadding(signatureAlgorithm) {
    var padding[5];
    if (
        signatureAlgorithm == 3 ||
        signatureAlgorithm == 11
    ) {
        padding[0] = 83887124; // 5000414
        padding[1] = 650212878678426138; // 906052B0E03021A
        padding[2] = 18446744069417738544; // FFFFFFFF00302130
        padding[3] = 18446744073709551615; // FFFFFFFFFFFFFFFF
        padding[4] = 562949953421311; // 1FFFFFFFFFFFF
    }
    if (
        signatureAlgorithm == 1 ||
        signatureAlgorithm == 4 ||
        signatureAlgorithm == 10 ||
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

    if (signatureAlgorithm == 15) {
        padding[0] = 217300894012671040; // 304020305000440
        padding[1] = 938447882527703397; // D06096086480165
        padding[2] = 18446744069417750832; // FFFFFFFF00305130
        padding[3] = 18446744073709551615; // FFFFFFFFFFFFFFFF
        padding[4] = 562949953421311; // 1FFFFFFFFFFFF
    }
    return padding;
}