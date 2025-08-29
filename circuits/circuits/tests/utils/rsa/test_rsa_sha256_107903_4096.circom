pragma circom 2.1.9;

include "../../../utils/crypto/signature/rsa/verifyRsa107903Pkcs1v1_5.circom";

template VerifyRsaPkcs1v1_5Tester() {
    signal input signature[35];
    signal input modulus[35];
    signal input message[35];

    VerifyRsa107903Pkcs1v1_5(120, 35, 256)(signature, modulus, message);
}

component main = VerifyRsaPkcs1v1_5Tester();
