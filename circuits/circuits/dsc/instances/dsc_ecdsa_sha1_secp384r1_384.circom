pragma circom 2.1.9;

include "../dsc.circom";

component main { public [  merkle_root] } = DSC(34, 64, 6, 64, 6, 1664, 48, 12);
