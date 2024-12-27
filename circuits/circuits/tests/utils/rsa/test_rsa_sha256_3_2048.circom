pragma circom 2.1.9;

include "../../../utils/circomlib/signature/rsa/verifyRsa3Pkcs1v1_5.circom";

template VerifyRsaPkcs1v1_5Tester() {
    signal input signature[32];
    signal input modulus[32];
    signal input message[32];

    VerifyRsa3Pkcs1v1_5(64, 32, 3, 256)(signature, modulus, message);
}

component main = VerifyRsaPkcs1v1_5Tester();