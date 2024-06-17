pragma circom 2.1.5;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/poseidon.circom";
include "@zk-email/circuits/helpers/rsa.circom";
include "@zk-email/circuits/helpers/extract.circom";
include "@zk-email/circuits/helpers/sha.circom";
include "../utils/splitBytesToWords.circom";

template DSC(max_cert_bytes, csca_mod_n, csca_mod_k, dsc_mod_len, dsc_mod_n , dsc_mod_k) {
    signal input raw_dsc_cert[max_cert_bytes]; 
    signal input message_padded_bytes;
    signal input modulus[csca_mod_k];
    signal input signature[csca_mod_k];
    signal input dsc_modulus[dsc_mod_k];
    signal input start_index;

    // variables verification
    assert(max_cert_bytes % 64 == 0);
    assert(csca_mod_n * csca_mod_k > max_cert_bytes);
    assert(csca_mod_n < (255 \ 2));

    // hash raw TBS certificate
    signal sha[256] <== Sha256Bytes(max_cert_bytes)(raw_dsc_cert, message_padded_bytes);

    var msg_len = (256+csca_mod_n)\csca_mod_n;
    component base_msg[msg_len];
    for (var i = 0; i < msg_len; i++) {
        base_msg[i] = Bits2Num(csca_mod_n);
    }
    for (var i = 0; i < 256; i++) {
        base_msg[i\csca_mod_n].in[i%csca_mod_n] <== sha[255 - i];
    }
    for (var i = 256; i < csca_mod_n*msg_len; i++) {
        base_msg[i\csca_mod_n].in[i%csca_mod_n] <== 0;
    }

    // verify RSA signature
    component rsa = RSAVerify65537(csca_mod_n, csca_mod_k);
    for (var i = 0; i < msg_len; i++) {
        rsa.base_message[i] <== base_msg[i].out;
    }
    for (var i = msg_len; i < csca_mod_k; i++) {
        rsa.base_message[i] <== 0;
    }
    for (var i = 0; i < csca_mod_k; i++) {
        rsa.modulus[i] <== modulus[i];
    }
    for (var i = 0; i < csca_mod_k; i++) {
        rsa.signature[i] <== signature[i];
    }

    // verify DSC modulus
    component shiftLeft = VarShiftLeft(max_cert_bytes, dsc_mod_len);
    shiftLeft.in <== raw_dsc_cert;
    shiftLeft.shift <== start_index;

    component splitBytesToWords = SplitBytesToWords(dsc_mod_len, dsc_mod_n, dsc_mod_k);
    splitBytesToWords.in <== shiftLeft.out;
    for (var i = 0; i < dsc_mod_k; i++) {
        dsc_modulus[i] === splitBytesToWords.out[i];
    }


}


