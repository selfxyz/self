pragma circom 2.1.9;

/***

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
 28: ecdsa_sha256_brainpoolP224r1_224
 29: ecdsa_sha512_brainpoolP512r1_512
 30: ecdsa_sha224_brainpoolP224r1_224
 31: rsa_sha512_65537_2048
 32: rsa_sha256_3_4096
 33: rsa_sha1_3_4096
 34: rsa_sha384_65537_4096
 35: rsapss_sha384_65537_4096
 36: ecdsa_sha1_brainpoolP256r1_256
 37: ecdsa_sha256_brainpoolP384r1_384
 38: ecdsa_sha384_brainpoolP512r1_512
 39: rsapss_sha512_65537_4096
 40: ecdsa_sha256_secp521r1_256
 41: ecdsa_sha512_secp521r1_521
 42: rsapss_sha512_65537_2048
 43: rsapss_sha256_3_2048
 44: ecdsa_sha224_secp224r1_224
 45: rsapss_sha384_65537_2048
 46: rsapss_sha256_65537_2048 salt 64
 47: rsa_sha1_64321_4096
 48: rsa_sha256_130689_4096
 49: rsa_sha256_122125_4096
 50: rsa_sha256_107903_4096
 51: rsa_sha256_56611_4096
*/


/// @title GetHashLength
/// @notice Returns the length of the hash in bits for a given signature algorithm
/// @param signatureAlgorithm ID of the signature algorithm
/// @output hashLength Length of the hash in bits
function getHashLength(signatureAlgorithm) {
    if (signatureAlgorithm == 1 ) {
        return 256;
    } else if (signatureAlgorithm == 3) {
        return 160;
    } else if (signatureAlgorithm == 4) {
        return 256;
    } else if (signatureAlgorithm == 7) {
        return 160;
    } else if (signatureAlgorithm == 8) {
        return 256;
    } else if (signatureAlgorithm == 9) {
        return 384;
    } else if (signatureAlgorithm == 10) {
        return 256;
    } else if (signatureAlgorithm == 11) {
        return 160;
    } else if (signatureAlgorithm == 12) {
        return 256;
    } else if (signatureAlgorithm == 13) {
        return 256;
    } else if (signatureAlgorithm == 14) {
        return 256;
    } else if (signatureAlgorithm == 15) {
        return 512;
    } else if (signatureAlgorithm == 16) {
        return 256;
    } else if (signatureAlgorithm == 17) {
        return 256;
    } else if (signatureAlgorithm == 18) {
        return 384;
    } else if (signatureAlgorithm == 19) {
        return 256;
    } else if (signatureAlgorithm == 21) {
        return 256;
    } else if (signatureAlgorithm == 22) {
        return 384;
    } else if (signatureAlgorithm == 23) {
        return 256;
    } else if (signatureAlgorithm == 24) {
        return 384;
    } else if (signatureAlgorithm == 25) {
        return 512;
    } else if (signatureAlgorithm == 26) {
        return 512;
    } else if (signatureAlgorithm == 27) {
        return 160;
    } else if (signatureAlgorithm == 28) {
        return 256;
    } else if (signatureAlgorithm == 29) {
        return 512;
    } else if (signatureAlgorithm == 30) {
        return 224;
    } else if (signatureAlgorithm == 31) {
        return 512;
    } else if (signatureAlgorithm == 32) {
        return 256;
    } else if (signatureAlgorithm == 33) {
        return 160;
    } else if (signatureAlgorithm == 34) {
        return 384;
    } else if (signatureAlgorithm == 35) {
        return 384;
    } else if (signatureAlgorithm == 36) {
        return 160;
    } else if (signatureAlgorithm == 37) {
        return 256;
    } else if (signatureAlgorithm == 38) {
        return 384;
    } else if (signatureAlgorithm == 39) {
        return 512;
    } else if (signatureAlgorithm == 40) {
        return 256;
    } else if (signatureAlgorithm == 41) {
        return 512;
    } else if (signatureAlgorithm == 42) {
        return 512;
    } else if (signatureAlgorithm == 43) {
        return 256;
    } else if (signatureAlgorithm == 44) {
        return 224;
    } else if (signatureAlgorithm == 45) {
        return 384;
    } else if (signatureAlgorithm == 46) {
        return 256;
    } else if (signatureAlgorithm == 47) {
        return 160;
    } else if (signatureAlgorithm == 48) {
        return 256;
    } else if (signatureAlgorithm == 49) {
        return 256;
    } else if (signatureAlgorithm == 50) {
        return 256;
    } else if (signatureAlgorithm == 51) {
        return 256;
    } else {
        assert(1==0);
        return 0;
    }
}

