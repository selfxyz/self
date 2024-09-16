pragma circom 2.1.6;

include "@zk-email/circuits/lib/rsa.circom";
include "@zk-email/circuits/utils/bytes.circom";
include "@zk-email/circuits/utils/array.circom";
include "../shaBytes/shaBytesStatic.circom";
include "./signatureAlgorithm.circom";


template PassportVerifier(signatureAlgorithm, n, k, MAX_ECONTENT_LEN, MAX_SIGNED_ATTR_LEN) {
    var HASH_LEN_BITS = getHashLength(signatureAlgorithm);
    var HASH_LEN_BYTES = HASH_LEN_BITS / 8;

    signal input dg1[93];
    signal input dg1_hash_offset;
    signal input econtent[MAX_ECONTENT_LEN];
    // compute hash of DG1
    signal dg1Sha[HASH_LEN_BITS] <== ShaBytesStatic(HASH_LEN_BITS, 93)(dg1);


    component dg1ShaBytes[HASH_LEN_BYTES];
    for (var i = 0; i < HASH_LEN_BYTES; i++) {
        dg1ShaBytes[i] = Bits2Num(8);
        for (var j = 0; j < 8; j++) {
            dg1ShaBytes[i].in[7 - j] <== dg1Sha[i * 8 + j];
        }
    }

    // assert DG1 hash matches the one in eContent input
    signal dg1Hash[HASH_LEN_BYTES] <== SelectSubArray(MAX_ECONTENT_LEN, HASH_LEN_BYTES)(econtent, dg1_hash_offset, HASH_LEN_BYTES);
    for(var i = 0; i < HASH_LEN_BYTES; i++) {
        dg1Hash[i] === dg1ShaBytes[i].out;
    }
}

