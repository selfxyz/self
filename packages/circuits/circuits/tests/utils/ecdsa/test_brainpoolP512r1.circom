pragma circom 2.1.9;

include "../../../utils/crypto/signature/ecdsa/ecdsaVerifier.circom";

template VerifyBrainpoolP384r1Sha384() {
    signal input signature[2 * 8];
    signal input pubKey[2 * 8];
    signal input hashParsed[512];

    EcdsaVerifier(29, 64, 8)(signature, pubKey, hashParsed);
}

component main = VerifyBrainpoolP384r1Sha384();