/// @title GetMinKeyLength
/// @notice Returns the minimum length of the key in bits for a given signature algorithm
/// @param signatureAlgorithm ID of the signature algorithm
/// @output keyLength Minimum length of the key in bits
/// @dev for RSAPSS and ECDSA, it's always the same as in the circuit name
/// @dev for RSA, it can be lower, because we use the same circuit for multiple key lengths
function getMinKeyLength(signatureAlgorithm) {
    if (signatureAlgorithm == 1) {
        return 2048;
    } else if (signatureAlgorithm == 3) {
        return 2048;
    } else if (signatureAlgorithm == 4) {
        return 2048;
    } else if (signatureAlgorithm == 7) {
        return 256;
    } else if (signatureAlgorithm == 8) {
        return 256;
    } else if (signatureAlgorithm == 9) {
        return 384;
    } else if (signatureAlgorithm == 10) {
        return 2048; // down to 2048 for 4096
    } else if (signatureAlgorithm == 11) {
        return 2048; // down to 2048 for 4096
    } else if (signatureAlgorithm == 12) {
        return 4096;
    } else if (signatureAlgorithm == 13) {
        return 2048;
    } else if (signatureAlgorithm == 14) {
        return 2048; // down to 2048 for 3072 (not used now)
    } else if (signatureAlgorithm == 15) {
        return 2048; // down to 2048 for 4096
    } else if (signatureAlgorithm == 16) {
        return 3072;
    } else if (signatureAlgorithm == 17) {
        return 4096;
    } else if (signatureAlgorithm == 18) {
        return 3072;
    } else if (signatureAlgorithm == 19) {
        return 3072;
    } else if (signatureAlgorithm == 21) {
        return 256;
    } else if (signatureAlgorithm == 22) {
        return 384;
    } else if (signatureAlgorithm == 23) {
        return 384;
    } else if (signatureAlgorithm == 24) {
        return 256;
    } else if (signatureAlgorithm == 25) {
        return 256;
    } else if (signatureAlgorithm == 26) {
        return 384;
    } else if (signatureAlgorithm == 27) {
        return 224;
    } else if (signatureAlgorithm == 28) {
        return 224;
    } else if (signatureAlgorithm == 29) {
        return 512;
    } else if (signatureAlgorithm == 30) {
        return 224;
    } else if (signatureAlgorithm == 31) {
        return 2048;
    } else if (signatureAlgorithm == 32) {
        return 2048; // down to 2048 for 4096
    } else if (signatureAlgorithm == 33) {
        return 2048; // down to 2048 for 4096
    } else if (signatureAlgorithm == 34) {
        return 2048; // down to 2048 for 4096
    } else if (signatureAlgorithm == 35) {
        return 4096;
    } else if (signatureAlgorithm == 36) {
        return 256;
    } else if (signatureAlgorithm == 37) {
        return 384;
    } else if (signatureAlgorithm == 38) {
        return 512;
    } else if (signatureAlgorithm == 39) {
        return 4096;
    } else if (signatureAlgorithm == 40) {
        return 528;
    } else if (signatureAlgorithm == 41) {
        return 528;
    } else if (signatureAlgorithm == 42) {
        return 2048;
    } else if (signatureAlgorithm == 43) {
        return 2048;
    } else if (signatureAlgorithm == 44) {
        return 224;
    } else if (signatureAlgorithm == 45) {
        return 2048;
    } else if (signatureAlgorithm == 46) {
        return 2048;
    } else if (signatureAlgorithm == 47) {
        return 4096;
    } else if (signatureAlgorithm == 48) {
        return 4096;
    } else if (signatureAlgorithm == 49) {
        return 4096;
    } else if (signatureAlgorithm == 50) {
        return 4096;
    } else if (signatureAlgorithm == 51) {
        return 4096;
    } else {
        assert(1==0);
        return 0;
    }
}

