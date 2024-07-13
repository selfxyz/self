pragma circom  2.1.6;

include "../../dsc/dsc_sha256_rsa.circom";

component main { public [ merkle_root ] } = DSC_SHA256_RSA(1664,64 ,32 ,64, 32, 256, 12);