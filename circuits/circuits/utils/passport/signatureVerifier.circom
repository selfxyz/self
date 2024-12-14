pragma circom 2.1.9;

// include "../rsa/rsaPkcs1.circom";
// include "secp256r1Verifier.circom";
// include "../rsapss/rsapss.circom";
// include "../rsa/rsa.circom";
// include "../rsa/verifyRsaPkcs1v1_5.circom";

template SignatureVerifier(signatureAlgorithm, n, k) {
    var kLengthFactor = getKLengthFactor(signatureAlgorithm);
    var kScaled = k * kLengthFactor;

    var HASH_LEN_BITS = getHashLength(signatureAlgorithm);

    signal input hash[HASH_LEN_BITS];
    signal input pubKey[kScaled];
    signal input signature[kScaled];

    var msg_len = (HASH_LEN_BITS + n) \ n;

    signal hashParsed[msg_len] <== HashParser(signatureAlgorithm, n, k)(hash);
   
    if (signatureAlgorithm == 1 || signatureAlgorithm == 10) { 
        // component rsa = RSAVerifier65537(n, k);
        // for (var i = 0; i < msg_len; i++) {
        //     rsa.message[i] <== hashParsed[i];
        // }
        // for (var i = msg_len; i < k; i++) {
        //     rsa.message[i] <== 0;
        // }
        // rsa.modulus <== pubKey;
        // rsa.signature <== signature;
    }
    if (signatureAlgorithm == 3 || signatureAlgorithm == 11) {
        // component rsa_pkcs1 = RSAVerifier65537Pkcs1(n, k);
        // for (var i = 0; i < msg_len; i++) {
        //     rsa_pkcs1.message[i] <== hashParsed[i];
        // }
        // for (var i = msg_len; i < k; i++) {
        //     rsa_pkcs1.message[i] <== 0;
        // }
        // rsa_pkcs1.modulus <== pubKey;
        // rsa_pkcs1.signature <== signature;
       
    }

    if (signatureAlgorithm == 4 || signatureAlgorithm == 12) {
        // var pubKeyBitsLength = getKeyLength(signatureAlgorithm);

        // component rsaPssSha256Verification = VerifyRsaPssSig(n, k, HASH_LEN_BITS, pubKeyBitsLength);
        // rsaPssSha256Verification.pubkey <== pubKey;
        // rsaPssSha256Verification.signature <== signature;
        // rsaPssSha256Verification.hashed <== hash; // send the raw hash

    }
    if (signatureAlgorithm == 7) {
        // Secp256r1Verifier (signatureAlgorithm,n,k)(signature, pubKey,hashParsed);
    }
    if (signatureAlgorithm == 8) {
        // Secp256r1Verifier (signatureAlgorithm,n,k)(signature, pubKey,hashParsed);
    }
    if (signatureAlgorithm == 9) {
    }
}


template HashParser(signatureAlgorithm, n, k) {
    var HASH_LEN_BITS = getHashLength(signatureAlgorithm);
    var msg_len = (HASH_LEN_BITS + n) \ n;

    component hashParser[msg_len];
    signal input hash[HASH_LEN_BITS];

    for (var i = 0; i < msg_len; i++) {
        hashParser[i] = Bits2Num(n);
    }
    for (var i = 0; i < HASH_LEN_BITS; i++) {
        hashParser[i \ n].in[i % n] <== hash[HASH_LEN_BITS - 1 - i];
    }
    for (var i = HASH_LEN_BITS; i < n * msg_len; i++) {
        hashParser[i \ n].in[i % n] <== 0;
    }
    signal output hashParsed[msg_len];
    for (var i = 0; i < msg_len ; i++ ){
        hashParsed[i] <== hashParser[i].out;
    }
}