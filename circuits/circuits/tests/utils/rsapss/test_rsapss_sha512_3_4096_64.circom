pragma circom 2.1.9;
include "../../../utils/crypto/signature/rsapss/rsapss3.circom";

template VerifyRsaPss65537Sig_tester() {
    signal input modulus[35];
    signal input signature[35];
    signal input message[512];

    VerifyRsaPss3Sig(120, 35, 64, 512, 4096)(modulus,signature,message);
}

component main = VerifyRsaPss65537Sig_tester();