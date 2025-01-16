pragma circom 2.1.9;

include "../../../utils/crypto/signature/ecdsa/ecdsaVerifier.circom";

template VerifyBrainpoolP384r1Sha384() {
    signal input signature[2 * 6];
    signal input pubKey[2 * 6];
    signal input hashParsed[384];

    EcdsaVerifier(22, 64, 6)(signature, pubKey, hashParsed);
}

component main = VerifyBrainpoolP384r1Sha384();