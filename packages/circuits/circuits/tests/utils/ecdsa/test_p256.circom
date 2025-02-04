pragma circom 2.1.9;

include "../../../utils/crypto/signature/ecdsa/ecdsaVerifier.circom";

template VerifyP256Sha256() {
    signal input signature[2 * 4];
    signal input pubKey[2 * 4];
    signal input hashParsed[256];

    EcdsaVerifier(8, 64, 4)(signature, pubKey, hashParsed);
}

component main = VerifyP256Sha256();