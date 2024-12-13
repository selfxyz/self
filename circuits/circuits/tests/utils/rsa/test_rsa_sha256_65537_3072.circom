pragma circom 2.1.9;

include "../../../utils/rsa/verifyRsaPkcs1v1_5.circom";

template VerifyRsaPkcs1v1_5Tester() {
    signal input signature[32];
    signal input modulus[32];
    signal input message[32];

    VerifyRsaPkcs1v1_5(14, 96, 32, 17, 256)(signature, modulus, message);
}

component main = VerifyRsaPkcs1v1_5Tester();