/// @title GetKLengthFactor
/// @notice Returns the length factor for the key in bits for a given signature algorithm — 1 for rsa, 2 for ecdsa
/// @param signatureAlgorithm ID of the signature algorithm
/// @output kLengthFactor Length factor for the key in bits
/// @dev needed as ecdsa keys are composed of x and y coordinates, rsa keys are just the modulus (exponent is defined below)
function getKLengthFactor(signatureAlgorithm) {
    if (signatureAlgorithm == 1) {
        return 1;
    } else if (signatureAlgorithm == 3) {
        return 1;
    } else if (signatureAlgorithm == 4) {
        return 1;
    } else if (signatureAlgorithm == 7) {
        return 2;
    } else if (signatureAlgorithm == 8) {
        return 2;
    } else if (signatureAlgorithm == 9) {
        return 2;
    } else if (signatureAlgorithm == 10) {
        return 1;
    } else if (signatureAlgorithm == 11) {
        return 1;
    } else if (signatureAlgorithm == 12) {
        return 1;
    } else if (signatureAlgorithm == 13) {
        return 1;
    } else if (signatureAlgorithm == 14) {
        return 1;
    } else if (signatureAlgorithm == 15) {
        return 1;
    } else if (signatureAlgorithm == 16) {
        return 1;
    } else if (signatureAlgorithm == 17) {
        return 1;
    } else if (signatureAlgorithm == 18) {
        return 1;
    } else if (signatureAlgorithm == 19) {
        return 1;
    } else if (signatureAlgorithm == 21) {
        return 2;
    } else if (signatureAlgorithm == 22) {
        return 2;
    } else if (signatureAlgorithm == 23) {
        return 2;
    } else if (signatureAlgorithm == 24) {
        return 2;
    } else if (signatureAlgorithm == 25) {
        return 2;
    } else if (signatureAlgorithm == 26) {
        return 2;
    } else if (signatureAlgorithm == 27) {
        return 2;
    } else if (signatureAlgorithm == 28) {
        return 2;
    } else if (signatureAlgorithm == 29) {
        return 2;
    } else if (signatureAlgorithm == 30) {
        return 2;
    } else if (signatureAlgorithm == 31) {
        return 1;
    } else if (signatureAlgorithm == 32) {
        return 1;
    } else if (signatureAlgorithm == 33) {
        return 1;
    } else if (signatureAlgorithm == 34) {
        return 1;
    } else if (signatureAlgorithm == 35) {
        return 1;
    } else if (signatureAlgorithm == 36) {
        return 2;
    } else if (signatureAlgorithm == 37) {
        return 2;
    } else if (signatureAlgorithm == 38) {
        return 2;
    } else if (signatureAlgorithm == 39) {
        return 1;
    } else if (signatureAlgorithm == 40) {
        return 2;
    } else if (signatureAlgorithm == 41) {
        return 2;
    } else if (signatureAlgorithm == 42) {
        return 1;
    } else if (signatureAlgorithm == 43) {
        return 1;
    } else if (signatureAlgorithm == 44) {
        return 2;
    } else if (signatureAlgorithm == 45) {
        return 1;
    } else if (signatureAlgorithm == 46) {
        return 1;
    } else if (signatureAlgorithm == 47) {
        return 1;
    } else if (signatureAlgorithm == 48) {
        return 1;
    } else if (signatureAlgorithm == 49) {
        return 1;
    } else if (signatureAlgorithm == 50) {
        return 1;
    } else if (signatureAlgorithm == 51) {
        return 1;
    } else {
        assert(1==0);
        return 0;
    }
}

