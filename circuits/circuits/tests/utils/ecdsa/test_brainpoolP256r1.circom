pragma circom 2.1.9;

include "../../../utils/crypto/signature/ecdsa/ecdsaVerifier.circom";

template VerifyBrainpoolP256r1Sha512() {
    signal input signature[2 * 4];
    signal input pubKey[2 * 4];
    signal input hashParsed[512];

    EcdsaVerifier(25, 64, 4)(signature, pubKey, hashParsed);
}

component main = VerifyBrainpoolP256r1Sha512();