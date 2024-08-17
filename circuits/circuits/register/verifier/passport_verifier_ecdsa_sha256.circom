pragma circom 2.1.5;

include "@zk-email/circuits/utils/bytes.circom";
include "../../utils/circom-ecdsa/ecdsa.circom";
include "../../utils/Sha256BytesStatic.circom";
include "@zk-email/circuits/lib/sha.circom";

template PASSPORT_VERIFIER_ECDSA_SHA256(n, k, max_datahashes_bytes) {
    var hashLen = 32;
    var eContentBytesLength = 72 + hashLen; // 104

    signal input mrz[93]; // formatted mrz (5 + 88) chars
    signal input dg1_hash_offset;
    signal input dataHashes[max_datahashes_bytes];

    signal input datahashes_padded_length;
    signal input eContentBytes[eContentBytesLength];

    signal input dsc_modulus[2][k]; // Public Key (split into Qx and Qy)

    signal input signature_r[k]; // ECDSA signature component r
    signal input signature_s[k]; // ECDSA signature component s

    // compute sha256 of formatted mrz
    signal mrzSha[256] <== Sha256BytesStatic(93)(mrz);

    // mrzSha_bytes: list of 32 Bits2Num
    component mrzSha_bytes[hashLen];

    // cast the 256 bits from mrzSha into a list of 32 bytes
    for (var i = 0; i < hashLen; i++) {
        mrzSha_bytes[i] = Bits2Num(8);

        for (var j = 0; j < 8; j++) {
            mrzSha_bytes[i].in[7 - j] <== mrzSha[i * 8 + j];
        }
    }

    // assert mrz_hash equals the one extracted from dataHashes input (bytes dg1_hash_offset to dg1_hash_offset + hashLen)
    signal dg1Hash[hashLen] <== SelectSubArray(max_datahashes_bytes, hashLen)(dataHashes, dg1_hash_offset, hashLen);
    for(var i = 0; i < hashLen; i++) {
        dg1Hash[i] === mrzSha_bytes[i].out;
    }

    // hash dataHashes dynamically
    signal dataHashesSha[256] <== Sha256Bytes(max_datahashes_bytes)(dataHashes, datahashes_padded_length);

    // get output of dataHashes into bytes to check against eContent
    component dataHashesSha_bytes[hashLen];
    for (var i = 0; i < hashLen; i++) {
        dataHashesSha_bytes[i] = Bits2Num(8);
        for (var j = 0; j < 8; j++) {
            dataHashesSha_bytes[i].in[7 - j] <== dataHashesSha[i * 8 + j];
        }
    }

    // assert dataHashesSha is in eContentBytes in range bytes 72 to 92
    for(var i = 0; i < hashLen; i++) {
        eContentBytes[eContentBytesLength - hashLen + i] === dataHashesSha_bytes[i].out;
    }

    // hash eContentBytes
    signal eContentSha[256] <== Sha256BytesStatic(104)(eContentBytes);

    // get output of eContentBytes sha256 into k chunks of n bits each
    var msg_len = (256 + n) \ n;

    //eContentHash: list of length 256/n +1 of components of n bits 
    component eContentHash[msg_len];
    for (var i = 0; i < msg_len; i++) {
        eContentHash[i] = Bits2Num(n);
    }

    for (var i = 0; i < 256; i++) {
        eContentHash[i \ n].in[i % n] <== eContentSha[255 - i];
    }

    for (var i = 256; i < n * msg_len; i++) {
        eContentHash[i \ n].in[i % n] <== 0;
    }
    

    // 43 * 6 = 258;
    signal msgHash[6];
    for(var i = 0; i < msg_len; i++) {
        msgHash[i] <== eContentHash[i].out;
    }

    // verify eContentHash signature
    component ecdsa_verify  = ECDSAVerifyNoPubkeyCheck(n,k);

    ecdsa_verify.r <==  signature_r;
    ecdsa_verify.s <== signature_s;
    ecdsa_verify.msghash <== msgHash;
    ecdsa_verify.pubkey <== dsc_modulus;

    signal output result <== ecdsa_verify.result;
}

