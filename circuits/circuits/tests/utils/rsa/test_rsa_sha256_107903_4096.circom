pragma circom 2.1.9;

include "../../../utils/crypto/signature/rsa/verifyRsaGenericPkcs1v1_5.circom";

template VerifyRsaPkcs1v1_5Tester() {
    signal input signature[35];
    signal input modulus[35];
    signal input message[35];

    VerifyRsaGenericPkcs1v1_5(120, 35, 256, 50)(signature, modulus, message);
}

component main = VerifyRsaPkcs1v1_5Tester();
