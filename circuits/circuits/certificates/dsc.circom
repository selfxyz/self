pragma circom 2.1.5;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/poseidon.circom";
include "@zk-email/circuits/helpers/rsa.circom";
include "@zk-email/circuits/helpers/extract.circom";
include "@zk-email/circuits/helpers/sha.circom";
include "../utils/splitBytesToWords.circom";

template DSC(max_cert_bytes, n_dsc, k_dsc, n_csca, k_csca, dsc_mod_len ) {
    signal input raw_dsc_cert[max_cert_bytes]; 
    signal input raw_dsc_cert_padded_bytes;
    signal input csca_modulus[k_csca];
    signal input dsc_signature[k_csca];
    signal input dsc_modulus[k_dsc];
    signal input start_index;
    signal input secret;

    signal output blinded_csca_commitment;

    // variables verification
    assert(max_cert_bytes % 64 == 0);
    assert(n_csca * k_csca > max_cert_bytes);
    assert(n_csca < (255 \ 2));

    // hash raw TBS certificate
    signal sha[256] <== Sha256Bytes(max_cert_bytes)(raw_dsc_cert, raw_dsc_cert_padded_bytes);

    var msg_len = (256+n_csca)\n_csca;
    component base_msg[msg_len];
    for (var i = 0; i < msg_len; i++) {
        base_msg[i] = Bits2Num(n_csca);
    }
    for (var i = 0; i < 256; i++) {
        base_msg[i\n_csca].in[i%n_csca] <== sha[255 - i];
    }
    for (var i = 256; i < n_csca*msg_len; i++) {
        base_msg[i\n_csca].in[i%n_csca] <== 0;
    }

    // verify RSA dsc_signature
    component rsa = RSAVerify65537(n_csca, k_csca);
    for (var i = 0; i < msg_len; i++) {
        rsa.base_message[i] <== base_msg[i].out;
    }
    for (var i = msg_len; i < k_csca; i++) {
        rsa.base_message[i] <== 0;
    }
    for (var i = 0; i < k_csca; i++) {
        rsa.modulus[i] <== csca_modulus[i];
    }
    for (var i = 0; i < k_csca; i++) {
        rsa.signature[i] <== dsc_signature[i];
    }

    // verify DSC csca_modulus
    component shiftLeft = VarShiftLeft(max_cert_bytes, dsc_mod_len);
    shiftLeft.in <== raw_dsc_cert;
    shiftLeft.shift <== start_index;
    component spbt_1 = SplitBytesToWords(dsc_mod_len, n_dsc, k_dsc);
    spbt_1.in <== shiftLeft.out;
    for (var i = 0; i < k_dsc; i++) {
        dsc_modulus[i] === spbt_1.out[i];
    }
    // generate blinded commitment
    component spbt_2 = SplitBytesToWords(dsc_mod_len, 192, 15);
    spbt_2.in <== shiftLeft.out;
    component poseidon = Poseidon(16);
    poseidon.inputs[0] <== secret;
    for (var i = 0; i < 15; i++) {
        poseidon.inputs[i+1] <== spbt_2.out[i];
    }
    blinded_csca_commitment <== poseidon.out;
}

