pragma circom  2.1.6;

include "../../dsc/dsc_sha1_rsa.circom";

component main { public [ merkle_root ] } = DSC_SHA1_RSA(1664,121 ,17 ,121, 34, 256, 12);