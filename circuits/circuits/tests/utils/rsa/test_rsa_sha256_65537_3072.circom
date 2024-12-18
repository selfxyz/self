pragma circom 2.1.9;

include "../../../utils/circomlib/signature/rsa/verifyRsaPkcs1v1_5.circom";

template VerifyRsaPkcs1v1_5Tester() {
    signal input signature[32];
    signal input modulus[32];
    signal input message[32];

    signal input dummy;

    VerifyRsaPkcs1v1_5(14, 96, 32, 65537, 256)(signature, modulus, message, dummy);
}

component main = VerifyRsaPkcs1v1_5Tester();