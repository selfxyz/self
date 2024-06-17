pragma circom  2.1.6;

include "../../certificates/dsc.circom";

template dsc_2048_tester() {
    signal input raw_dsc_cert[2048]; 
    signal input message_padded_bytes;
    signal input modulus[17];
    signal input signature[17];
    signal input dsc_modulus[17];
    signal input start_index;

    component dsc = DSC(2048, 121, 17, 256, 121, 17);
    dsc.raw_dsc_cert <== raw_dsc_cert;
    dsc.message_padded_bytes <== message_padded_bytes;
    dsc.modulus <== modulus;
    dsc.signature <== signature;
    dsc.dsc_modulus <== dsc_modulus;
    dsc.start_index <== start_index;
}
component main = dsc_2048_tester();
