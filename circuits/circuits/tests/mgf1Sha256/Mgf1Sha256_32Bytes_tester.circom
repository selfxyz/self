pragma circom 2.1.5;

include "../../utils/Mgf1Sha256.circom";
include "../../../node_modules/circomlib/circuits/bitify.circom";


template Mgf1Sha256_32Bytes_tester(seed_len_bytes, mask_len_bytes) {

    signal input seed[seed_len_bytes * 8];
    signal input expected_mask_output[mask_len_bytes * 8];
    signal output mask[mask_len_bytes * 8];

    component mgf1_sha256 = Mgf1Sha256(seed_len_bytes, mask_len_bytes);

    for (var i=0; i < seed_len_bytes * 8; i++) {
        mgf1_sha256.seed[i] <== seed[i];
    }

    for (var i=0; i < mask_len_bytes * 8; i++) {
        mask[i] <== mgf1_sha256.out[i];
    }

    for (var i=0; i < mask_len_bytes * 8; i++) {
        mgf1_sha256.out[i] === expected_mask_output[i];
    }

}

component main = Mgf1Sha256_32Bytes_tester(32, 32);
