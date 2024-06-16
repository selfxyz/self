pragma circom 2.1.5;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/poseidon.circom";
include "@zk-email/circuits/helpers/rsa.circom";
include "@zk-email/circuits/helpers/extract.circom";
include "@zk-email/circuits/helpers/sha.circom";

template DSC(max_cert_bytes, n, k,l) {
    signal input raw_dsc_cert[max_cert_bytes]; 
    signal input message_padded_bytes;
    signal input modulus[k];
    signal input signature[k];
    signal input dsc_modulus[l];
    signal input start_index;

    // variables verification
    assert(max_cert_bytes % 64 == 0);
    assert(n * k > 2048);
    assert(n < (255 \ 2));

    // hash raw TBS certificate
    signal sha[256] <== Sha256Bytes(max_cert_bytes)(raw_dsc_cert, message_padded_bytes);

    var msg_len = (256+n)\n;
    component base_msg[msg_len];
    for (var i = 0; i < msg_len; i++) {
        base_msg[i] = Bits2Num(n);
    }
    for (var i = 0; i < 256; i++) {
        base_msg[i\n].in[i%n] <== sha[255 - i];
    }
    for (var i = 256; i < n*msg_len; i++) {
        base_msg[i\n].in[i%n] <== 0;
    }

    // verify RSA signature
    component rsa = RSAVerify65537(n, k);
    for (var i = 0; i < msg_len; i++) {
        rsa.base_message[i] <== base_msg[i].out;
    }
    for (var i = msg_len; i < k; i++) {
        rsa.base_message[i] <== 0;
    }
    for (var i = 0; i < k; i++) {
        rsa.modulus[i] <== modulus[i];
    }
    for (var i = 0; i < k; i++) {
        rsa.signature[i] <== signature[i];
    }

    // verify DSC modulus
    component shiftLeft = VarShiftLeft(2048, l);
    shiftLeft.in <== raw_dsc_cert;
    shiftLeft.shift <== start_index;
    shiftLeft.out === dsc_modulus;

}

component main = DSC(2048, 121, 17, 256);