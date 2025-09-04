pragma circom 2.1.9;

include "@openpassport/zk-email-circuits/lib/bigint.circom";
include "./pkcs1v1_5Padding.circom";
include "../FpPowMod.circom";

/// @title VerifyRsaGenericPkcs1v1_5
/// @notice Verifies RSA signatures with generic exponent using PKCS#1 v1.5 padding
/// @dev Supports RSA key sizes of 2048, 3072, and 4096 bits
/// @param CHUNK_SIZE Number of bits per chunk (typically 64)
/// @param CHUNK_NUMBER Number of chunks (32 for 2048-bit RSA, 48 for 3072-bit, 64 for 4096-bit)
/// @param HASH_SIZE Size of the hash in bits (160 for SHA1, 256 for SHA256, 384 for SHA384 and 512 for SHA512)
/// @input signature The RSA signature split into chunks
/// @input modulus The RSA modulus split into chunks
/// @input message The message hash to verify
template VerifyRsaGenericPkcs1v1_5(CHUNK_SIZE, CHUNK_NUMBER, HASH_SIZE, signatureAlgorithm) {
    signal input signature[CHUNK_NUMBER];
    signal input modulus[CHUNK_NUMBER];

    signal input message[CHUNK_NUMBER];

    // 1. Add padding to the hashed message
    component padder = Pkcs1v1_5Padding(CHUNK_SIZE, CHUNK_NUMBER, HASH_SIZE);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        padder.modulus[i] <== modulus[i];
        padder.message[i] <== message[i];
    }

    // 2. Check that the signature is in proper form and reduced mod modulus.
    component signatureRangeCheck[CHUNK_NUMBER];
    component bigLessThan = BigLessThan(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        signatureRangeCheck[i] = Num2Bits(CHUNK_SIZE);
        signatureRangeCheck[i].in <== signature[i];
        bigLessThan.a[i] <== signature[i];
        bigLessThan.b[i] <== modulus[i];
    }
    bigLessThan.out === 1;

    // 3. Compute the signature^exponent mod modulus
    component bigPow = FpPowGenericMod(CHUNK_SIZE, CHUNK_NUMBER, signatureAlgorithm);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        bigPow.base[i] <== signature[i];
        bigPow.modulus[i] <== modulus[i];
    }

    // 4. Check that the computed value is equal to the padded message
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        bigPow.out[i] === padder.out[i];
    }
}