/// @title GetExponentBits
/// @notice Returns the amounts of bits of the exponent of type 2^n +1
/// @param signatureAlgorithm ID of the signature algorithm
/// @output exponentBits Amount of bits of the exponent
function getExponentBits(signatureAlgorithm) {
    if (signatureAlgorithm == 1) {
        return 17; // 65537
    } else if (signatureAlgorithm == 3) {
        return 17;
    } else if (signatureAlgorithm == 4) {
        return 17;
    } else if (signatureAlgorithm == 10) {
        return 17;
    } else if (signatureAlgorithm == 11) {
        return 17;
    } else if (signatureAlgorithm == 12) {
        return 17;
    } else if (signatureAlgorithm == 13) {
        return 2; // 3
    } else if (signatureAlgorithm == 14) {
        return 17;
    } else if (signatureAlgorithm == 15) {
        return 17;
    } else if (signatureAlgorithm == 16) {
        return 2;
    } else if (signatureAlgorithm == 17) {
        return 2;
    } else if (signatureAlgorithm == 18) {
        return 17;
    } else if (signatureAlgorithm == 19) {
        return 17;
    } else if (signatureAlgorithm == 31) {
        return 17;
    } else if (signatureAlgorithm == 32) {
        return 2;
    } else if (signatureAlgorithm == 33) {
        return 2;
    } else if (signatureAlgorithm == 34) {
        return 17;
    } else if (signatureAlgorithm == 35) {
        return 17;
    } else if (signatureAlgorithm == 39) {
        return 17;
    } else if (signatureAlgorithm == 42) {
        return 17;
    } else if (signatureAlgorithm == 43) {
        return 2;
    } else if (signatureAlgorithm == 45) {
        return 17;
    } else if (signatureAlgorithm == 46) {
        return 17;
    } else if (signatureAlgorithm == 47) {
        return 16;
    } else if (signatureAlgorithm == 48) {
        return 17;
    } else if (signatureAlgorithm == 49) {
        return 17;
    } else if (signatureAlgorithm == 50) {
        return 17;
    } else if (signatureAlgorithm == 51) {
        return 16;
    } else {
        assert(1==0);
        return 0;
    }
}

// suffix is 5 bits for 65537, 3 bits for 3
function getSuffixLength(signatureAlgorithm) {
    var exponentBits = getExponentBits(signatureAlgorithm);
    if (exponentBits == 17) {
        return 5;
    } else if (exponentBits == 2) {
        return 3;
    } else if (exponentBits == 16) {
        return 5;
    }  else {
        assert(1==0);
        return 0;
    }
}

function getSuffix(signatureAlgorithm) {
    var exponentBits = getExponentBits(signatureAlgorithm);
    if (signatureAlgorithm == 48) {
        return [0x02, 0x03, 0x01, 0xFE, 0x81]; // 3 bytes, 01, FE, 81 means 130689
    }
    if (signatureAlgorithm == 49) {
        return [0x02, 0x03, 0x01, 0xdd, 0x0d]; // 3 bytes, 01, dd, 0d means 122125
    }
    if (signatureAlgorithm == 50) {
        return [0x02, 0x03, 0x01, 0xa5, 0x7f]; // 3 bytes, 01, a5, 7f means 107903
    }
    if (signatureAlgorithm == 51) {
        return [0x02, 0x03, 0x00, 0xdd, 0x23]; // 3 bytes, 00, dd, 23 means 56611
    }
    if (exponentBits == 17) {
        return [0x02, 0x03, 0x01, 0x00, 0x01]; // 3 bytes, 01, 00, 01 means 65537
    } else if (exponentBits == 2) {
        return [0x02, 0x01, 0x03]; // 1 byte, 03 means 3
    } else if (exponentBits == 16) {
        return [0x02, 0x03, 0x00, 0xFB, 0x41]; //3 bytes, 00, fb, 41 means 64321
    } else {
        assert(1==0);
        return [0x00, 0x00, 0x00];
    }
}



