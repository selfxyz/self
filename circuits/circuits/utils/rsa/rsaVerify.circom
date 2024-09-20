pragma circom 2.1.9;

include "./rsa.circom";

component main = RsaVerifyPkcs1v15(64, 32, 17, 256);