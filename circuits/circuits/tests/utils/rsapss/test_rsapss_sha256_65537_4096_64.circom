pragma circom 2.1.9;
include "../../../utils/crypto/signature/rsapss/rsapss65537.circom";

template VerifyRsaPss65537Sig_tester() {
    signal input modulus[35];
    signal input signature[35];
    signal input message[256];

    VerifyRsaPss65537Sig(120, 35, 64, 256, 4096)(modulus,signature,message);
}

component main = VerifyRsaPss65537Sig_tester();