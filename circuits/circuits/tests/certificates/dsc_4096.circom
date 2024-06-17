pragma circom  2.1.6;

include "../../certificates/dsc.circom";

template dsc_4096_tester() {
    signal input raw_dsc_cert[4096]; 
    signal input message_padded_bytes;
    signal input modulus[34];
    signal input signature[34];
    signal input dsc_modulus[17];
    signal input start_index;

    component dsc = DSC(4096, 121, 34, 256, 121, 17);
    dsc.raw_dsc_cert <== raw_dsc_cert;
    dsc.message_padded_bytes <== message_padded_bytes;
    dsc.modulus <== modulus;
    dsc.signature <== signature;
    dsc.dsc_modulus <== dsc_modulus;
    dsc.start_index <== start_index;
}
component main = dsc_4096_tester();
