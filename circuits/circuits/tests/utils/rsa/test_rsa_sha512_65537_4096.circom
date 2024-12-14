pragma circom 2.1.9;

include "../../../utils/rsa/verifyRsaPkcs1v1_5.circom";

template VerifyRsaPkcs1v1_5Tester() {
    signal input signature[64];
    signal input modulus[64];
    signal input message[64];

    VerifyRsaPkcs1v1_5(15, 64, 64, 17, 512)(signature, modulus, message);
}

component main = VerifyRsaPkcs1v1_5Tester();
