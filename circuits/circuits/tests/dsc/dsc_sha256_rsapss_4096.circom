pragma circom  2.1.6;

include "../../dsc/dsc_rsapss_65537_sha256.circom";

component main { public [ merkle_root ] } = DSC_RSAPSS_65537_SHA256(1664, 64, 32, 120, 35, 4096, 256, 12);