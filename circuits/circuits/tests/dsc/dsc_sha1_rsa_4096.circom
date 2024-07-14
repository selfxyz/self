pragma circom  2.1.6;

include "../../dsc_sha1WithRSAEncryption.circom";

component main { public [ merkle_root ] } = DSC_sha1WithRSAEncryption(1664,121 ,17 ,121, 34, 256, 12);