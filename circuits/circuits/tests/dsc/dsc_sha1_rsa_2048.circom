pragma circom  2.1.6;

include "../../dsc/dsc_sha1_rsa.circom";

component main { public [ merkle_root ] } = DSC_SHA1_RSA(960,121 ,17 ,121, 17, 256, 12);