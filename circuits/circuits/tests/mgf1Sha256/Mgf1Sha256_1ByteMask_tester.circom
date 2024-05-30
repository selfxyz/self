pragma circom 2.1.5;

include "../../utils/Mgf1Sha256.circom";
include "../../../node_modules/circomlib/circuits/bitify.circom";


template Mgf1Sha256_1ByteMask_tester(seed_len_bytes, mask_len_bytes) {

    signal input seed;
    signal input expected_mask_output[mask_len_bytes * 8];
    signal output mask[mask_len_bytes * 8];

    component mgf1_sha256 = Mgf1Sha256(seed_len_bytes, mask_len_bytes);
    component num2Bits = Num2Bits(seed_len_bytes * 8);
    num2Bits.in <== seed;

    for (var i=0; i < seed_len_bytes * 8; i++) {
        mgf1_sha256.seed[i] <== num2Bits.out[i];
    }

    for (var i=0; i < mask_len_bytes * 8; i++) {
        mask[i] <== mgf1_sha256.out[i];
    }

    for (var i=0; i < mask_len_bytes * 8; i++) {
        mgf1_sha256.out[i] === expected_mask_output[i];
    }

}

component main = Mgf1Sha256_1ByteMask_tester(4, 1);
