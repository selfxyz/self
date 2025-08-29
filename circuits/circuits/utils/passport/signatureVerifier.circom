pragma circom 2.1.9;

include "../crypto/signature/rsapss/rsapss3.circom";
include "../crypto/signature/rsapss/rsapss65537.circom";
include "../crypto/signature/ecdsa/ecdsaVerifier.circom";
include "../crypto/signature/rsa/verifyRsa3Pkcs1v1_5.circom";
include "../crypto/signature/rsa/verifyRsa65537Pkcs1v1_5.circom";
include "../crypto/signature/rsa/VerifyRsa64321Pkcs1v1_5.circom";
include "../crypto/signature/rsa/verifyRsa130689Pkcs1v1_5.circom";
include "../crypto/signature/rsa/verifyRsa122125Pkcs1v1_5.circom";
include "../crypto/signature/rsa/verifyRsa107903Pkcs1v1_5.circom";
include "../crypto/signature/rsa/verifyRsa56611Pkcs1v1_5.circom";
include "@openpassport/zk-email-circuits/utils/bytes.circom";

/// @title SignatureVerifier
/// @notice verifies signature — routes to the correct signature verification circuit according to the signature algorithm ID
/// @param signatureAlgorithm ID of the signature algorithm
/// @param n Number of bits per chunk the key is split into.
/// @param k Number of chunks the key is split into.
/// @input hash Hash of the data to verify
/// @input pubKey Public key for signature verification
/// @input signature Signature to verify
template SignatureVerifier(signatureAlgorithm, n, k) {
    var kLengthFactor = getKLengthFactor(signatureAlgorithm);
    var kScaled = k * kLengthFactor;

    var HASH_LEN_BITS = getHashLength(signatureAlgorithm);

    signal input hash[HASH_LEN_BITS];
    signal input pubKey[kScaled];
    signal input signature[kScaled];

    var msg_len = (HASH_LEN_BITS + n - 1) \ n;

    signal hashParsed[msg_len] <== HashParser(signatureAlgorithm, n, k)(hash);

    if (
        signatureAlgorithm == 1
        || signatureAlgorithm == 3
        || signatureAlgorithm == 10
        || signatureAlgorithm == 11
        || signatureAlgorithm == 14
        || signatureAlgorithm == 15
        || signatureAlgorithm == 31
        || signatureAlgorithm == 34
    ) {
        component rsa65537 = VerifyRsa65537Pkcs1v1_5(n, k, HASH_LEN_BITS);
        for (var i = 0; i < msg_len; i++) {
            rsa65537.message[i] <== hashParsed[i];
        }
        for (var i = msg_len; i < k; i++) {
            rsa65537.message[i] <== 0;
        }
        rsa65537.modulus <== pubKey;
        rsa65537.signature <== signature;
    } else if (signatureAlgorithm == 47) {
        component rsa64321 = VerifyRsa64321Pkcs1v1_5(n, k, HASH_LEN_BITS);
        for (var i = 0; i < msg_len; i++) {
            rsa64321.message[i] <== hashParsed[i];
        }
        for (var i = msg_len; i < k; i++) {
            rsa64321.message[i] <== 0;
        }
        rsa64321.modulus <== pubKey;
        rsa64321.signature <== signature;
    } else if (signatureAlgorithm == 48) {
        component rsa130689 = VerifyRsa130689Pkcs1v1_5(n, k, HASH_LEN_BITS);
        for (var i = 0; i < msg_len; i++) {
            rsa130689.message[i] <== hashParsed[i];
        }
        for (var i = msg_len; i < k; i++) {
            rsa130689.message[i] <== 0;
        }
        rsa130689.modulus <== pubKey;
        rsa130689.signature <== signature;
    } else if(signatureAlgorithm == 49) {
        component rsa122125 = VerifyRsa122125Pkcs1v1_5(n, k, HASH_LEN_BITS);
        for (var i = 0; i < msg_len; i++) {
            rsa122125.message[i] <== hashParsed[i];
        }
        for (var i = msg_len; i < k; i++) {
            rsa122125.message[i] <== 0;
        }
        rsa122125.modulus <== pubKey;
        rsa122125.signature <== signature;
    } else if (signatureAlgorithm == 50) {
        component rsa107903 = VerifyRsa107903Pkcs1v1_5(n, k, HASH_LEN_BITS);
        for (var i = 0; i < msg_len; i++) {
            rsa107903.message[i] <== hashParsed[i];
        }
        for (var i = msg_len; i < k; i++) {
            rsa107903.message[i] <== 0;
        }
        rsa107903.modulus <== pubKey;
        rsa107903.signature <== signature;
    } else if (signatureAlgorithm == 51) {
        component rsa56611 = VerifyRsa56611Pkcs1v1_5(n, k, HASH_LEN_BITS);
        for (var i = 0; i < msg_len; i++) {
            rsa56611.message[i] <== hashParsed[i];
        }
        for (var i = msg_len; i < k; i++) {
            rsa56611.message[i] <== 0;
        }
        rsa56611.modulus <== pubKey;
        rsa56611.signature <== signature;
    } else if (
        signatureAlgorithm == 13
        || signatureAlgorithm == 32
        || signatureAlgorithm == 33
    ) {
        component rsa3 = VerifyRsa3Pkcs1v1_5(n, k, HASH_LEN_BITS);
        for (var i = 0; i < msg_len; i++) {
            rsa3.message[i] <== hashParsed[i];
        }
        for (var i = msg_len; i < k; i++) {
            rsa3.message[i] <== 0;
        }
        rsa3.modulus <== pubKey;
        rsa3.signature <== signature;
    } else if (
        signatureAlgorithm == 4
        || signatureAlgorithm == 12
        || signatureAlgorithm == 18
        || signatureAlgorithm == 19
        || signatureAlgorithm == 35
        || signatureAlgorithm == 39
        || signatureAlgorithm == 42
        || signatureAlgorithm == 45
        || signatureAlgorithm == 46
    ) {
        var pubKeyBitsLength = getMinKeyLength(signatureAlgorithm);
        // Handle Denmark when salt length is 64 but sha256 is used
        var SALT_LEN = signatureAlgorithm == 46 ? 64 : HASH_LEN_BITS / 8;
        var E_BITS = getExponentBits(signatureAlgorithm);
        component rsaPss65537ShaVerification = VerifyRsaPss65537Sig(n, k, SALT_LEN, HASH_LEN_BITS, pubKeyBitsLength);
        rsaPss65537ShaVerification.pubkey <== pubKey;
        rsaPss65537ShaVerification.signature <== signature;
        rsaPss65537ShaVerification.hashed <== hash; // send the raw hash

    } else if (
        signatureAlgorithm == 16
        || signatureAlgorithm == 17
        || signatureAlgorithm == 43
    ) {
        var pubKeyBitsLength = getMinKeyLength(signatureAlgorithm);
        var SALT_LEN = HASH_LEN_BITS / 8;
        var E_BITS = getExponentBits(signatureAlgorithm);

        component rsaPss3ShaVerification = VerifyRsaPss3Sig(n, k, SALT_LEN, HASH_LEN_BITS, pubKeyBitsLength);
        rsaPss3ShaVerification.pubkey <== pubKey;
        rsaPss3ShaVerification.signature <== signature;
        rsaPss3ShaVerification.hashed <== hash; // send the raw hash

    } else if (
        signatureAlgorithm == 9
        || signatureAlgorithm == 7
        || signatureAlgorithm == 8
        || signatureAlgorithm == 9
        || signatureAlgorithm == 21
        || signatureAlgorithm == 22
        || signatureAlgorithm == 23
        || signatureAlgorithm == 24
        || signatureAlgorithm == 25
        || signatureAlgorithm == 26
        || signatureAlgorithm == 27
        || signatureAlgorithm == 28
        || signatureAlgorithm == 29
        || signatureAlgorithm == 30
        || signatureAlgorithm == 36
        || signatureAlgorithm == 37
        || signatureAlgorithm == 38
        || signatureAlgorithm == 40
        || signatureAlgorithm == 41
        || signatureAlgorithm == 44
    ) {
        EcdsaVerifier(signatureAlgorithm, n, k)(signature, pubKey, hash);
    } else {
        assert(1==0);
    }
}


template HashParser(signatureAlgorithm, n, k) {
    var HASH_LEN_BITS = getHashLength(signatureAlgorithm);
    var msg_len = (HASH_LEN_BITS + n - 1) \ n;

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