// Prefixes include the whole sequence, including the OID and the der encoding before the key
function getValidRSAPrefixes() {
    var prefixes[7][33];


    // ---- CORRECT FORMATTING ----
    // 2048 bits, e=65537
    prefixes[0] = [0x30, 0x82, 0x01, 0x22, 0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00, 0x03, 0x82, 0x01, 0x0f, 0x00, 0x30, 0x82, 0x01, 0x0a, 0x02, 0x82, 0x01, 0x01, 0x00];
    // 2048 bits, e=3
    prefixes[1] = [0x30, 0x82, 0x01, 0x20, 0x30, 0x0D, 0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x01, 0x05, 0x00, 0x03, 0x82, 0x01, 0x0d, 0x00, 0x30, 0x82, 0x01, 0x08, 0x02, 0x82, 0x01, 0x01, 0x00];
    // 3072 bits, e=65537
    prefixes[2] = [0x30, 0x82, 0x01, 0xa2, 0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00, 0x03, 0x82, 0x01, 0x8f, 0x00, 0x30, 0x82, 0x01, 0x8a, 0x02, 0x82, 0x01, 0x81, 0x00];
    // 3072 bits, e=3
    prefixes[3] = [0x30, 0x82, 0x01, 0xa0, 0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00, 0x03, 0x82, 0x01, 0x8d, 0x00, 0x30, 0x82, 0x01, 0x88, 0x02, 0x82, 0x01, 0x81, 0x00];
    // 4096 bits, e=65537
    prefixes[4] = [0x30, 0x82, 0x02, 0x22, 0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00, 0x03, 0x82, 0x02, 0x0f, 0x00, 0x30, 0x82, 0x02, 0x0a, 0x02, 0x82, 0x02, 0x01, 0x00];
    // 4096 bits, e=3
    prefixes[5] = [0x30, 0x82, 0x02, 0x20, 0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00, 0x03, 0x82, 0x02, 0x0d, 0x00, 0x30, 0x82, 0x02, 0x08, 0x02, 0x82, 0x02, 0x01, 0x00];

    // ---- Estonia, missing two null bytes ----
    // 4096 bits, e=65537
    prefixes[6] = [0x69, 0x61, 0x30, 0x82, 0x02, 0x20, 0x30, 0x0B, 0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x01, 0x03, 0x82, 0x02, 0x0F, 0x00, 0x30, 0x82, 0x02, 0x0A, 0x02, 0x82, 0x02, 0x01, 0x00];

    return prefixes;
}

function prefixIndexToRSAKeyLength() {
    var keyLengths[7] = [2048, 2048, 3072, 3072, 4096, 4096, 4096];
    return keyLengths;
}

