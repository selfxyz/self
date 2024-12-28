pragma circom 2.1.9;

include "./signatureAlgorithm.circom";
include "../circomlib/signature/ecdsa.circom";

template EcdsaVerifier(signatureAlgorithm, n, k) {
    var kLengthFactor = getKLengthFactor(signatureAlgorithm);
    var kScaled = k * kLengthFactor;

    var HASH_LEN_BITS = getHashLength(signatureAlgorithm);

    signal input signature[kScaled];
    signal input pubKey[kScaled];
    signal input hashParsed[HASH_LEN_BITS];

    signal hash[n * k];

    if (HASH_LEN_BITS >= n * k) { 
        for (var i = 0; i < n * k; i++) {
            hash[i] <== hashParsed[i];
        }
    }
    if (HASH_LEN_BITS < n * k) {
        for (var i = n * k - 1; i >= 0; i--) {
            if (i <= n * k - 1 - HASH_LEN_BITS) {
                hash[i] <== 0;
            } else { 
                hash[i] <== hashParsed[i - n * k + HASH_LEN_BITS];
            }
        }
    }

    signal signature_r[k]; // ECDSA signature component r
    signal signature_s[k]; // ECDSA signature component s
    signal pubKey_x[k];
    signal pubKey_y[k];

    for (var i = 0; i < k; i++) {
        signature_r[i] <== signature[i];
        signature_s[i] <== signature[i + k];
        pubKey_x[i] <== pubKey[i];
        pubKey_y[i] <== pubKey[i + k];
    }
    signal pubkey_xy[2][k] <== [pubKey_x, pubKey_y];

    // verify eContentHash signature
    if (signatureAlgorithm == 7 || signatureAlgorithm == 8) {
        component ecdsa_verify = verifyECDSABits(n, k, [ 
            18446744073709551612, 
            4294967295, 
            0, 
            18446744069414584321 
        ], 
        [
            4309448131093880907,
            7285987128567378166,
            12964664127075681980,
            6540974713487397863
        ],
        [ 
            18446744073709551615, 
            4294967295, 
            0, 
            18446744069414584321 
        ], n * k);

        ecdsa_verify.pubkey <== pubkey_xy;
        ecdsa_verify.signature <== [signature_r, signature_s];
        ecdsa_verify.hashed <== hash;
        ecdsa_verify.dummy <== 0;
    }
    if (signatureAlgorithm == 9 || signatureAlgorithm == 23) {
        component ecdsa_verify = verifyECDSABits(n, k, [
            4294967292,
            18446744069414584320,
            18446744073709551614,
            18446744073709551615,
            18446744073709551615,
            18446744073709551615
        ],
        [
            3064076045283764975,
            14291673747578343837,
            221811693264799578,
            1737717031765098770,
            10992729701402291481,
            12912154004749740004
        ],
        [
            4294967295,
            18446744069414584320,
            18446744073709551614,
            18446744073709551615,
            18446744073709551615,
            18446744073709551615
        ], n * k);

        ecdsa_verify.pubkey <== pubkey_xy;
        ecdsa_verify.signature <== [signature_r, signature_s];
        ecdsa_verify.hashed <== hash;
        ecdsa_verify.dummy <== 0;
    }
    if (signatureAlgorithm == 21 || signatureAlgorithm == 24 || signatureAlgorithm == 25) {
        component ecdsa_verify = verifyECDSABits(n, k, [
            16810331318623712729,
            18122579188607900780,
            17219079075415130087,
            9032542404991529047
        ],
        [
            7767825457231955894,
            10773760575486288334,
            17523706096862592191,
            2800214691157789508
        ],
        [
            2311270323689771895,
            7943213001558335528,
            4496292894210231666,
            12248480212390422972
        ], n * k);

        ecdsa_verify.pubkey <== pubkey_xy;
        ecdsa_verify.signature <== [signature_r, signature_s];
        ecdsa_verify.hashed <== hash;
        ecdsa_verify.dummy <== 0;
    }
    if (signatureAlgorithm == 22 || signatureAlgorithm == 26) { 
        component ecdsa_verify = verifyECDSABits(n, k, [
            335737924824737830,
            9990533504564909291,
            1410020238645393679,
            14032832221039175559,
            4355552632119865248,
            8918115475071440140
        ],
        [
            4230998357940653073,
            8985869839777909140,
            3352946025465340629,
            3438355245973688998,
            10032249017711215740,
            335737924824737830
        ],
        [
            9747760000893709395,
            12453481191562877553,
            1347097566612230435,
            1526563086152259252,
            1107163671716839903,
            10140169582434348328
        ], n * k);

        ecdsa_verify.pubkey <== pubkey_xy;
        ecdsa_verify.signature <== [signature_r, signature_s];
        ecdsa_verify.hashed <== hash;
        ecdsa_verify.dummy <== 0;
    }
}