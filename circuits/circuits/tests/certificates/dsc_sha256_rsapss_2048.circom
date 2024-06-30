pragma circom  2.1.6;

include "../../dsc_sha256WithRSASSAPSS.circom";

component main { public [ merkle_root ] } = DSC(1664,64 ,32 ,64, 32, 256, 12);