function getValidECDSAPrefixes() {
    var prefixes[13][33];

    // 224-bit key
    prefixes[0] = [0x34, 0xaa, 0x26, 0x43, 0x66, 0x86, 0x2a, 0x18, 0x30, 0x25, 0x75, 0xd0, 0xfb, 0x98, 0xd1, 0x16, 0xbc, 0x4b, 0x6d, 0xde, 0xbc, 0xa3, 0xa5, 0xa7, 0x93, 0x9f, 0x02, 0x01, 0x01, 0x03, 0x3a, 0x00, 0x04];
    // 224-bit key
    prefixes[1] = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x16, 0xa2, 0xe0, 0xb8, 0xf0, 0x3e, 0x13, 0xdd, 0x29, 0x45, 0x5c, 0x5c, 0x2a, 0x3d, 0x02, 0x01, 0x01, 0x03, 0x3a, 0x00, 0x04];
    // 256-bit key
    prefixes[2] = [0xa9, 0xbc, 0x3e, 0x66, 0x0a, 0x90, 0x9d, 0x83, 0x8d, 0x71, 0x8c, 0x39, 0x7a, 0xa3, 0xb5, 0x61, 0xa6, 0xf7, 0x90, 0x1e, 0x0e, 0x82, 0x97, 0x48, 0x56, 0xa7, 0x02, 0x01, 0x01, 0x03, 0x42, 0x00, 0x04];
    // 256-bit key
    prefixes[3] = [0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xbc, 0xe6, 0xfa, 0xad, 0xa7, 0x17, 0x9e, 0x84, 0xf3, 0xb9, 0xca, 0xc2, 0xfc, 0x63, 0x25, 0x51, 0x02, 0x01, 0x01, 0x03, 0x42, 0x00, 0x04];
    // 256-bit key
    prefixes[4] = [0xdb, 0xa1, 0xee, 0xa9, 0xbc, 0x3e, 0x66, 0x0a, 0x90, 0x9d, 0x83, 0x8d, 0x71, 0x8c, 0x39, 0x7a, 0xa3, 0xb5, 0x61, 0xa6, 0xf7, 0x90, 0x1e, 0x0e, 0x82, 0x97, 0x48, 0x56, 0xa7, 0x03, 0x42, 0x00, 0x04];
    // 256-bit key
    prefixes[5] = [0x06, 0x13, 0x02, 0x4e, 0x4c, 0x30, 0x5a, 0x30, 0x14, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x09, 0x2b, 0x24, 0x03, 0x03, 0x02, 0x08, 0x01, 0x01, 0x07, 0x03, 0x42, 0x00, 0x04];
    // 384-bit key
    prefixes[6] = [0x56, 0xb3, 0x1f, 0x16, 0x6e, 0x6c, 0xac, 0x04, 0x25, 0xa7, 0xcf, 0x3a, 0xb6, 0xaf, 0x6b, 0x7f, 0xc3, 0x10, 0x3b, 0x88, 0x32, 0x02, 0xe9, 0x04, 0x65, 0x65, 0x02, 0x01, 0x01, 0x03, 0x62, 0x00, 0x04];
    // 384-bit key
    prefixes[7] = [0xff, 0xff, 0xc7, 0x63, 0x4d, 0x81, 0xf4, 0x37, 0x2d, 0xdf, 0x58, 0x1a, 0x0d, 0xb2, 0x48, 0xb0, 0xa7, 0x7a, 0xec, 0xec, 0x19, 0x6a, 0xcc, 0xc5, 0x29, 0x73, 0x02, 0x01, 0x01, 0x03, 0x62, 0x00, 0x04];
    // 384-bit key
    prefixes[8] = [0x41, 0x2d, 0x41, 0x4c, 0x47, 0x45, 0x52, 0x49, 0x41, 0x30, 0x76, 0x30, 0x10, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x22, 0x03, 0x62, 0x00, 0x04];
    // 384-bit key
    prefixes[9] = [0x55, 0x04, 0x0b, 0x0c, 0x04, 0x50, 0x49, 0x42, 0x41, 0x30, 0x76, 0x30, 0x10, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x22, 0x03, 0x62, 0x00, 0x04];
    // 512-bit key
    prefixes[10] = [0x19, 0x41, 0x86, 0x61, 0x19, 0x7f, 0xac, 0x10, 0x47, 0x1d, 0xb1, 0xd3, 0x81, 0x08, 0x5d, 0xda, 0xdd, 0xb5, 0x87, 0x96, 0x82, 0x9c, 0xa9, 0x00, 0x69, 0x02, 0x01, 0x01, 0x03, 0x81, 0x82, 0x00, 0x04];
    // 521-bit key
    prefixes[11] = [0x6b, 0x7f, 0xcc, 0x01, 0x48, 0xf7, 0x09, 0xa5, 0xd0, 0x3b, 0xb5, 0xc9, 0xb8, 0x89, 0x9c, 0x47, 0xae, 0xbb, 0x6f, 0xb7, 0x1e, 0x91, 0x38, 0x64, 0x09, 0x02, 0x01, 0x01, 0x03, 0x81, 0x86, 0x00, 0x04];
    // 521-bit key
    prefixes[12] = [0x20, 0x54, 0x75, 0x72, 0x6b, 0x65, 0x79, 0x30, 0x81, 0x9b, 0x30, 0x10, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x23, 0x03, 0x81, 0x86, 0x00, 0x04];

    return prefixes;
}

function prefixIndexToECDSAKeyLength() {
    var keyLengths[13] = [224, 224, 256, 256, 256, 256, 384, 384, 384, 384, 512, 528, 528];
    return keyLengths;
}
