pragma circom  2.1.6;

include "../../dsc/dsc_rsa_65537_sha1.circom";

component main { public [ merkle_root ] } = DSC_RSA_65537_SHA1(960, 64, 32, 64, 32, 256, 12);