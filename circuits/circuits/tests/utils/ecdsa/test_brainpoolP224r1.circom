pragma circom 2.1.9;

include "../../../utils/crypto/signature/ecdsa/ecdsaVerifier.circom";

template VerifyBrainpoolP224r1Sha160() {
    signal input signature[2 * 7];
    signal input pubKey[2 * 7];
    signal input hashParsed[160];

    EcdsaVerifier(27, 32, 7)(signature, pubKey, hashParsed);
}

component main = VerifyBrainpoolP224r1Sha160();